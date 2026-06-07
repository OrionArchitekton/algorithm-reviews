"use client";

import { useState } from "react";
import type { VerifyResult } from "@/lib/receipt/sign";
import { shortHash } from "./bits";

export function VerifyConsole() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadLast() {
    try {
      const raw = sessionStorage.getItem("ar:lastReceipt");
      if (raw) setText(JSON.stringify(JSON.parse(raw), null, 2));
      else setError("No recent review found — run one on the home page first.");
    } catch {
      /* ignore */
    }
  }

  async function verify() {
    setError(null);
    setResult(null);
    let receipt: unknown;
    try {
      receipt = JSON.parse(text);
    } catch {
      setError("That isn't valid JSON.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receipt }),
      });
      const data = (await res.json()) as VerifyResult & { reason?: string };
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function tamper() {
    try {
      const obj = JSON.parse(text);
      if (obj?.overall) {
        obj.overall.verdict =
          obj.overall.verdict === "supported" ? "refuted" : "supported";
        setText(JSON.stringify(obj, null, 2));
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={loadLast}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:brightness-125"
          style={{ borderColor: "var(--border-strong)", color: "var(--fg-dim)" }}
        >
          Load my last review
        </button>
        <button
          onClick={tamper}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:brightness-125"
          style={{ borderColor: "var(--border-strong)", color: "var(--warn)" }}
          title="Flip the verdict to prove the signature catches tampering"
        >
          Tamper with it ⚠
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a signed review receipt JSON here…"
        rows={12}
        className="mono w-full resize-y rounded-xl border bg-transparent p-3 text-xs outline-none"
        style={{ borderColor: "var(--border-strong)", background: "var(--bg-card)", color: "var(--fg-dim)" }}
      />

      <button
        onClick={verify}
        disabled={busy || !text.trim()}
        className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-40"
        style={{ background: "var(--accent)", color: "#0a0b0f" }}
      >
        {busy ? "Verifying…" : "Verify signature →"}
      </button>

      {error && (
        <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--reject)", background: "var(--reject-bg)", color: "var(--reject)" }}>
          {error}
        </div>
      )}

      {result && (
        <div
          className="slide-in space-y-3 rounded-xl border p-4"
          style={{
            borderColor: result.valid ? "var(--admit)" : "var(--reject)",
            background: result.valid ? "var(--admit-bg)" : "var(--reject-bg)",
          }}
        >
          <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: result.valid ? "var(--admit)" : "var(--reject)" }}>
            <span>{result.valid ? "✓" : "✕"}</span>
            <span>{result.valid ? "Signature valid" : "Signature INVALID"}</span>
          </div>
          <ul className="space-y-1 mono text-xs" style={{ color: "var(--fg-dim)" }}>
            <li>signature verifies: {bool(result.valid)}</li>
            <li>canonical hash matches: {bool(result.hashMatches)}</li>
            <li>key id matches server: {bool(result.keyIdMatches)}</li>
            <li>recomputed sha256: {shortHash(result.recomputedSha256, 24)}</li>
            {result.reason && <li style={{ color: "var(--warn)" }}>note: {result.reason}</li>}
          </ul>
          <p className="text-xs" style={{ color: "var(--fg-faint)" }}>
            Verified against the server&apos;s published key at{" "}
            <a href="/api/pubkey" className="underline">/api/pubkey</a>. Try{" "}
            <span style={{ color: "var(--warn)" }}>Tamper with it</span> above, then re-verify — the signature fails.
          </p>
        </div>
      )}
    </div>
  );
}

function bool(b: boolean) {
  return b ? "yes" : "no";
}
