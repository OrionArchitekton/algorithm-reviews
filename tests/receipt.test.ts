import { describe, expect, it } from "vitest";
import { canonicalString } from "@/lib/receipt/canonical";
import { signReceipt, verifyReceipt } from "@/lib/receipt/sign";
import type { ReceiptCore } from "@/lib/receipt/types";

function core(overrides: Partial<ReceiptCore> = {}): ReceiptCore {
  return {
    version: "1",
    id: "test-id",
    input: "Claim under review",
    createdAt: "2026-06-06T00:00:00.000Z",
    overall: { verdict: "supported", confidence: 0.8, summary: "1 supported" },
    provider: { web: "mock", model: "mock" },
    claims: [
      {
        claimId: "c1",
        claim: "The sky is blue",
        verdict: "supported",
        confidence: 0.8,
        rationale: "because of Rayleigh scattering",
        dissent: "",
        citations: [
          { url: "https://b.com", title: "B", quote: "blue", publishedAt: null, fetchedAt: "2026-06-06T00:00:00Z" },
          { url: "https://a.com", title: "A", quote: "sky", publishedAt: null, fetchedAt: "2026-06-06T00:00:00Z" },
        ],
        rejected: [{ url: "https://spam.com", reason: "low-authority" }],
      },
    ],
    ...overrides,
  };
}

describe("canonicalization (deterministic, volatile-free)", () => {
  it("is identical regardless of citation ordering", () => {
    const a = core();
    const b = core();
    // reverse the citations in b
    b.claims[0].citations.reverse();
    expect(canonicalString(a)).toBe(canonicalString(b));
  });

  it("ignores volatile fields (createdAt, fetchedAt, id)", () => {
    const a = core();
    const b = core({ createdAt: "2099-01-01T00:00:00Z", id: "different" });
    b.claims[0].citations[0].fetchedAt = "1999-01-01T00:00:00Z";
    expect(canonicalString(a)).toBe(canonicalString(b));
  });

  it("CHANGES when the verdict changes", () => {
    const a = core();
    const b = core();
    b.claims[0].verdict = "refuted";
    expect(canonicalString(a)).not.toBe(canonicalString(b));
  });

  it("CHANGES when a citation quote changes", () => {
    const a = core();
    const b = core();
    b.claims[0].citations[0].quote = "tampered";
    expect(canonicalString(a)).not.toBe(canonicalString(b));
  });
});

describe("ECDSA signing + verification", () => {
  it("signs and verifies a genuine receipt", async () => {
    const signed = await signReceipt(core());
    expect(signed.signature.alg).toBe("ECDSA_P-256_SHA-256");
    expect(signed.signature.value.length).toBeGreaterThan(20);
    const result = await verifyReceipt(signed);
    expect(result.valid).toBe(true);
    expect(result.hashMatches).toBe(true);
    expect(result.keyIdMatches).toBe(true);
  });

  it("FAILS verification when the verdict is tampered", async () => {
    const signed = await signReceipt(core());
    signed.overall.verdict = "refuted";
    signed.claims[0].verdict = "refuted";
    const result = await verifyReceipt(signed);
    expect(result.valid).toBe(false);
  });

  it("FAILS verification when a citation quote is fabricated", async () => {
    const signed = await signReceipt(core());
    signed.claims[0].citations[0].quote = "FABRICATED";
    const result = await verifyReceipt(signed);
    expect(result.valid).toBe(false);
  });

  it("produces the SAME signature when only volatile fields change (determinism)", async () => {
    const a = await signReceipt(core());
    const b = await signReceipt(core({ createdAt: "2099-01-01T00:00:00Z", id: "other" }));
    // Same key + same canonical payload ⇒ ECDSA is non-deterministic per-call,
    // but the canonical hash (what we sign over) must be identical.
    expect(a.signature.canonicalSha256).toBe(b.signature.canonicalSha256);
  });
});
