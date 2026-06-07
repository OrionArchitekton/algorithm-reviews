import { describe, expect, it } from "vitest";
import { CAPS } from "@/lib/agent/caps";
import { type SourceSignals, admit } from "@/lib/agent/govern";

function signals(overrides: Partial<SourceSignals> = {}): SourceSignals {
  return {
    url: "https://reuters.com/x",
    title: "x",
    authority: 0.9,
    relevance: 0.9,
    freshnessDays: 10,
    hasContent: true,
    ...overrides,
  };
}

describe("admissibility policy (governance plane)", () => {
  it("admits a fresh, relevant, high-authority source", () => {
    expect(admit(signals()).decision).toBe("admit");
  });

  it("rejects an off-topic source and says so", () => {
    const d = admit(signals({ relevance: 0.2 }));
    expect(d.decision).toBe("reject");
    expect(d.reason).toMatch(/off-topic/i);
  });

  it("rejects a low-authority / unsourced source", () => {
    const d = admit(signals({ authority: 0.2 }));
    expect(d.decision).toBe("reject");
    expect(d.reason).toMatch(/low-authority|unsourced/i);
  });

  it("rejects a stale source", () => {
    const d = admit(signals({ freshnessDays: CAPS.freshnessStaleDays + 100, authority: 0.6 }));
    expect(d.decision).toBe("reject");
    expect(d.reason).toMatch(/stale/i);
  });

  it("admits a stale BUT very high-authority primary source (override)", () => {
    const d = admit(signals({ freshnessDays: CAPS.freshnessStaleDays + 1000, authority: 0.95 }));
    expect(d.decision).toBe("admit");
  });

  it("fail-closed: rejects when there is no extractable content", () => {
    const d = admit(signals({ hasContent: false }));
    expect(d.decision).toBe("reject");
    expect(d.reason).toMatch(/no extractable content/i);
  });

  it("reports the PRIMARY defect first (off-topic beats authority)", () => {
    const d = admit(signals({ relevance: 0.1, authority: 0.1 }));
    expect(d.reason).toMatch(/off-topic/i);
  });
});
