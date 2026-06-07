import {
  type ExtractedDoc,
  type SourceCandidate,
  type WebProvider,
} from "./types";

/**
 * Deterministic offline provider for tests and the guaranteed-offline demo path.
 * Synthesizes sources whose freshness/authority vary by index so the governance
 * (admit/reject) plane has real signal to act on.
 */
export class MockProvider implements WebProvider {
  readonly name = "mock";

  async search(
    query: string,
    opts?: { maxResults?: number },
  ): Promise<SourceCandidate[]> {
    const n = opts?.maxResults ?? 5;
    const slug = query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40);
    const hosts = [
      { host: "reuters.com", authority: "high", ageDays: 30 },
      { host: "techcrunch.com", authority: "high", ageDays: 120 },
      { host: "medium.com", authority: "low", ageDays: 900 },
      { host: "randomblog.wordpress.com", authority: "low", ageDays: 1500 },
      { host: "wikipedia.org", authority: "high", ageDays: 10 },
    ];
    return hosts.slice(0, n).map((h, i) => {
      const published = new Date(
        Date.UTC(2026, 5, 6) - h.ageDays * 86_400_000,
      ).toISOString();
      return {
        url: `https://${h.host}/${slug}-${i + 1}`,
        title: `${query} — coverage from ${h.host}`,
        snippet: `A ${h.authority}-authority source discussing "${query}". Published ${published.slice(0, 10)}.`,
        publishedAt: published,
      };
    });
  }

  async extract(url: string): Promise<ExtractedDoc> {
    return {
      url,
      markdown: `# Source\n\nFrom ${url}.\n\nThis page provides evidence relevant to the claim under review, with specific figures and dates a reviewer can cite.`,
      fetchedAt: new Date().toISOString(),
      status: 200,
    };
  }
}
