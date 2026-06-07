import { CAPS } from "../agent/caps";
import {
  type ExtractedDoc,
  type SourceCandidate,
  type WebProvider,
  fetchWithTimeout,
} from "./types";

/**
 * Nimble (nimbleway.com) live-web provider — the sponsor integration.
 *
 * Current unified REST API: POST https://sdk.nimbleway.com/v1/{search,extract}
 * with `Authorization: Bearer <NIMBLE_API_KEY>`. (Legacy *.webit.live hosts are
 * NOT used.) Validate with a single curl before trusting in prod.
 */
const BASE = "https://sdk.nimbleway.com/v1";

interface NimbleSearchResult {
  title?: string;
  description?: string;
  url?: string;
  content?: string;
  extra_fields?: { published_date?: string };
}

export class NimbleProvider implements WebProvider {
  readonly name = "nimble";
  constructor(private readonly apiKey: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async search(
    query: string,
    opts?: { maxResults?: number },
  ): Promise<SourceCandidate[]> {
    const res = await fetchWithTimeout(`${BASE}/search`, {
      method: "POST",
      headers: this.headers(),
      timeoutMs: CAPS.webTimeoutMs,
      body: JSON.stringify({
        query,
        // "lite" is the default/free tier; "fast"/"deep" require a paid plan.
        search_depth: process.env.NIMBLE_SEARCH_DEPTH ?? "lite",
        max_results: opts?.maxResults ?? CAPS.maxCandidatesPerClaim,
        output_format: "markdown",
        country: "US",
        locale: "en",
      }),
    });
    if (!res.ok) {
      throw new Error(`nimble search ${res.status}: ${await safeText(res)}`);
    }
    const data = (await res.json()) as { results?: NimbleSearchResult[] };
    return (data.results ?? [])
      .filter((r): r is NimbleSearchResult & { url: string } => Boolean(r.url))
      .map((r) => ({
        url: r.url,
        title: r.title ?? r.url,
        snippet: (r.description ?? r.content ?? "").slice(0, 600),
        publishedAt: normalizeDate(r.extra_fields?.published_date),
      }));
  }

  async extract(url: string): Promise<ExtractedDoc> {
    const res = await fetchWithTimeout(`${BASE}/extract`, {
      method: "POST",
      headers: this.headers(),
      timeoutMs: CAPS.webTimeoutMs,
      body: JSON.stringify({ url, formats: ["markdown"], render: false }),
    });
    if (!res.ok) {
      throw new Error(`nimble extract ${res.status}: ${await safeText(res)}`);
    }
    const data = (await res.json()) as {
      data?: { markdown?: string };
      status_code?: number;
    };
    return {
      url,
      markdown: data.data?.markdown ?? "",
      fetchedAt: new Date().toISOString(),
      status: data.status_code ?? res.status,
    };
  }
}

function normalizeDate(d?: string): string | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "<no body>";
  }
}
