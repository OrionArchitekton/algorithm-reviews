import { CAPS } from "./caps";
import { genObject } from "./llm";
import { queriesSchema } from "./schemas";

/**
 * Turn a claim into concise SEARCH QUERIES (keywords/entities), not the raw
 * sentence. Search indexes (Wikipedia full-text, Nimble, etc.) return tangential
 * junk for sentence queries; canonical topic keywords find the right source.
 * This lifts admit-rate without touching the (correctly strict) policy.
 */
export async function generateQueries(
  claim: string,
  forceMock = false,
): Promise<string[]> {
  const out = await genObject({
    tier: "light",
    schema: queriesSchema,
    forceMock,
    system:
      "Generate concise web SEARCH QUERIES to find evidence for or against a claim. Use keywords and canonical entity/topic names, NOT full sentences. Each query should be 2-6 words. Prefer the term an encyclopedia or news index would title the topic.",
    prompt: `Claim: "${claim}"\n\nReturn up to ${CAPS.maxQueriesPerClaim} short keyword search queries.`,
    mock: () => ({ queries: mockQueries(claim) }),
  });
  const queries = out.queries.map((q) => q.trim()).filter(Boolean);
  return (queries.length ? queries : [claim]).slice(0, CAPS.maxQueriesPerClaim);
}

const STOP = new Set([
  "the", "a", "an", "of", "on", "in", "to", "and", "or", "is", "are", "was",
  "were", "be", "been", "that", "this", "with", "for", "by", "from", "as",
  "roughly", "about", "within", "few", "years", "most", "very", "which",
]);

function mockQueries(claim: string): string[] {
  const keywords = claim
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w))
    .slice(0, 5)
    .join(" ");
  return keywords ? [keywords] : [claim];
}
