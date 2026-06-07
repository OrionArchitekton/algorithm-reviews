import { JinaProvider } from "./jina";
import { MockProvider } from "./mock";
import { NimbleProvider } from "./nimble";
import {
  type ExtractedDoc,
  type SourceCandidate,
  type WebProvider,
} from "./types";

export type { ExtractedDoc, SourceCandidate, WebProvider } from "./types";

/**
 * Tries the primary provider first; on any error falls back to the secondary,
 * so a Nimble outage or rate-limit on stage degrades to keyless Jina/DDG instead
 * of a dead demo. The receipt records which provider actually answered.
 */
class FallbackProvider implements WebProvider {
  readonly name: string;
  constructor(
    private readonly primary: WebProvider,
    private readonly fallback: WebProvider,
  ) {
    this.name = `${primary.name}+${fallback.name}`;
  }
  async search(
    query: string,
    opts?: { maxResults?: number },
  ): Promise<SourceCandidate[]> {
    try {
      const r = await this.primary.search(query, opts);
      if (r.length > 0) return r;
      return await this.fallback.search(query, opts);
    } catch {
      return this.fallback.search(query, opts);
    }
  }
  async extract(url: string): Promise<ExtractedDoc> {
    try {
      return await this.primary.extract(url);
    } catch {
      return this.fallback.extract(url);
    }
  }
}

/**
 * Resolve the web provider from env:
 *   WEB_PROVIDER=mock|nimble|jina|auto (default: auto)
 *   auto → Nimble primary (if NIMBLE_API_KEY) with Jina fallback; else Jina.
 */
export function getWebProvider(): WebProvider {
  const mode = (process.env.WEB_PROVIDER ?? "auto").toLowerCase();
  const nimbleKey = process.env.NIMBLE_API_KEY;
  const jinaKey = process.env.JINA_API_KEY;

  if (mode === "mock") return new MockProvider();
  if (mode === "jina") return new JinaProvider(jinaKey);
  if (mode === "nimble") {
    if (!nimbleKey) throw new Error("WEB_PROVIDER=nimble but NIMBLE_API_KEY unset");
    return new NimbleProvider(nimbleKey);
  }
  // auto
  if (nimbleKey) {
    return new FallbackProvider(
      new NimbleProvider(nimbleKey),
      new JinaProvider(jinaKey),
    );
  }
  return new JinaProvider(jinaKey);
}
