# Devpost submission — draft (fill in / trim tomorrow)

> Working draft for the DeveloperWeek New York 2026 Hackathon submission.
> Live: **https://algorithm-reviews.vercel.app** · Repo: https://github.com/OrionArchitekton/algorithm-reviews

---

## Project title

**algorithm.reviews — The Agent Trust Layer**

(Alt: "algorithm.reviews — a fact-checking agent that shows its work")

## Tagline / elevator pitch (Devpost caps ~200 chars)

A governed AI agent that fact-checks any claim against the live web, shows every
source it admits or rejects in real time, and ships a cryptographically signed
receipt you can verify. An algorithm that reviews — and whose reviewing is itself
reviewable.

Shorter option (≤120 chars):
> Live-web fact-checking with a signed, verifiable receipt — and a glass box that
> shows every source it admits or rejects.

## Submitting to (challenges)

- **Overall Hackathon Winner**
- **Nimble — Build an Agentic App That Sees the Live Web** (Nimble is the
  load-bearing live-web provider: Search + Extract)
- **name.com — Domain Roulette** (domain: `algorithm.reviews`, a confirmed pool
  domain; the literal "an algorithm that reviews" read + the self-referential
  glass box are the deep domain connection)

---

## Inspiration

AI answers and online reviews are unauditable. You can't tell a grounded verdict
from a hallucinated one; sources are stale, cherry-picked, or fabricated; and the
"AI fact-checkers" meant to fix this are themselves black boxes. Anyone who has to
*defend* a conclusion — a buyer doing due diligence, a journalist, a compliance or
procurement team — is stuck with a vibe and ten open browser tabs.

We build trust infrastructure for a living: a two-plane architecture where a
governance plane decides what's allowed and an execution plane acts, with
fail-closed enforcement and tamper-evident receipts. `algorithm.reviews` is that
exact pattern pointed at a problem everyone has: *is this claim actually true, and
can I prove how I know?*

## What it does

Paste a claim, a "best X of 2026" listicle, a vendor pitch, or a URL. A governed
agent:

1. **Decomposes** the input into atomic, checkable claims.
2. **Searches the live web** for each claim (Nimble Search).
3. **Admits or rejects each source — fail-closed.** A deterministic governance
   policy rejects stale, low-authority, off-topic, or unsourced material and
   *shows you why*, live, in a green/red glass box. No admissible evidence ⇒
   "unverifiable", never "false".
4. **Extracts** the admitted sources (Nimble Extract) and **adjudicates** a verdict
   grounded *only* in admitted evidence — with per-claim confidence, the strongest
   counter-evidence (dissent), and verbatim citations with timestamps.
5. **Signs a review receipt** with an ECDSA P-256 key over a deterministic
   canonical payload. Anyone can verify it against the published public key at
   `/verify` — change a single character and the signature fails.

The result reads like an audit, not a chatbot answer: a verdict you can defend.

## How we built it

- **Next.js 16 (App Router) + React 19 + Tailwind v4 + TypeScript**, deployed on
  **Vercel**.
- **Vercel AI SDK 6** driving **Anthropic Claude** — Opus for adjudication, Haiku
  for source classification and query generation.
- **Nimble** as the live-web layer (Search + Extract) behind a swappable
  `WebProvider` interface, with a keyless Wikipedia fallback and a deterministic
  mock so it builds, tests, and demos offline.
- **Two-plane architecture in one app:** an execution plane (search/extract) and a
  governance plane (a deterministic, unit-tested admissibility policy + the
  adjudicator). The model *proposes* signals (authority, relevance); *policy*, not
  the model, decides admission.
- **Web Crypto ECDSA P-256** signing over a canonical payload that excludes
  volatile fields (timestamps, ordering), so a re-run only changes the signature
  when the *evidence* changes.
- **Streaming "glass box":** the route emits newline-delimited JSON events
  (claim / query / admit / reject / verdict / receipt) that render live.
