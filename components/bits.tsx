import type { Verdict } from "@/lib/receipt/types";

export const VERDICT_META: Record<
  Verdict,
  { label: string; color: string; bg: string; icon: string }
> = {
  supported: { label: "Supported", color: "var(--admit)", bg: "var(--admit-bg)", icon: "✓" },
  refuted: { label: "Refuted", color: "var(--reject)", bg: "var(--reject-bg)", icon: "✕" },
  unverifiable: { label: "Unverifiable", color: "var(--warn)", bg: "#2a2212", icon: "?" },
  mixed: { label: "Mixed", color: "var(--accent)", bg: "var(--accent-bg)", icon: "≈" },
};

export function VerdictChip({
  verdict,
  confidence,
  large,
}: {
  verdict: Verdict;
  confidence?: number;
  large?: boolean;
}) {
  const m = VERDICT_META[verdict];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${large ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs"}`}
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.color}44` }}
    >
      <span aria-hidden>{m.icon}</span>
      {m.label}
      {confidence !== undefined && (
        <span style={{ color: "var(--fg-faint)", fontWeight: 400 }}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`,
          background:
            value > 0.66 ? "var(--admit)" : value > 0.33 ? "var(--warn)" : "var(--reject)",
        }}
      />
    </div>
  );
}

export function AuthorityBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className="inline-flex items-center gap-1" title={`authority ${Math.round(v * 100)}%`}>
      <span className="h-1.5 w-10 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
        <span
          className="block h-full"
          style={{ width: `${v * 100}%`, background: v > 0.6 ? "var(--admit)" : v > 0.35 ? "var(--warn)" : "var(--reject)" }}
        />
      </span>
    </span>
  );
}

export function formatFreshness(days: number | null | undefined): string {
  if (days === null || days === undefined) return "undated";
  if (days < 1) return "today";
  if (days < 60) return `${Math.round(days)}d`;
  if (days < 730) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export function shortHash(h: string, n = 10): string {
  return h.length > n ? `${h.slice(0, n)}…` : h;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
