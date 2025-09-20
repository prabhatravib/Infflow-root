// worker/src/routes/nodeSearch.ts
import type { NodeSearchRequest, NodeSearchResponse } from '../types';

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

async function braveSearch(env: Env, q: string) {
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
}

export async function handleNodeSearch(request: Request, env: Env, _ctx: any) {
  const body = await request.json() as NodeSearchRequest;
  const attempts = assembleQueries(body);
  let items: any[] = [];
  let used = "";
  for (const q of attempts) {
    const { data } = await braveSearch(env, q);
    const raw = data?.web?.results || data?.results || [];
    if (Array.isArray(raw) && raw.length) {
      items = raw.slice(0, 5);
      used = q;
      break;
    }
  }
  const mapped = items.map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: stripHtmlTags(r.description),
    favicon: r.profile?.image?.url ?? null,
  }));
  return new Response(JSON.stringify({ items: mapped, debug: { attempts, used: used || null } } as NodeSearchResponse), { 
    headers: { 
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
    }
  });
}
