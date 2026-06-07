"use client";

import { useEffect, useState } from "react";
import type { SignedReceipt } from "@/lib/receipt/types";
import { VerdictChip, hostOf, shortHash } from "./bits";

export function Receipt({
  receipt,
  onReverify,
  reverifying,
}: {
  receipt: SignedReceipt;
  onReverify?: () => void;
  reverifying?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(receipt, null, 2);

  // Stash the latest receipt so /verify can load it without server persistence.
  useEffect(() => {
    try {
      sessionStorage.setItem("ar:lastReceipt", JSON.stringify(receipt));
    } catch {
      /* ignore */
    }
  }, [receipt]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <section
      className="slide-in rounded-xl border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="mono text-xs uppercase tracking-widest" style={{ color: "var(--fg-faint)" }}>
            Review Receipt
          </span>
          <VerdictChip verdict={receipt.overall.verdict} confidence={receipt.overall.confidence} large />
        </div>
        <div className="flex items-center gap-2">
          {onReverify && (
            <button
              onClick={onReverify}
              disabled={reverifying}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:brightness-125 disabled:opacity-50"
              style={{ borderColor: "var(--border-strong)", color: "var(--fg-dim)" }}
            >
              {reverifying ? "Re-verifying…" : "↻ Re-verify (live web)"}
            </button>
          )}
          <button
            onClick={copy}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:brightness-125"
            style={{ borderColor: "var(--border-strong)", color: "var(--fg-dim)" }}
          >
            {copied ? "Copied ✓" : "Copy JSON"}
          </button>
          <a
            href="/verify"
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ background: "var(--accent-bg)", color: "var(--accent)", border: "1px solid var(--accent)" }}
          >
            Verify ↗
          </a>
        </div>
      </div>

      {/* Summary + signature */}
      <div className="space-y-3 border-b p-4" style={{ borderColor: "var(--border)" }}>
        <p style={{ color: "var(--fg-dim)" }}>{receipt.overall.summary}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mono text-xs" style={{ color: "var(--fg-faint)" }}>
          <span style={{ color: "var(--admit)" }}>● signed</span>
          <span>{receipt.signature.alg.replace(/_/g, " ")}</span>
          <span title="signing public-key thumbprint">key {shortHash(receipt.signature.keyId, 8)}</span>
          <span title="canonical SHA-256 of the receipt">sha256 {shortHash(receipt.signature.canonicalSha256, 12)}</span>
          <span>web: {receipt.provider.web}</span>
          <span>model: {receipt.provider.model}</span>
        </div>
      </div>

      {/* Claims */}
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {receipt.claims.map((c) => (
          <ClaimBlock key={c.claimId} claim={c} />
        ))}
      </div>
    </section>
  );
}

function ClaimBlock({ claim }: { claim: SignedReceipt["claims"][number] }) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium leading-snug">{claim.claim}</p>
        <div className="shrink-0">
          <VerdictChip verdict={claim.verdict} confidence={claim.confidence} />
        </div>
      </div>

      {claim.rationale && (
        <p className="text-sm leading-relaxed" style={{ color: "var(--fg-dim)" }}>
          {claim.rationale}
        </p>
      )}

      {claim.dissent && (
        <p className="rounded-md border-l-2 px-3 py-1.5 text-sm" style={{ borderColor: "var(--warn)", background: "#221d10", color: "#e8d9b8" }}>
          <span className="mono text-xs uppercase tracking-wide" style={{ color: "var(--warn)" }}>dissent </span>
          {claim.dissent}
        </p>
      )}

      {claim.citations.length > 0 && (
        <ul className="space-y-1.5">
          {claim.citations.map((ci, i) => (
            <li key={i} className="text-sm">
              <a href={ci.url} target="_blank" rel="noreferrer" className="group flex flex-col gap-0.5 rounded-md border p-2 transition-colors hover:brightness-125" style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}>
                <span className="flex items-center gap-2">
                  <span className="mono text-xs" style={{ color: "var(--admit)" }}>▸ {hostOf(ci.url)}</span>
                  {ci.publishedAt && (
                    <span className="mono text-xs" style={{ color: "var(--fg-faint)" }}>{ci.publishedAt.slice(0, 10)}</span>
                  )}
                </span>
                <span style={{ color: "var(--fg-dim)" }}>“{ci.quote}”</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {claim.rejected.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer mono text-xs" style={{ color: "var(--reject)" }}>
            {claim.rejected.length} source{claim.rejected.length === 1 ? "" : "s"} rejected by policy
          </summary>
          <ul className="mt-1.5 space-y-1">
            {claim.rejected.map((r, i) => (
              <li key={i} className="flex items-center gap-2 mono text-xs" style={{ color: "var(--fg-faint)" }}>
                <span style={{ color: "var(--reject)" }}>✕</span>
                <span className="truncate" style={{ maxWidth: "16rem" }}>{hostOf(r.url)}</span>
                <span>— {r.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
