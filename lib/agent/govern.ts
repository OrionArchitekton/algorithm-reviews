import { CAPS } from "./caps";

/**
 * THE GOVERNANCE PLANE — source admissibility policy.
 *
 * This is the project's load-bearing decision. The execution plane (search +
 * extract) gathers candidate evidence; this function decides what is ADMISSIBLE,
 * fail-closed. Every admit/reject in the glass box comes from here, and the
 * reason strings are what a judge reads. It is deterministic and unit-tested so
 * the verdict trail is reproducible — the model proposes signals (authority,
 * relevance), but POLICY, not the model, decides admission.
 *
 * ── Tunable policy knobs (the one place worth hand-tuning) ───────────────────
 * Raising thresholds = stricter (more rejects, higher precision, more
 * "unverifiable" verdicts). Lowering = more permissive. Order matters: the first
 * failing gate wins, so the reason shown is the *primary* defect.
 */
export const POLICY = {
  minRelevance: 0.45, // below this, the source isn't about the claim
  minAuthority: 0.35, // below this, treat as unsourced / low-trust
  staleDays: CAPS.freshnessStaleDays, // older than this is flagged stale
  // A very high-authority primary source is admitted even if a touch stale,
  // because primary records (filings, official docs) don't rot like news.
  authorityStaleOverride: 0.85,
} as const;

export interface SourceSignals {
  url: string;
  title: string;
  /** 0..1 model estimate of source authority / primary-source-ness. */
  authority: number;
  /** 0..1 model estimate of relevance to the specific claim. */
  relevance: number;
  /** Age in days from publishedAt, or null if unknown. */
  freshnessDays: number | null;
  /** Did we actually get usable content (snippet/extract)? */
  hasContent: boolean;
}

export interface AdmissionDecision {
  decision: "admit" | "reject";
  reason: string;
}

/**
 * Decide admissibility for one source against one claim. Fail-closed: anything
 * we cannot positively justify is rejected, and a claim that ends with zero
 * admitted sources resolves to "unverifiable" downstream (never "false").
 */
export function admit(signals: SourceSignals): AdmissionDecision {
  if (!signals.hasContent) {
    return { decision: "reject", reason: "no extractable content" };
  }
  if (signals.relevance < POLICY.minRelevance) {
    return {
      decision: "reject",
      reason: `off-topic (relevance ${pct(signals.relevance)} < ${pct(POLICY.minRelevance)})`,
    };
  }
  if (signals.authority < POLICY.minAuthority) {
    return {
      decision: "reject",
      reason: `low-authority / unsourced (authority ${pct(signals.authority)})`,
    };
  }
  if (
    signals.freshnessDays !== null &&
    signals.freshnessDays > POLICY.staleDays &&
    signals.authority < POLICY.authorityStaleOverride
  ) {
    return {
      decision: "reject",
      reason: `stale (${Math.round(signals.freshnessDays)}d old > ${POLICY.staleDays}d)`,
    };
  }
  // Admitted — explain WHY it cleared the bar.
  const fresh =
    signals.freshnessDays === null
      ? "undated"
      : signals.freshnessDays <= POLICY.staleDays
        ? "current"
        : "older but primary";
  return {
    decision: "admit",
    reason: `authority ${pct(signals.authority)}, relevant, ${fresh}`,
  };
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Days between an ISO date and now; null if unparseable. */
export function ageDays(publishedAt: string | null): number | null {
  if (!publishedAt) return null;
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 86_400_000;
}
