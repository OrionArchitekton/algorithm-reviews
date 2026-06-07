import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Model resolution with graceful degradation:
 *   1. ANTHROPIC_API_KEY set  → direct @ai-sdk/anthropic provider
 *   2. AI Gateway available   → bare "anthropic/..." string id (OIDC in prod,
 *                               AI_GATEWAY_API_KEY locally) — no raw key needed
 *   3. nothing                → "mock" mode (deterministic, offline)
 *
 * "heavy" = adjudication/governance (Opus). "light" = decomposition + source
 * classification (Haiku). Pushing bulk work to Haiku keeps the run inside the
 * Vercel function budget (adversarial review B3).
 */
export type Tier = "heavy" | "light";

const DIRECT_IDS: Record<Tier, string> = {
  heavy: "claude-opus-4-8",
  light: "claude-haiku-4-5",
};
const GATEWAY_IDS: Record<Tier, string> = {
  heavy: "anthropic/claude-opus-4.8",
  light: "anthropic/claude-haiku-4.5",
};

export function modelMode(): "live" | "mock" {
  const forced = process.env.MODEL_MODE?.toLowerCase();
  if (forced === "mock") return "mock";
  if (forced === "live") return "live";
  const hasLive =
    !!process.env.ANTHROPIC_API_KEY ||
    !!process.env.AI_GATEWAY_API_KEY ||
    !!process.env.VERCEL_OIDC_TOKEN;
  return hasLive ? "live" : "mock";
}

export function getModel(tier: Tier): LanguageModel {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(DIRECT_IDS[tier]);
  }
  // Bare string id → resolved by the AI SDK's default Vercel AI Gateway provider.
  return GATEWAY_IDS[tier];
}

/** Label for the receipt's provider.model field. */
export function modelLabel(): string {
  if (modelMode() === "mock") return "mock";
  return process.env.ANTHROPIC_API_KEY ? "anthropic-direct" : "vercel-ai-gateway";
}
