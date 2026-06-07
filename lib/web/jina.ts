import { CAPS } from "../agent/caps";
import {
  type ExtractedDoc,
  type SourceCandidate,
  type WebProvider,
  fetchWithTimeout,
} from "./types";

/**
 * Keyless fallback provider so the app builds and demos before a Nimble key
 * lands, and degrades gracefully on stage instead of hard-failing.
 *
 *  - extract: r.jina.ai is keyless (returns clean markdown for any URL).
 *  - search:  s.jina.ai now requires a key (401 keyless, verified 2026-06-06),
 *             so without JINA_API_KEY we fall back to DuckDuckGo HTML parsing.
 */
const UA =
  "algorithm.reviews/1.0 (https://algorithm.reviews; fact-checking agent)";

export class JinaProvider implements WebProvider {
  readonly name = "web-fallback";
  constructor(private readonly jinaKey?: string) {}

  async search(
    query: string,
    opts?: { maxResults?: number },
  ): Promise<SourceCandidate[]> {
    const max = opts?.maxResults ?? CAPS.maxCandidatesPerClaim;
    const results: SourceCandidate[] = [];
    // Wikipedia first: keyless, real, and (unlike DuckDuckGo) reliably reachable
    // from a serverless datacenter IP.
    try {
      results.push(...(await this.searchWikipedia(query, max)));
    } catch {
      /* continue to broader web */
    }
    // Broader web: Jina search if a key is present, else best-effort DuckDuckGo.
    if (results.length < max) {
      try {
        const more = this.jinaKey
          ? await this.searchJina(query, max)
          : await this.searchDuckDuckGo(query, max);
        results.push(...more);
      } catch {
        /* Wikipedia results (if any) still stand */
      }
    }
    // de-dupe by normalized url
    const seen = new Set<string>();
    return results
      .filter((r) => {
        const k = r.url.replace(/[#?].*$/, "").replace(/\/$/, "");
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, max);
  }

  private async searchWikipedia(
    query: string,
    max: number,
  ): Promise<SourceCandidate[]> {
    const u = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${max}&srprop=snippet|timestamp&origin=*`;
    const res = await fetchWithTimeout(u, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      timeoutMs: CAPS.webTimeoutMs,
    });
    if (!res.ok) throw new Error(`wikipedia search ${res.status}`);
    const json = (await res.json()) as {
      query?: { search?: Array<{ title: string; snippet?: string; timestamp?: string }> };
    };
    return (json.query?.search ?? []).map((r) => ({
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      title: r.title,
      snippet: stripTags(r.snippet ?? "").slice(0, 600),
      publishedAt: normalizeDate(r.timestamp),
    }));
  }

  private async searchJina(
    query: string,
    max: number,
  ): Promise<SourceCandidate[]> {
    const res = await fetchWithTimeout(
      `https://s.jina.ai/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${this.jinaKey}`,
          Accept: "application/json",
          "X-Respond-With": "no-content",
        },
        timeoutMs: CAPS.webTimeoutMs,
      },
    );
    if (!res.ok) throw new Error(`jina search ${res.status}`);
    const json = (await res.json()) as {
      data?: Array<{
        title?: string;
        url?: string;
        description?: string;
        content?: string;
        date?: string;
      }>;
    };
    return (json.data ?? [])
      .filter((r): r is { url: string } & Record<string, string> =>
        Boolean(r.url),
      )
      .slice(0, max)
      .map((r) => ({
        url: r.url,
        title: r.title ?? r.url,
        snippet: (r.description ?? r.content ?? "").slice(0, 600),
        publishedAt: normalizeDate(r.date),
      }));
  }

  private async searchDuckDuckGo(
    query: string,
    max: number,
  ): Promise<SourceCandidate[]> {
    const res = await fetchWithTimeout(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; algorithm.reviews/1.0; +https://algorithm.reviews)",
        },
        timeoutMs: CAPS.webTimeoutMs,
      },
    );
    if (!res.ok) throw new Error(`ddg search ${res.status}`);
    const html = await res.text();
    const out: SourceCandidate[] = [];
    // result anchors: <a ... class="result__a" href="...">Title</a>
    const anchorRe =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(html)) && out.length < max) {
      const url = decodeDdgHref(m[1]);
      if (!url) continue;
      out.push({
        url,
        title: stripTags(m[2]).slice(0, 200),
        snippet: "",
        publishedAt: null,
      });
    }
    // best-effort snippets
    const snipRe =
      /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let i = 0;
    let s: RegExpExecArray | null;
    while ((s = snipRe.exec(html)) && i < out.length) {
      out[i].snippet = stripTags(s[1]).slice(0, 600);
      i++;
    }
    return out;
  }

  async extract(url: string): Promise<ExtractedDoc> {
    // Wikipedia REST summary is fast, keyless, and reliable from a datacenter.
    if (/(^|\.)wikipedia\.org$/i.test(safeHost(url)) && url.includes("/wiki/")) {
      try {
        return await this.extractWikipedia(url);
      } catch {
        /* fall through to the general reader */
      }
    }
    const headers: Record<string, string> = { "X-Return-Format": "markdown" };
    if (this.jinaKey) headers.Authorization = `Bearer ${this.jinaKey}`;
    const res = await fetchWithTimeout(`https://r.jina.ai/${url}`, {
      headers,
      timeoutMs: CAPS.webTimeoutMs,
    });
    if (!res.ok) throw new Error(`jina reader ${res.status}`);
    const markdown = await res.text();
    return {
      url,
      markdown,
      fetchedAt: new Date().toISOString(),
      status: res.status,
    };
  }

  private async extractWikipedia(url: string): Promise<ExtractedDoc> {
    const title = decodeURIComponent(url.split("/wiki/")[1] ?? "");
    // Full-article plaintext (not just the lead summary) so specific facts —
    // heights, dates, statistics — are present in the admitted evidence.
    const u = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&origin=*`;
    const res = await fetchWithTimeout(u, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      timeoutMs: CAPS.webTimeoutMs,
    });
    if (!res.ok) throw new Error(`wikipedia extract ${res.status}`);
    const json = (await res.json()) as {
      query?: { pages?: Record<string, { title?: string; extract?: string }> };
    };
    const page = Object.values(json.query?.pages ?? {})[0];
    return {
      url,
      markdown: `# ${page?.title ?? title}\n\n${(page?.extract ?? "").slice(0, 6000)}`,
      fetchedAt: new Date().toISOString(),
      status: res.status,
    };
  }
}

function decodeDdgHref(href: string): string | null {
  try {
    // DDG wraps results as //duckduckgo.com/l/?uddg=<encoded>&...
    const u = href.startsWith("//") ? `https:${href}` : href;
    const parsed = new URL(u, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return parsed.protocol.startsWith("http") ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(d?: string): string | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}
