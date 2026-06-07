import { getPublicJwk } from "@/lib/receipt/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Publishes the receipt-signing public key so anyone can verify a receipt. */
export async function GET() {
  const publicKey = await getPublicJwk();
  return Response.json(
    {
      alg: "ECDSA_P-256_SHA-256",
      use: "receipt-verification",
      keyId: publicKey.kid,
      publicKey,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
