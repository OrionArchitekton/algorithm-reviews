import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt } from "@/components/Receipt";
import { runReview } from "@/lib/agent/pipeline";
import { DEMOS, DEMO_IDS } from "@/lib/fixtures/demo";
import { MockProvider } from "@/lib/web/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DemoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const demo = DEMOS[id];
  if (!demo) notFound();

  // Forced offline: mock provider + mock model => no network, never flakes.
  const receipt = await runReview(demo.input, () => {}, {
    provider: new MockProvider(),
    mockModel: true,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--border-strong)", color: "var(--fg-dim)" }}>
          offline demo fixture · deterministic · zero external calls
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{demo.title}</h1>
        <p className="mono text-sm" style={{ color: "var(--fg-dim)" }}>
          “{demo.input}”
        </p>
      </div>

      <Receipt receipt={receipt} />

      <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
        <span className="mono text-xs" style={{ color: "var(--fg-faint)" }}>other fixtures:</span>
        {DEMO_IDS.filter((x) => x !== id).map((x) => (
          <Link key={x} href={`/demo/${x}`} className="underline" style={{ color: "var(--accent)" }}>
            {DEMOS[x].title}
          </Link>
        ))}
        <Link href="/" className="ml-auto underline" style={{ color: "var(--fg-dim)" }}>
          ← run a live review
        </Link>
      </div>
    </div>
  );
}
