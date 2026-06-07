import { genObject } from "./llm";
import { type AdjudicationOut, adjudicationSchema } from "./schemas";

export interface Evidence {
  url: string;
  title: string;
  markdown: string;
  publishedAt: string | null;
}

/**
 * Verify + dissent in ONE heavy-model call (adversarial review I2: keep the
 * dissent output, cut the second round-trip). Grounded strictly in admitted
 * evidence; fail-closed to "unverifiable" when evidence is thin.
 */
export async function adjudicate(
  claim: string,
  evidence: Evidence[],
  forceMock = false,
): Promise<AdjudicationOut> {
  return genObject({
    tier: "heavy",
    schema: adjudicationSchema,
    forceMock,
    system:
      "You are a rigorous fact adjudicator. Decide the verdict for the claim using ONLY the admitted evidence below — do NOT use prior knowledge as proof. If the evidence is insufficient, return 'unverifiable'; if it genuinely conflicts, return 'mixed'. Never guess. Always state the strongest counter-evidence in `dissent`. Every citation quote MUST be copied verbatim from the evidence and its url MUST be one of the provided sources.",
    prompt: `Claim: "${claim}"\n\nADMITTED EVIDENCE:\n${evidence
      .map(
        (e, i) =>
          `[${i + 1}] ${e.url}${e.publishedAt ? ` (published ${e.publishedAt.slice(0, 10)})` : ""}\n${e.markdown.slice(0, 2500)}`,
      )
      .join("\n\n")}\n\nAdjudicate the claim.`,
    mock: () => mockAdjudicate(claim, evidence),
  });
}

function mockAdjudicate(claim: string, evidence: Evidence[]): AdjudicationOut {
  if (evidence.length === 0) {
    return {
      verdict: "unverifiable",
      confidence: 0.2,
      rationale:
        "No admissible sources cleared the governance policy for this claim.",
      dissent: "",
      citations: [],
    };
  }
  return {
    verdict: "supported",
    confidence: 0.78,
    rationale: `${evidence.length} admitted source(s) corroborate the claim "${claim.slice(0, 80)}".`,
    dissent:
      "Mock adjudication — corroboration is shallow; a human should confirm the primary figure.",
    citations: evidence.slice(0, 2).map((e) => ({
      url: e.url,
      quote: firstSentence(e.markdown),
    })),
  };
}

function firstSentence(md: string): string {
  const clean = md.replace(/[#>*`_]/g, " ").replace(/\s+/g, " ").trim();
  const m = clean.match(/^.{20,200}?[.!?]/);
  return (m ? m[0] : clean.slice(0, 160)).trim();
}
