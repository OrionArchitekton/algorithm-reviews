/**
 * The streaming "glass box" event protocol.
 *
 * The /api/review route emits these as newline-delimited JSON (NDJSON). The
 * client renders them as a live governance trace. This is deliberately NOT the
 * AI SDK chat protocol: this is an audit stream, not a conversation, and a typed
 * event union models the admit/reject/verdict/receipt lifecycle far better.
 */

import type { SignedReceipt, Verdict } from "./receipt/types";

export type ReviewEvent =
  | { type: "status"; phase: Phase; message: string }
  | { type: "claim"; claimId: string; text: string }
  | { type: "query"; claimId: string; query: string }
  | {
      type: "source_found";
      claimId: string;
      url: string;
      title: string;
      snippet: string;
      publishedAt: string | null;
    }
  | {
      type: "decision";
      claimId: string;
      url: string;
      title: string;
      decision: "admit" | "reject";
      reason: string;
      // governance signals that drove the decision (shown in the glass box)
      authority: number; // 0-1 source authority estimate
      freshnessDays: number | null; // age of source in days, null if unknown
    }
  | { type: "extracted"; claimId: string; url: string; chars: number }
  | {
      type: "verdict";
      claimId: string;
      verdict: Verdict;
      confidence: number;
      rationale: string;
      dissent: string;
    }
  | { type: "receipt"; receipt: SignedReceipt }
  | { type: "error"; message: string }
  | { type: "done" };

export type Phase =
  | "decompose"
  | "research"
  | "govern"
  | "extract"
  | "adjudicate"
  | "sign"
  | "done";

export function encodeEvent(e: ReviewEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(e) + "\n");
}

/** Parse a partial NDJSON buffer, returning complete events and the remainder. */
export function parseNdjson(buffer: string): {
  events: ReviewEvent[];
  rest: string;
} {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events: ReviewEvent[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as ReviewEvent);
    } catch {
      // ignore malformed line (should not happen with our encoder)
    }
  }
  return { events, rest };
}
