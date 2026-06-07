import type { ReviewEvent } from "../events";
import type { SignedReceipt, Verdict } from "../receipt/types";

export interface SourceState {
  url: string;
  title: string;
  snippet: string;
  publishedAt: string | null;
  decision?: "admit" | "reject";
  reason?: string;
  authority?: number;
  freshnessDays?: number | null;
  extractedChars?: number;
}

export interface ClaimState {
  id: string;
  text: string;
  queries: string[];
  sources: SourceState[];
  verdict?: Verdict;
  confidence?: number;
  rationale?: string;
  dissent?: string;
}

export interface ReviewState {
  running: boolean;
  phase?: string;
  status?: string;
  claims: ClaimState[];
  receipt?: SignedReceipt;
  error?: string;
}

export const initialState: ReviewState = { running: false, claims: [] };

/** Pure reducer applying a stream event to the UI state (unit-tested). */
export function reduce(state: ReviewState, event: ReviewEvent): ReviewState {
  switch (event.type) {
    case "status":
      return { ...state, phase: event.phase, status: event.message };
    case "claim":
      if (state.claims.some((c) => c.id === event.claimId)) return state;
      return {
        ...state,
        claims: [
          ...state.claims,
          { id: event.claimId, text: event.text, queries: [], sources: [] },
        ],
      };
    case "query":
      return mapClaim(state, event.claimId, (c) =>
        c.queries.includes(event.query)
          ? c
          : { ...c, queries: [...c.queries, event.query] },
      );
    case "source_found":
      return mapClaim(state, event.claimId, (c) =>
        c.sources.some((s) => s.url === event.url)
          ? c
          : {
              ...c,
              sources: [
                ...c.sources,
                {
                  url: event.url,
                  title: event.title,
                  snippet: event.snippet,
                  publishedAt: event.publishedAt,
                },
              ],
            },
      );
    case "decision":
      return mapSource(state, event.claimId, event.url, (s) => ({
        ...s,
        decision: event.decision,
        reason: event.reason,
        authority: event.authority,
        freshnessDays: event.freshnessDays,
      }));
    case "extracted":
      return mapSource(state, event.claimId, event.url, (s) => ({
        ...s,
        extractedChars: event.chars,
      }));
    case "verdict":
      return mapClaim(state, event.claimId, (c) => ({
        ...c,
        verdict: event.verdict,
        confidence: event.confidence,
        rationale: event.rationale,
        dissent: event.dissent,
      }));
    case "receipt":
      return { ...state, receipt: event.receipt };
    case "error":
      return { ...state, error: event.message, running: false };
    case "done":
      return { ...state, running: false, phase: "done" };
    default:
      return state;
  }
}

function mapClaim(
  state: ReviewState,
  claimId: string,
  fn: (c: ClaimState) => ClaimState,
): ReviewState {
  return {
    ...state,
    claims: state.claims.map((c) => (c.id === claimId ? fn(c) : c)),
  };
}

function mapSource(
  state: ReviewState,
  claimId: string,
  url: string,
  fn: (s: SourceState) => SourceState,
): ReviewState {
  return mapClaim(state, claimId, (c) => ({
    ...c,
    sources: c.sources.map((s) => (s.url === url ? fn(s) : s)),
  }));
}
