/**
 * Canned demo inputs rendered by /demo/[id] with a forced mock provider + mock
 * model — zero external calls, so they are a guaranteed stage fallback that can
 * never rate-limit or 500 (adversarial review I3).
 */
export const DEMOS: Record<string, { title: string; input: string }> = {
  "claude-context": {
    title: "A marketing claim",
    input:
      "Anthropic's Claude Opus 4.8 has a 1 million token context window.",
  },
  "nimble-best": {
    title: "A “best of” listicle",
    input:
      "The best web data API for AI agents in 2026 is Nimble, which beats every competitor on price and accuracy.",
  },
  "link-rot": {
    title: "A viral statistic",
    input: "Roughly 1 in 5 links on the web break within a few years.",
  },
};

export const DEMO_IDS = Object.keys(DEMOS);
