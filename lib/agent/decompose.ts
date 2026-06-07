import { CAPS } from "./caps";
import { genObject } from "./llm";
import { claimsSchema } from "./schemas";

/** Break a submission into atomic, checkable factual claims. */
export async function decomposeClaims(
  input: string,
  forceMock = false,
): Promise<string[]> {
  const out = await genObject({
    tier: "light",
    schema: claimsSchema,
    forceMock,
    system:
      "You decompose a user submission into atomic, independently checkable factual claims. Drop opinions, marketing adjectives, and fluff. Keep the most consequential, falsifiable claims — the ones a skeptic would demand evidence for.",
    prompt: `Submission:\n"""${input.slice(0, 4000)}"""\n\nReturn the atomic factual claims worth verifying (at most ${CAPS.maxClaims}).`,
    mock: () => ({ claims: mockClaims(input).map((text) => ({ text })) }),
  });
  const texts = out.claims.map((c) => c.text.trim()).filter(Boolean);
  return (texts.length ? texts : [input.trim()]).slice(0, CAPS.maxClaims);
}

function mockClaims(input: string): string[] {
  const parts = input
    .split(/\n|(?<=[.!?])\s+|•|•|;|\d+\.\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
  return (parts.length ? parts : [input.trim()]).slice(0, CAPS.maxClaims);
}
