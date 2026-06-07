# algorithm.reviews — The Agent Trust Layer

**An algorithm that reviews — and whose reviewing is itself reviewable.**

Paste a claim, a "best X of 2026" listicle, a vendor pitch, or a URL. A *governed*
agent fans out across the **live web**, decides which sources are **admissible**
(fail-closed), forms a verdict grounded only in admitted evidence, and ships a
**signed review receipt** — verdict, per-claim confidence, timestamped citations,
dissent, and an **ECDSA signature** anyone can verify. You watch every
**admit / reject** decision stream in real time.

Built for the **DeveloperWeek New York 2026 Hackathon**. One project, three
challenges: **Overall**, **Nimble** (live web), **name.com Domain Roulette**
(`algorithm.reviews`).

---

## Why it exists

AI answers and online reviews are **unauditable**: you can't tell a grounded
verdict from a hallucinated one, sources are stale or fabricated, and "AI
fact-checkers" are themselves black boxes. Buyers, journalists, compliance, and
due-diligence teams need a verdict they can **defend** — a citation trail and a
timestamp, not a vibe.

algorithm.reviews is a **two-plane architecture** compressed into one legible
product:

- **Execution plane** — searches and extracts live web evidence.
- **Governance plane** — decides what evidence is *admissible* (fail-closed),
  adjudicates the verdict, and signs the receipt.

The governance is the spectacle: you see, live, which sources were **admitted
(green)** and **rejected (red)**, and *why*.

## How it works

```text
Input → [decompose into atomic claims]
      → [search the live web]                          (execution plane)
      → [ADMIT / REJECT each source, fail-closed]       (governance plane)  ◀ the differentiator
      → [extract admitted sources]
      → [verify + dissent in one pass]                  (governance plane)
      → [signed review receipt + ECDSA signature]
```

- **Fail-closed:** a claim with no admissible evidence resolves to
  **"unverifiable"**, never "false". Absence of proof ≠ proof of absence.
- **Hard caps in code** (≤3 claims, ≤2 queries/claim, ≤8 extracts, concurrency 2)
  keep every run inside web-provider rate limits and the serverless function
  budget.
- **Deterministic, signed receipts:** the signature covers a canonical payload
  that *excludes* volatile fields (timestamps, ordering), so re-running only
  changes the signature when the **evidence** changes. Tamper with a verdict or a
  quote and verification fails — try it at `/verify`.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · TypeScript · Vercel AI SDK 6 ·
Anthropic Claude (Opus for adjudication, Haiku for classification) · Nimble live
web · Web Crypto ECDSA P-256 · deployed on Vercel.

The **web layer** is a swappable `WebProvider`: Nimble primary, keyless
Jina/DuckDuckGo fallback, and a deterministic mock — so the app builds, tests,
and demos offline, and degrades gracefully on stage instead of hard-failing.

The **model layer** resolves `Vercel AI Gateway (OIDC) → Anthropic key → mock`,
so it runs with zero keys (mock) and goes fully live the instant a key or the
gateway is available — no code change.

## Run it

```bash
npm install
cp .env.example .env.local      # optional — works with no keys (mock mode)
npm run dev                     # http://localhost:3000
```

Offline demo fixtures (zero external calls, guaranteed): `/demo/claude-context`,
`/demo/nimble-best`, `/demo/link-rot`.

### Quality gates

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest — governance policy, canonicalization, signing, reducer
npm run build       # next build
```

### Environment

See [`.env.example`](./.env.example). Nothing is required (mock mode). For live
runs: `NIMBLE_API_KEY` (web), and either the Vercel AI Gateway (automatic on
Vercel) or `ANTHROPIC_API_KEY`. Generate a stable signing key with
`node scripts/gen-key.mjs`.

## Verify a receipt yourself

Every receipt is signed with ECDSA P-256. The public key is published at
`/api/pubkey`. `POST /api/verify` (or the `/verify` page) recomputes the
canonical payload and checks the signature. Change one character → it fails.

## Design

The full design doc, including the adversarial review that shaped it, is in
[`docs/DESIGN.md`](./docs/DESIGN.md).
