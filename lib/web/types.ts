/** A candidate source returned by a web search, before admit/reject. */
export interface SourceCandidate {
  url: string;
  title: string;
  snippet: string;
  /** ISO date the source was published, if the provider reports it. */
  publishedAt: string | null;
}

/** A fetched, cleaned document. */
export interface ExtractedDoc {
  url: string;
  markdown: string;
  /** ISO timestamp the fetch happened (volatile — excluded from signed payload). */
  fetchedAt: string;
  status: number;
}

/**
 * The swappable live-web layer. Nimble is the primary (sponsor) implementation;
 * a keyless Jina/DuckDuckGo provider is the build-before-key fallback; a mock
 * provider backs offline tests. The pipeline depends only on this interface.
 */
export interface WebProvider {
  readonly name: string;
  search(
    query: string,
    opts?: { maxResults?: number },
  ): Promise<SourceCandidate[]>;
  extract(url: string): Promise<ExtractedDoc>;
}

/** fetch() with an AbortController timeout. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15_000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
