import type { SourceCandidate } from "../web";
import { genObject } from "./llm";
import { classifySchema } from "./schemas";

export interface SourceJudgment {
  authority: number;
  relevance: number;
  note: string;
}

/** One light-model call rates every candidate for a claim (authority + relevance). */
export async function classifySources(
  claim: string,
  candidates: SourceCandidate[],
  forceMock = false,
): Promise<Map<string, SourceJudgment>> {
  if (candidates.length === 0) return new Map();
  const out = await genObject({
    tier: "light",
    schema: classifySchema,
    forceMock,
    system:
      "You rate web sources as EVIDENCE for a specific claim. Be skeptical: SEO spam, content farms, and undated anonymous posts get low authority; primary sources, reputable outlets, and official docs get high authority. Relevance = does THIS source actually address THIS claim.",
    prompt: `Claim: "${claim}"\n\nSources:\n${candidates
      .map(
        (c, i) =>
          `${i + 1}. ${c.url}\n   title: ${c.title}\n   snippet: ${c.snippet.slice(0, 300)}`,
      )
      .join("\n")}\n\nRate each source.`,
    mock: () => ({ sources: candidates.map((c) => mockJudge(claim, c)) }),
  });
  const map = new Map<string, SourceJudgment>();
  for (const s of out.sources) {
    map.set(s.url, {
      authority: clamp01(s.authority),
      relevance: clamp01(s.relevance),
      note: s.note,
    });
  }
  return map;
}

const HIGH_AUTHORITY =
  /(reuters|apnews|bbc|nature|science|nytimes|wsj|wikipedia|\.gov|\.edu|arxiv|sec\.gov|who\.int)/i;
const LOW_AUTHORITY = /(wordpress|blogspot|medium\.com|substack|reddit|quora)/i;

function mockJudge(claim: string, c: SourceCandidate) {
  const host = safeHost(c.url);
  let authority = 0.5;
  if (HIGH_AUTHORITY.test(c.url)) authority = 0.9;
  else if (LOW_AUTHORITY.test(c.url)) authority = 0.3;
  const hay = `${c.title} ${c.snippet}`.toLowerCase();
  const words = claim
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const hits = words.filter((w) => hay.includes(w)).length;
  const relevance = words.length
    ? clamp01(0.4 + (hits / words.length) * 0.6)
    : 0.6;
  return { url: c.url, authority, relevance, note: `host ${host}` };
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
