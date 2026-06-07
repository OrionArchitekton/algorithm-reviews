/** The verdict for a single claim. */
export type Verdict = "supported" | "refuted" | "unverifiable" | "mixed";

export interface Citation {
  url: string;
  title: string;
  /** The specific sentence/figure the verdict rests on. */
  quote: string;
  publishedAt: string | null;
  /** Volatile — excluded from the signed canonical payload. */
  fetchedAt: string;
}

export interface RejectedSource {
  url: string;
  /** Why the governance plane refused to admit this source. */
  reason: string;
}

export interface ClaimReview {
  claimId: string;
  claim: string;
  verdict: Verdict;
  confidence: number; // 0..1
  rationale: string;
  /** The strongest counter-evidence / caveat (governance, not cheerleading). */
  dissent: string;
  citations: Citation[];
  rejected: RejectedSource[];
}

/** Everything in a receipt except the signature. */
export interface ReceiptCore {
  version: string;
  id: string;
  input: string;
  /** Volatile — excluded from the signed canonical payload. */
  createdAt: string;
  overall: { verdict: Verdict; confidence: number; summary: string };
  claims: ClaimReview[];
  provider: { web: string; model: string };
}

export interface Signature {
  alg: "ECDSA_P-256_SHA-256";
  /** RFC 7638 JWK thumbprint of the public key. */
  keyId: string;
  /** Hex SHA-256 of the canonical payload (human-facing integrity digest). */
  canonicalSha256: string;
  /** base64url ECDSA signature over the canonical payload bytes. */
  value: string;
}

export interface SignedReceipt extends ReceiptCore {
  signature: Signature;
}
