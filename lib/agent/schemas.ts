import { z } from "zod";

/** Decomposition: input → atomic, independently-checkable claims. */
export const claimsSchema = z.object({
  claims: z
    .array(
      z.object({
        text: z.string().describe("one atomic, falsifiable factual claim"),
      }),
    )
    .max(8),
});

/** Per-claim search queries. */
export const queriesSchema = z.object({
  queries: z.array(z.string()).max(4),
});

/** LLM source classification (the judgment inputs to the governance policy). */
export const classifySchema = z.object({
  sources: z.array(
    z.object({
      url: z.string(),
      authority: z
        .number()
        .min(0)
        .max(1)
        .describe("0=anonymous blog/SEO spam, 1=primary source / reputable org"),
      relevance: z
        .number()
        .min(0)
        .max(1)
        .describe("does this source actually address THIS claim"),
      note: z.string().describe("one short phrase justifying the scores"),
    }),
  ),
});

/** Final adjudication for a claim (verify + dissent in one call). */
export const adjudicationSchema = z.object({
  verdict: z.enum(["supported", "refuted", "unverifiable", "mixed"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().describe("why, grounded ONLY in the admitted evidence"),
  dissent: z
    .string()
    .describe("the strongest counter-evidence or caveat; '' if none"),
  citations: z
    .array(
      z.object({
        url: z.string(),
        quote: z
          .string()
          .describe("the exact sentence/figure the verdict rests on"),
      }),
    )
    .max(6),
});

export type ClaimsOut = z.infer<typeof claimsSchema>;
export type QueriesOut = z.infer<typeof queriesSchema>;
export type ClassifyOut = z.infer<typeof classifySchema>;
export type AdjudicationOut = z.infer<typeof adjudicationSchema>;
