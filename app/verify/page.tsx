import type { Metadata } from "next";
import { VerifyConsole } from "@/components/VerifyConsole";

export const metadata: Metadata = {
  title: "Verify a receipt · algorithm.reviews",
  description:
    "Independently verify the ECDSA signature on a review receipt against the published public key.",
};

export default function VerifyPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Verify a review receipt</h1>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--fg-dim)" }}>
          Every receipt is signed with an ECDSA P-256 key over a deterministic canonical
          payload. Paste one here to check it against the published public key — change a
          single character and the signature fails. That is what makes a verdict{" "}
          <span style={{ color: "var(--fg)" }}>defensible</span>, not just plausible.
        </p>
      </div>
      <VerifyConsole />
    </div>
  );
}
