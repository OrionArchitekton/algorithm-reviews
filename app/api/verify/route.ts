import { verifyReceipt } from "@/lib/receipt/sign";
import type { SignedReceipt } from "@/lib/receipt/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verify a signed receipt's ECDSA signature + canonical hash. */
export async function POST(req: Request) {
  let receipt: SignedReceipt | undefined;
  let publicKey: JsonWebKey | undefined;
  try {
    const body = (await req.json()) as {
      receipt?: SignedReceipt;
      publicKey?: JsonWebKey;
    };
    receipt = body.receipt;
    publicKey = body.publicKey;
  } catch {
    return Response.json({ valid: false, reason: "invalid JSON body" }, { status: 400 });
  }

  if (!receipt?.signature) {
    return Response.json(
      { valid: false, reason: "receipt with a signature is required" },
      { status: 400 },
    );
  }

  try {
    const result = await verifyReceipt(receipt, publicKey);
    return Response.json(result);
  } catch (e) {
    return Response.json({
      valid: false,
      reason: e instanceof Error ? e.message : "verification error",
    });
  }
}
