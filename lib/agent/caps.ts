/**
 * Hard caps — enforced in CODE, not in prompts.
 *
 * This is the single most important defense for the live demo: it keeps a run
 * inside web-provider rate limits AND the Vercel function duration budget, and
 * stops an "best X of 2026" listicle from fanning out into 100+ requests.
 *
 * Adversarial review B2/B3: an uncapped fan-out against a ~20 RPM provider
 * through a serverless function with a duration ceiling is the failure mode that
 * actually kills the demo on stage. These numbers are chosen so a worst-case run
 * stays well under the function budget and never bursts a provider.
 */
export const CAPS = {
  /** Max atomic claims extracted from the input. */
  maxClaims: 3,
  /** Max search queries generated per claim. */
  maxQueriesPerClaim: 2,
  /** Max candidate sources considered per claim (before admit/reject). */
  maxCandidatesPerClaim: 5,
  /** Max sources actually EXTRACTED (the expensive step) across the whole run. */
  maxExtractsTotal: 8,
  /** Concurrency limit for web provider calls. */
  webConcurrency: 2,
  /** A source older than this is flagged stale by the freshness policy. */
  freshnessStaleDays: 540,
  /** Per web request timeout (ms). */
  webTimeoutMs: 15_000,
} as const;

/** Run N async thunks with a bounded concurrency. Preserves input order. */
export async function pool<T>(
  items: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results = new Array<T>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await items[i]();
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
