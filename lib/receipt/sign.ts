import { canonicalString, sha256Hex } from "./canonical";
import type { ReceiptCore, SignedReceipt } from "./types";

/**
 * ECDSA P-256 receipt signing (Web Crypto).
 *
 * The private signing key is read from env RECEIPT_SIGNING_JWK (a private JWK).
 * If unset, an ephemeral key is generated for the process so the app still works
 * out of the box — /api/pubkey then serves that instance's public key, and
 * /verify checks against it. For cross-instance verification, set the env key
 * (generate one with `node scripts/gen-key.mjs`).
 */

const ALG = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN_ALG = { name: "ECDSA", hash: "SHA-256" } as const;

interface KeyBundle {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: JsonWebKey;
  keyId: string;
}

let cached: Promise<KeyBundle> | null = null;

function getKeyBundle(): Promise<KeyBundle> {
  if (!cached) cached = loadOrGenerate();
  return cached;
}

async function loadOrGenerate(): Promise<KeyBundle> {
  const envJwk = process.env.RECEIPT_SIGNING_JWK;
  if (envJwk) {
    try {
      const priv = JSON.parse(envJwk) as JsonWebKey;
      return await fromPrivateJwk(priv);
    } catch (e) {
      console.warn("RECEIPT_SIGNING_JWK invalid, generating ephemeral key:", e);
    }
  }
  const pair = (await crypto.subtle.generateKey(ALG, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return {
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicJwk: stripPrivate(publicJwk),
    keyId: await thumbprint(publicJwk),
  };
}

async function fromPrivateJwk(priv: JsonWebKey): Promise<KeyBundle> {
  const privateKey = await crypto.subtle.importKey("jwk", priv, ALG, false, [
    "sign",
  ]);
  const pubJwk = stripPrivate(priv);
  const publicKey = await crypto.subtle.importKey("jwk", pubJwk, ALG, true, [
    "verify",
  ]);
  return {
    privateKey,
    publicKey,
    publicJwk: pubJwk,
    keyId: await thumbprint(pubJwk),
  };
}

export async function getPublicJwk(): Promise<JsonWebKey & { kid: string }> {
  const { publicJwk, keyId } = await getKeyBundle();
  return { ...publicJwk, kid: keyId };
}

/** Sign a receipt core, returning the full SignedReceipt. */
export async function signReceipt(core: ReceiptCore): Promise<SignedReceipt> {
  const { privateKey, keyId } = await getKeyBundle();
  const canonical = canonicalString(core);
  const canonicalSha256 = await sha256Hex(canonical);
  const sig = await crypto.subtle.sign(
    SIGN_ALG,
    privateKey,
    new TextEncoder().encode(canonical),
  );
  return {
    ...core,
    signature: {
      alg: "ECDSA_P-256_SHA-256",
      keyId,
      canonicalSha256,
      value: base64urlEncode(new Uint8Array(sig)),
    },
  };
}

export interface VerifyResult {
  valid: boolean;
  recomputedSha256: string;
  hashMatches: boolean;
  keyIdMatches: boolean;
  reason?: string;
}

/**
 * Verify a receipt's signature. By default checks against this server's public
 * key; pass an explicit publicJwk to verify an externally-supplied key.
 */
export async function verifyReceipt(
  receipt: SignedReceipt,
  publicJwk?: JsonWebKey,
): Promise<VerifyResult> {
  const core: ReceiptCore = stripSignature(receipt);
  const canonical = canonicalString(core);
  const recomputedSha256 = await sha256Hex(canonical);
  const hashMatches = recomputedSha256 === receipt.signature.canonicalSha256;

  let pubKey: CryptoKey;
  let keyIdMatches: boolean;
  if (publicJwk) {
    pubKey = await crypto.subtle.importKey("jwk", publicJwk, ALG, true, [
      "verify",
    ]);
    keyIdMatches = (await thumbprint(publicJwk)) === receipt.signature.keyId;
  } else {
    const bundle = await getKeyBundle();
    pubKey = bundle.publicKey;
    keyIdMatches = bundle.keyId === receipt.signature.keyId;
  }

  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      SIGN_ALG,
      pubKey,
      base64urlDecode(receipt.signature.value),
      new TextEncoder().encode(canonical),
    );
  } catch (e) {
    return {
      valid: false,
      recomputedSha256,
      hashMatches,
      keyIdMatches,
      reason: `signature decode/verify failed: ${(e as Error).message}`,
    };
  }
  return {
    valid: valid && hashMatches,
    recomputedSha256,
    hashMatches,
    keyIdMatches,
    reason: valid
      ? hashMatches
        ? undefined
        : "signature valid but canonical hash differs (content altered)"
      : "signature does not verify against the public key",
  };
}

function stripSignature(r: SignedReceipt): ReceiptCore {
  const { signature: _signature, ...core } = r;
  void _signature;
  return core;
}

function stripPrivate(jwk: JsonWebKey): JsonWebKey {
  const { d: _d, ...pub } = jwk;
  void _d;
  return { ...pub, key_ops: ["verify"], ext: true };
}

/** RFC 7638 JWK thumbprint (SHA-256, base64url) over the required EC members. */
async function thumbprint(jwk: JsonWebKey): Promise<string> {
  const ordered = `{"crv":"${jwk.crv}","kty":"${jwk.kty}","x":"${jwk.x}","y":"${jwk.y}"}`;
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ordered),
  );
  return base64urlEncode(new Uint8Array(buf));
}

function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
