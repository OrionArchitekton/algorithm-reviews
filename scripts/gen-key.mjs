#!/usr/bin/env node
// Generate an ECDSA P-256 keypair for stable receipt signing.
// Usage: node scripts/gen-key.mjs   → prints the RECEIPT_SIGNING_JWK env line.
import { webcrypto as crypto } from "node:crypto";

const pair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);

const thumbInput = `{"crv":"${pub.crv}","kty":"${pub.kty}","x":"${pub.x}","y":"${pub.y}"}`;
const digest = await crypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode(thumbInput),
);
const kid = Buffer.from(digest)
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

console.error(`# key id (public thumbprint): ${kid}`);
console.log(`RECEIPT_SIGNING_JWK=${JSON.stringify(priv)}`);
