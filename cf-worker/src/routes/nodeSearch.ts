// worker/src/routes/nodeSearch.ts
export interface Env {
  BRAVE_SEARCH_API: string;
}

export async function braveSearch(q: string, env: Env): Promise<Response> {
  console.log('🔥 [braveSearch] FUNCTION CALLED with query:', q);
  console.log('[braveSearch] API key available:', !!env.BRAVE_SEARCH_API);
  console.log('[braveSearch] API key value:', env.BRAVE_SEARCH_API ? 'SET' : 'NOT SET');
  
  // Check if API key is available
  if (!env.BRAVE_SEARCH_API) {
    console.error('[braveSearch] ERROR: BRAVE_SEARCH_API environment variable is not set!');
    return new Response(JSON.stringify({ 
      error: "BRAVE_SEARCH_API environment variable is not configured",
      details: "Please set the BRAVE_SEARCH_API secret in your Cloudflare Worker environment"
    }), {
      status: 500,
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }
  
  const params = new URLSearchParams({
    q,
    count: "5",
    safesearch: "moderate",
  });
  
  const url = `https://api.search.brave.com/res/v1/web/search?${params}`;
  console.log('[braveSearch] API URL:', url);
  console.log('[braveSearch] Using API key:', env.BRAVE_SEARCH_API.substring(0, 10) + '...');

  const cache = caches.default as any;
  const cacheKey = new Request(url, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) {
    console.log('[braveSearch] Returning cached result');
    return cached;
  }

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "x-subscription-token": env.BRAVE_SEARCH_API,
    },
  });
  
  console.log('[braveSearch] API response status:', resp.status);
  console.log('[braveSearch] API response headers:', Object.fromEntries(resp.headers.entries()));

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error('[braveSearch] API ERROR:', {
      status: resp.status,
      statusText: resp.statusText,
      responseText: text,
      url: url
    });
    
    return new Response(JSON.stringify({ 
      error: "Brave Search API Error",
      status: resp.status,
      statusText: resp.statusText,
      details: text,
      url: url
    }), {
      status: resp.status,
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  const data = await resp.json();
  
  // Brave Search API returns actual results in web.results structure
  const items = data?.web?.results?.slice(0, 5).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
    favicon: r.profile?.image?.url ?? null,
  })) ?? [];
    
  console.log('[braveSearch] Processed items:', items.length, 'results');
  
  // If no results, return empty array with debug info
  if (items.length === 0) {
    console.warn('[braveSearch] No results from API');
    return new Response(JSON.stringify({ 
      items: [],
      debug: {
        query: q,
        apiResponse: data,
        message: "No results returned from Brave Search API"
      }
    }), {
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  const out = new Response(JSON.stringify({ items }), {
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
    },
  });

  out.headers.set("Cache-Control", "max-age=300");
  await cache.put(cacheKey, out.clone());
  return out;
}