- Hard caps in code (≤3 claims, ≤2 queries/claim, ≤8 extracts, concurrency 2) keep
  every run inside web-provider rate limits and the serverless function budget.
- 19 unit tests (governance policy, canonicalization, signing/verification, the UI
  reducer); typecheck + lint + build all green.

## Challenges we ran into

- **Web search doesn't work from a datacenter IP without a keyed provider.**
  DuckDuckGo blocks Vercel's IPs and Jina's search now needs a key — which is
  exactly the problem Nimble's residential infrastructure solves. We added a
  keyless Wikipedia fallback so the app is never dead, and Nimble is the real
  upgrade.
- **The governance plane was *too honest* at first** — it correctly rejected
  irrelevant sources and returned "unverifiable", which exposed a *search* bug
  (feeding raw sentences to a search index returns junk). The fix was LLM keyword
  query generation, not loosening the policy. A fabricating fact-checker would have
  "found support" in those junk sources; ours refused.
- **"Signed" has to mean signed.** A bare SHA-256 hash is a checksum, not a
  signature. We implemented a real ECDSA P-256 keypair and a public verify
  endpoint, so "signed receipt" is literally true and a skeptical engineer can
  check it.
- **Serverless ephemeral keys broke verification** — each instance generated its
  own key until we pinned a stable signing key as an encrypted env var.

## Accomplishments we're proud of

- A fact-checker that **refuses to rubber-stamp** — fail-closed, with a visible
  admit/reject trail.
- Receipts that are **independently verifiable** and **tamper-evident** (flip a
  verdict or a quote → the signature fails, live, in the `/verify` page).
- Real verdicts on live data: true claims → supported, false claims → refuted,
  thin/conflicting evidence → unverifiable.
- One build that legitimately stacks three challenges without feeling forced.

## What we learned

- Make the *governance* the product, not the answer. The admit/reject reasoning is
  what makes a verdict trustworthy.
- Determinism is a feature: a signature that only changes when evidence changes is
  a liveness proof you can demo.
- Graceful degradation (swappable providers, mock mode, offline fixtures) is what
  lets a live demo survive contact with a stage.

## What's next

- Nimble Crawl/Map for deep multi-page evidence; per-source provenance scoring.
- A callable MCP server so other agents can use the verifier as a fail-closed gate.
- Shareable receipt permalinks and an org-level policy console (tunable
  admissibility thresholds).
- Caching + a "watch this claim" mode that re-verifies on a schedule.

## Built with

`next.js` · `react` · `typescript` · `tailwindcss` · `vercel` · `vercel-ai-sdk` ·
`anthropic` · `claude` · `nimble` · `web-crypto` · `ecdsa` · `node.js`

## Try it out

- Live app: **https://algorithm-reviews.vercel.app**
- Verify a receipt: `/verify` (includes a "Tamper with it" button)
- Offline demo fixtures: `/demo/link-rot`, `/demo/nimble-best`, `/demo/claude-context`
- Public key: `/api/pubkey`
- Source: https://github.com/OrionArchitekton/algorithm-reviews

## Demo video script (60–90s)

1. (0–10s) One line: "This is a fact-checker that shows its work and signs the
   result." Show the home page.
2. (10–35s) Paste a true claim ("The Eiffel Tower is 330 metres tall") → Review.
   Narrate the glass box: "watch it search the live web and admit or reject each
   source, with a reason." Land on **supported**, click a citation → real source.
3. (35–55s) Paste a false claim ("the speed of light is 500,000 km/s") → **refuted**
   with a citation. "It doesn't just agree with you."
4. (55–75s) Go to `/verify`, "Load my last review" → **Signature valid**. Click
   **"Tamper with it"** → re-verify → **INVALID**. "That's the difference between a
   verdict you trust and one you can defend."
5. (75–90s) "algorithm.reviews — an algorithm that reviews, whose reviewing is
   itself reviewable." Show the domain.
