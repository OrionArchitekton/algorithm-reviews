import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "algorithm.reviews — the agent trust layer",
  description:
    "A governed agent that fact-checks claims against the live web and ships a signed, auditable review receipt — and shows every source it admitted or rejected, and why.",
  metadataBase: new URL("https://algorithm.reviews"),
  openGraph: {
    title: "algorithm.reviews — an algorithm that reviews",
    description:
      "Governed live-web fact-checking with a signed, verifiable receipt. Watch it admit and reject sources in real time.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b backdrop-blur" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 80%, transparent)" }}>
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="mono text-[15px] font-semibold tracking-tight">
                algorithm<span style={{ color: "var(--accent)" }}>.reviews</span>
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm" style={{ color: "var(--fg-dim)" }}>
              <Link href="/verify" className="hover:text-[var(--fg)]">Verify</Link>
              <Link href="/#how" className="hover:text-[var(--fg)]">How it works</Link>
              <a href="/api/pubkey" className="mono text-xs hover:text-[var(--fg)]" title="receipt-signing public key">pubkey</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-3xl px-4 py-6 mono text-xs" style={{ color: "var(--fg-faint)" }}>
            algorithm.reviews · an algorithm that reviews — and whose reviewing is itself reviewable ·
            built for DeveloperWeek New York 2026
          </div>
        </footer>
      </body>
    </html>
  );
}
