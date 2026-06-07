import { describe, expect, it } from "vitest";
import type { ReviewEvent } from "@/lib/events";
import { initialState, reduce } from "@/lib/ui/state";

function apply(events: ReviewEvent[]) {
  return events.reduce(reduce, initialState);
}

describe("review state reducer", () => {
  it("adds claims and is idempotent on duplicate claim ids", () => {
    const s = apply([
      { type: "claim", claimId: "c1", text: "A" },
      { type: "claim", claimId: "c1", text: "A again" },
      { type: "claim", claimId: "c2", text: "B" },
    ]);
    expect(s.claims.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("attaches sources and their admit/reject decisions to the right claim", () => {
    const s = apply([
      { type: "claim", claimId: "c1", text: "A" },
      { type: "source_found", claimId: "c1", url: "https://x.com", title: "X", snippet: "", publishedAt: null },
      { type: "decision", claimId: "c1", url: "https://x.com", title: "X", decision: "reject", reason: "stale", authority: 0.2, freshnessDays: 9000 },
    ]);
    const src = s.claims[0].sources[0];
    expect(src.decision).toBe("reject");
    expect(src.reason).toBe("stale");
    expect(src.authority).toBe(0.2);
  });

  it("records the verdict and stops running on done", () => {
    const s = apply([
      { type: "claim", claimId: "c1", text: "A" },
      { type: "verdict", claimId: "c1", verdict: "supported", confidence: 0.9, rationale: "r", dissent: "" },
      { type: "done" },
    ]);
    expect(s.claims[0].verdict).toBe("supported");
    expect(s.running).toBe(false);
  });

  it("captures errors and halts", () => {
    const s = apply([{ type: "error", message: "boom" }]);
    expect(s.error).toBe("boom");
    expect(s.running).toBe(false);
  });
});
