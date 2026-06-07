"use client";

import { useCallback, useReducer, useRef, useState } from "react";
import { type ReviewEvent, parseNdjson } from "@/lib/events";
import {
  type ClaimState,
  type ReviewState,
  type SourceState,
  initialState,
  reduce,
} from "@/lib/ui/state";
import { Receipt } from "./Receipt";
import { AuthorityBar, VerdictChip, formatFreshness, hostOf } from "./bits";

type Action = ReviewEvent | { type: "__reset" } | { type: "__start" };

function rootReduce(state: ReviewState, action: Action): ReviewState {
  if (action.type === "__reset") return initialState;
  if (action.type === "__start")
    return { ...initialState, running: true, status: "Starting review…" };
  return reduce(state, action as ReviewEvent);
}

const EXAMPLES: { label: string; value: string }[] = [
  {
    label: "A marketing claim",
    value:
      "Anthropic's Claude Opus 4.8 has a 1 million token context window.",
  },
  {
    label: "A “best of” listicle",
    value:
      "The best web data API for AI agents in 2026 is Nimble, which beats every competitor on price and accuracy.",
  },
  {
    label: "A viral statistic",
    value: "Roughly 1 in 5 links on the web break within a few years.",
  },
];

export function ReviewConsole() {
  const [state, dispatch] = useReducer(rootReduce, initialState);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    dispatch({ type: "__start" });

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        dispatch({ type: "error", message: `request failed (${res.status})` });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const { events, rest } = parseNdjson(buf);
        buf = rest;
        for (const e of events) dispatch(e);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        dispatch({ type: "error", message: (err as Error).message });
      }
    }
  }, []);

  const busy = state.running;

  return (
    <div className="space-y-6">
      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(input);
        }}
        className="rounded-xl border p-4"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a claim, a “best X of 2026” listicle, a vendor pitch, or a URL…"
          rows={3}
          className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-[var(--fg-faint)]"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(input);
          }}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setInput(ex.value)}
                className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:brightness-125"
                style={{ borderColor: "var(--border)", color: "var(--fg-dim)" }}
              >
                {ex.label}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-md px-4 py-2 text-sm font-semibold transition-[filter] hover:brightness-110 disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#0a0b0f" }}
          >
            {busy ? "Reviewing…" : "Review →"}
          </button>
        </div>
        <p className="mt-2 mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
          ⌘/Ctrl + Enter to run · the agent searches the live web and shows every admit/reject decision
        </p>
      </form>

      {/* Status */}
      {(busy || state.status) && !state.receipt && (
        <div className="flex items-center gap-3 px-1 mono text-sm" style={{ color: "var(--fg-dim)" }}>
          {busy && (
            <span
              className="spin inline-block h-3.5 w-3.5 rounded-full border-2"
              style={{ borderColor: "var(--accent)", borderRightColor: "transparent" }}
            />
          )}
          <span>{state.status}</span>
          {state.phase && (
            <span className="rounded px-1.5 py-0.5 text-[11px] uppercase tracking-wide" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              {state.phase}
            </span>
          )}
        </div>
      )}

      {state.error && (
        <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--reject)", background: "var(--reject-bg)", color: "var(--reject)" }}>
          {state.error}
        </div>
      )}

      {/* Signed receipt (the artifact) */}
      {state.receipt && (
        <Receipt
          receipt={state.receipt}
          onReverify={() => run(state.receipt!.input)}
          reverifying={busy}
        />
      )}

      {/* Live governance trace */}
      {state.claims.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="mono text-xs uppercase tracking-widest" style={{ color: "var(--fg-faint)" }}>
              Governance trace
            </span>
            <span className="h-px flex-1" style={{ background: "var(--border)" }} />
          </div>
          {state.claims.map((c) => (
            <ClaimTrace key={c.id} claim={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimTrace({ claim }: { claim: ClaimState }) {
  const admitted = claim.sources.filter((s) => s.decision === "admit").length;
  const rejected = claim.sources.filter((s) => s.decision === "reject").length;
  return (
    <div className="slide-in rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-3 border-b p-3.5" style={{ borderColor: "var(--border)" }}>
        <div className="min-w-0">
          <p className="font-medium leading-snug">{claim.text}</p>
          {claim.queries.length > 0 && (
            <p className="mt-1 mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {claim.queries.map((q) => `“${q}”`).join("  ·  ")}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {claim.verdict ? (
            <VerdictChip verdict={claim.verdict} confidence={claim.confidence} />
          ) : (
            <span className="mono text-xs pulse" style={{ color: "var(--fg-faint)" }}>
              adjudicating…
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 p-3">
        {claim.sources.length === 0 && (
          <p className="mono text-xs pulse" style={{ color: "var(--fg-faint)" }}>
            searching the live web…
          </p>
        )}
        {claim.sources.map((s) => (
          <SourceRow key={s.url} s={s} />
        ))}
        {claim.sources.length > 0 && (
          <p className="pt-1 mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
            <span style={{ color: "var(--admit)" }}>{admitted} admitted</span>
            {" · "}
            <span style={{ color: "var(--reject)" }}>{rejected} rejected</span>
            {" by policy"}
          </p>
        )}
      </div>
    </div>
  );
}

function SourceRow({ s }: { s: SourceState }) {
  const pending = !s.decision;
  const admit = s.decision === "admit";
  const color = pending ? "var(--fg-faint)" : admit ? "var(--admit)" : "var(--reject)";
  const bg = pending ? "transparent" : admit ? "var(--admit-bg)" : "var(--reject-bg)";
  return (
    <div
      className="slide-in flex items-center gap-2.5 rounded-md border-l-2 px-2.5 py-1.5"
      style={{ borderColor: color, background: bg }}
    >
      <span className="mono text-[11px] font-semibold uppercase" style={{ color, minWidth: "3.4rem" }}>
        {pending ? "•••" : admit ? "admit" : "reject"}
      </span>
      <a
        href={s.url}
        target="_blank"
        rel="noreferrer"
        className="truncate text-sm hover:underline"
        style={{ color: "var(--fg)", maxWidth: "16rem" }}
        title={s.title}
      >
        {hostOf(s.url)}
      </a>
      {s.authority !== undefined && <AuthorityBar value={s.authority} />}
      {s.freshnessDays !== undefined && (
        <span className="mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {formatFreshness(s.freshnessDays)}
        </span>
      )}
      {s.reason && (
        <span className="truncate text-xs" style={{ color: "var(--fg-dim)" }}>
          {s.reason}
        </span>
      )}
      {s.extractedChars !== undefined && (
        <span className="mono text-[11px]" style={{ color: "var(--admit)" }} title="characters extracted">
          ⤓ {Math.round(s.extractedChars / 100) / 10}k
        </span>
      )}
    </div>
  );
}
