// worker/src/routes/nodeSearch.ts
import type { NodeSearchRequest, NodeSearchResponse } from '../types';
import { createTimer } from '../timing';

export interface Env {
  BRAVE_SEARCH_API: string;
}

function clean(s: string) {
  return (s || "")
    .replace(/[^\p{L}\p{N}\s:''-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlTags(text: string) {
  return (text || "")
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with regular space
    .replace(/&amp;/g, "&") // Replace &amp; with &
    .replace(/&lt;/g, "<") // Replace &lt; with <
    .replace(/&gt;/g, ">") // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .trim();
}

function assembleQueries(b: NodeSearchRequest) {
  const entity = clean(b.entity || "");
  const baseQ = clean(b.query || "");
  const phrase = clean(b.phrase || "");
  const theme = clean(b.theme || "");
  const keywords = (b.keywords || []).map(clean).filter(Boolean);
  const search = clean(b.search || "");

  const attempts: string[] = [];
  if (search) attempts.push([entity, search].filter(Boolean).join(" "));
  if (!search && (theme || keywords.length)) {
    attempts.push([entity, theme, ...keywords].filter(Boolean).join(" "));
  }
  if (phrase) attempts.push([entity || baseQ, phrase].filter(Boolean).join(" "));
  attempts.push(entity || baseQ); // final fallback
  return attempts.filter((q, i, a) => q && a.indexOf(q) === i);
}

async function braveSearch(env: Env, q: string, timer: any) {
  return await timer.timeStep(`brave_search_${q.substring(0, 20)}`, async () => {
    const params = new URLSearchParams({ q, count: "5", country: "us", safesearch: "moderate" });
    const resp = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-subscription-token": env.BRAVE_SEARCH_API,
      },
    });
    const data = await resp.json();
    return { resp, data };
  }, { query: q, query_length: q.length });
}

export async function handleNodeSearch(request: Request, env: Env, _ctx: any) {
  const timer = createTimer();
  timer.markStart("request_validation");
  
  try {
    const body = await timer.timeStep("parse_request_body", async () => {
      return await request.json() as NodeSearchRequest;
    }, { 
      content_length: request.headers.get('content-length') || 'unknown' 
    });

    const attempts = await timer.timeStep("assemble_queries", async () => {
      return assembleQueries(body);
    }, { 
      has_entity: !!body.entity,
      has_phrase: !!body.phrase,
      has_theme: !!body.theme,
      keywords_count: body.keywords?.length || 0,
      has_search: !!body.search
    });

    console.log(`🔍 [${timer.getRequestId()}] Node search request - Query: "${body.query}", Attempts: ${attempts.length}`);

    let items: any[] = [];
    let used = "";
    
    const searchResults = await timer.timeStep("search_execution", async () => {
      for (const q of attempts) {
        const { data } = await braveSearch(env, q, timer);
        const raw = data?.web?.results || data?.results || [];
        if (Array.isArray(raw) && raw.length) {
          return { items: raw.slice(0, 5), used: q };
        }
      }
      return { items: [], used: "" };
    }, { 
      attempts_count: attempts.length,
      attempts: attempts.map(q => q.substring(0, 30))
    });

    items = searchResults.items;
    used = searchResults.used;

    const mapped = await timer.timeStep("response_mapping", async () => {
      return items.map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: stripHtmlTags(r.description),
        favicon: r.profile?.image?.url ?? null,
      }));
    }, { 
      results_count: items.length 
    });

    timer.logPerformanceReport();

    return new Response(JSON.stringify({ 
      items: mapped, 
      debug: { 
        attempts, 
        used: used || null,
        timing: {
          request_id: timer.getRequestId(),
          total_time: timer.getTotalTime(),
          steps: timer.getTimings().filter(t => t.duration > 0)
        }
      } 
    } as NodeSearchResponse), { 
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
      }
    });

  } catch (error) {
    timer.markEnd("request_validation", { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
    timer.logPerformanceReport();
    
    console.error(`❌ [${timer.getRequestId()}] Node search error:`, error);
    throw error;
  }
}
