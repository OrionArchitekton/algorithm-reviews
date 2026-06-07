import { ReviewConsole } from "@/components/ReviewConsole";

export default function Home() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--border-strong)", color: "var(--fg-dim)" }}>
          <span className="h-1.5 w-1.5 rounded-full pulse" style={{ background: "var(--admit)" }} />
          live-web fact-checking · signed receipts
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          An algorithm that reviews —{" "}
          <span style={{ color: "var(--accent)" }}>and shows its work.</span>
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>
          Paste a claim, a “best of 2026” listicle, a vendor pitch, or a URL. A governed
          agent fans out across the <span style={{ color: "var(--fg)" }}>live web</span>, decides which
          sources are <span style={{ color: "var(--admit)" }}>admissible</span> (fail-closed), and ships a{" "}
          <span style={{ color: "var(--fg)" }}>signed review receipt</span> you can verify — while you
          watch every <span style={{ color: "var(--admit)" }}>admit</span> /{" "}
          <span style={{ color: "var(--reject)" }}>reject</span> decision in real time.
        </p>
      </section>

      <ReviewConsole />

      {/* How it works */}
      <section id="how" className="space-y-4 pt-4">
        <h2 className="mono text-xs uppercase tracking-widest" style={{ color: "var(--fg-faint)" }}>
          How it works
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Step
            n="1"
            title="Execution plane — research"
            body="Decompose the input into atomic claims, then fan out across the live web (Nimble Search/Extract, with a keyless fallback) to gather candidate sources."
          />
          <Step
            n="2"
            title="Governance plane — admissibility"
            body="A fail-closed policy admits or rejects each source — stale, low-authority, off-topic, or unsourced gets rejected, with the reason shown. No admissible evidence ⇒ ‘unverifiable’, never ‘false’."
          />
          <Step
            n="3"
            title="Adjudication — verify + dissent"
            body="A verdict is formed strictly from admitted evidence, with per-claim confidence, the strongest counter-evidence (dissent), and verbatim citations with timestamps."
          />
          <Step
            n="4"
            title="Signed receipt"
            body="The result is signed with an ECDSA P-256 key over a deterministic canonical payload. Anyone can verify it against the published public key — re-run and the signature only changes if the evidence does."
          />
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded mono text-xs font-bold" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
          {n}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--fg-dim)" }}>
        {body}
      </p>
    </div>
  );
}
