import type { ReviewEvent } from "../events";
import { signReceipt } from "../receipt/sign";
import type {
  Citation,
  ClaimReview,
  ReceiptCore,
  RejectedSource,
  SignedReceipt,
  Verdict,
} from "../receipt/types";
import { type SourceCandidate, type WebProvider, getWebProvider } from "../web";
import { type Evidence, adjudicate } from "./adjudicate";
import { CAPS, pool } from "./caps";
import { classifySources } from "./classify";
import { decomposeClaims } from "./decompose";
import { admit, ageDays } from "./govern";
import { modelLabel } from "./model";
import { generateQueries } from "./queries";

type Emit = (e: ReviewEvent) => void;

export interface RunOptions {
  /** Override the web provider (the /demo route forces a no-network MockProvider). */
  provider?: WebProvider;
  /** Force the deterministic mock model (offline, guaranteed). */
  mockModel?: boolean;
}

/**
 * The governed review loop. Execution plane (search/extract) gathers evidence;
 * governance plane (govern + adjudicate) decides admissibility and verdicts;
 * the result is a signed receipt. Emits events for the live glass box.
 */
export async function runReview(
  input: string,
  emit: Emit,
  opts: RunOptions = {},
): Promise<SignedReceipt> {
  const provider = opts.provider ?? getWebProvider();
  const mock = opts.mockModel ?? false;

  // If the input is a bare URL, fetch it and review its content.
  let text = input;
  if (isUrl(input)) {
    emit({ type: "status", phase: "research", message: "Fetching submitted URL" });
    try {
      const doc = await provider.extract(input.trim());
      if (doc.markdown.trim()) text = doc.markdown;
    } catch {
      /* fall through and review the URL string itself */
    }
  }

  emit({ type: "status", phase: "decompose", message: "Decomposing into atomic claims" });
  const claimTexts = await decomposeClaims(text, mock);
  const claims = claimTexts.map((t, i) => ({ id: `c${i + 1}`, text: t }));
  for (const c of claims) emit({ type: "claim", claimId: c.id, text: c.text });

  let extractsUsed = 0;
  const reviews: ClaimReview[] = [];

  for (const claim of claims) {
    emit({ type: "status", phase: "research", message: `Researching: ${truncate(claim.text, 60)}` });

    const queries = await generateQueries(claim.text, mock);
    for (const q of queries) emit({ type: "query", claimId: claim.id, query: q });

    // Search (bounded concurrency), dedupe, cap candidates.
    const lists = await pool(
      queries.map(
        (q) => () =>
          provider
            .search(q, { maxResults: CAPS.maxCandidatesPerClaim })
            .catch(() => [] as SourceCandidate[]),
      ),
      CAPS.webConcurrency,
    );
    const candidates = dedupeByUrl(lists.flat()).slice(
      0,
      CAPS.maxCandidatesPerClaim,
    );
    for (const c of candidates) {
      emit({
        type: "source_found",
        claimId: claim.id,
        url: c.url,
        title: c.title,
        snippet: c.snippet,
        publishedAt: c.publishedAt,
      });
    }

    // Classify (one light call), then GOVERN (deterministic admit/reject).
    emit({ type: "status", phase: "govern", message: "Adjudicating source admissibility" });
    const judgments = await classifySources(claim.text, candidates, mock);
    const admitted: SourceCandidate[] = [];
    const rejected: RejectedSource[] = [];
    for (const cand of candidates) {
      const j = judgments.get(cand.url) ?? {
        authority: 0.3,
        relevance: 0.3,
        note: "unclassified",
      };
      const freshnessDays = ageDays(cand.publishedAt);
      const decision = admit({
        url: cand.url,
        title: cand.title,
        authority: j.authority,
        relevance: j.relevance,
        freshnessDays,
        hasContent: Boolean(cand.snippet) || true,
      });
      emit({
        type: "decision",
        claimId: claim.id,
        url: cand.url,
        title: cand.title,
        decision: decision.decision,
        reason: decision.reason,
        authority: j.authority,
        freshnessDays,
      });
      if (decision.decision === "admit") admitted.push(cand);
      else rejected.push({ url: cand.url, reason: decision.reason });
    }

    // Extract admitted sources, within the global extract budget.
    emit({ type: "status", phase: "extract", message: "Extracting admitted sources" });
    const budget = Math.max(0, CAPS.maxExtractsTotal - extractsUsed);
    const toExtract = admitted.slice(0, budget);
    const extracted = await pool(
      toExtract.map(
        (cand) => () =>
          provider
            .extract(cand.url)
            .then((doc) => ({ cand, doc }))
            .catch(() => null),
      ),
      CAPS.webConcurrency,
    );
    const docs = extracted.filter(
      (d): d is { cand: SourceCandidate; doc: Awaited<ReturnType<WebProvider["extract"]>> } =>
        d !== null && Boolean(d.doc.markdown.trim()),
    );
    extractsUsed += docs.length;
    for (const d of docs) {
      emit({
        type: "extracted",
        claimId: claim.id,
        url: d.cand.url,
        chars: d.doc.markdown.length,
      });
    }

    // Adjudicate: verdict grounded only in admitted evidence (fail-closed).
    emit({ type: "status", phase: "adjudicate", message: "Forming verdict from admitted evidence" });
    const evidence: Evidence[] = docs.map((d) => ({
      url: d.cand.url,
      title: d.cand.title,
      markdown: d.doc.markdown,
      publishedAt: d.cand.publishedAt,
    }));
    const adj =
      evidence.length === 0
        ? {
            verdict: "unverifiable" as Verdict,
            confidence: 0.2,
            rationale:
              "No admissible sources cleared the governance policy for this claim. Fail-closed: absence of evidence is not evidence of falsehood.",
            dissent: "",
            citations: [] as { url: string; quote: string }[],
          }
        : await adjudicate(claim.text, evidence, mock);

    emit({
      type: "verdict",
      claimId: claim.id,
      verdict: adj.verdict,
      confidence: adj.confidence,
      rationale: adj.rationale,
      dissent: adj.dissent,
    });

    // Build citations, restricted to ADMITTED sources (never cite a rejected one).
    const admittedByUrl = new Map(docs.map((d) => [d.cand.url, d]));
    const citations: Citation[] = adj.citations
      .filter((ci) => admittedByUrl.has(ci.url))
      .map((ci) => {
        const d = admittedByUrl.get(ci.url)!;
        return {
          url: ci.url,
          title: d.cand.title,
          quote: ci.quote,
          publishedAt: d.cand.publishedAt,
          fetchedAt: d.doc.fetchedAt,
        };
      });

    reviews.push({
      claimId: claim.id,
      claim: claim.text,
      verdict: adj.verdict,
      confidence: adj.confidence,
      rationale: adj.rationale,
      dissent: adj.dissent,
      citations,
      rejected,
    });
  }

  const overall = computeOverall(reviews);
  const core: ReceiptCore = {
    version: "1",
    id: crypto.randomUUID(),
    input,
    createdAt: new Date().toISOString(),
    overall,
    claims: reviews,
    provider: { web: provider.name, model: modelLabel() },
  };

  emit({ type: "status", phase: "sign", message: "Signing review receipt" });
  const signed = await signReceipt(core);
  emit({ type: "receipt", receipt: signed });
  emit({ type: "done" });
  return signed;
}

