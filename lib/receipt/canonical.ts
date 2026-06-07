import type { ReceiptCore } from "./types";

/**
 * Deterministic canonical projection of a receipt, used for hashing + signing.
 *
 * Adversarial review W3: the signature must change ONLY when the evidence or
 * verdict changes — never because of timestamps, source ordering, or float
 * noise. So we: drop volatile fields (createdAt, fetchedAt), sort claims and
 * citations by url/id, round confidences, and stable-stringify with sorted keys.
 *
 * Result: re-verifying the same input against an unchanged web yields an
 * identical signature; a moved verdict yields a different one. That is the
 * honest, demonstrable liveness proof.
 */
export function canonicalPayload(core: ReceiptCore): unknown {
  return {
    v: core.version,
    input: core.input.trim(),
    overall: {
      verdict: core.overall.verdict,
      confidence: round2(core.overall.confidence),
      summary: core.overall.summary.trim(),
    },
    claims: [...core.claims]
      .sort((a, b) => a.claimId.localeCompare(b.claimId))
      .map((c) => ({
        claim: c.claim.trim(),
        verdict: c.verdict,
        confidence: round2(c.confidence),
        citations: [...c.citations]
          .map((ci) => ({ url: ci.url, quote: ci.quote.trim() }))
          .sort((a, b) => a.url.localeCompare(b.url)),
        rejected: [...c.rejected]
          .map((r) => ({ url: r.url, reason: r.reason.trim() }))
          .sort((a, b) => a.url.localeCompare(b.url)),
      })),
  };
}

export function canonicalString(core: ReceiptCore): string {
  return stableStringify(canonicalPayload(core));
}

/** JSON.stringify with recursively sorted object keys. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