function computeOverall(reviews: ClaimReview[]): ReceiptCore["overall"] {
  const counts = { supported: 0, refuted: 0, unverifiable: 0, mixed: 0 };
  for (const r of reviews) counts[r.verdict]++;
  const n = reviews.length || 1;
  let verdict: Verdict;
  if (counts.refuted && counts.supported) verdict = "mixed";
  else if (counts.refuted) verdict = "refuted";
  else if (counts.supported && !counts.unverifiable && !counts.mixed)
    verdict = "supported";
  else if (counts.supported || counts.mixed) verdict = "mixed";
  else verdict = "unverifiable";
  const confidence =
    reviews.reduce((s, r) => s + r.confidence, 0) / n;
  const summary = `${counts.supported} supported, ${counts.refuted} refuted, ${counts.unverifiable} unverifiable${counts.mixed ? `, ${counts.mixed} mixed` : ""} across ${reviews.length} claim${reviews.length === 1 ? "" : "s"}.`;
  return { verdict, confidence, summary };
}

function dedupeByUrl(list: SourceCandidate[]): SourceCandidate[] {
  const seen = new Set<string>();
  const out: SourceCandidate[] = [];
  for (const c of list) {
    const key = c.url.replace(/[#?].*$/, "").replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function isUrl(s: string): boolean {
  const t = s.trim();
  return /^https?:\/\/\S+$/i.test(t) && !/\s/.test(t);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
