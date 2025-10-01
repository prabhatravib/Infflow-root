import { describeHandler, deepDiveHandler, clusterHandler } from './handlers';
import { json, toMessage } from './utils';
import { handleNodeSearch, Env as NodeSearchEnv } from './routes/nodeSearch';
import { handleDemoAnalytics, Env as DemoAnalyticsEnv } from './routes/demoAnalytics';

export interface Env extends NodeSearchEnv, DemoAnalyticsEnv {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  ASSETS: {
    fetch: (req: Request) => Promise<Response>;
    get: (path: string) => Promise<Response | null>;
  };
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    console.log("ðŸš€ Worker request received:", {
      method: request.method,
      pathname: pathname,
      url: url.toString()
    });

    try {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          },
        });
      }

      if (pathname === "/api/node-search" && request.method === "POST") {
        return handleNodeSearch(request, env, {} as any);
      }

      if (pathname === '/api/demo-analytics' && request.method === 'POST') {
        return handleDemoAnalytics(request, env);
      }

      if (request.method === 'POST' && pathname === '/api/describe') {
        console.log("ðŸ”µ Handling describe request...");
        const body = await request.json();
        console.log("ðŸ”µ Request body:", JSON.stringify(body, null, 2));
        
        return describeHandler(body as any, env as any);
      }

      if (request.method === 'POST' && pathname === '/api/deep-dive') {
        console.log("ðŸ”µ Handling deep-dive request...");
        const body = await request.json();
        return deepDiveHandler(body as any, env as any);
      }

      if (request.method === 'POST' && pathname === '/api/cluster') {
        console.log('Handling cluster request...');
        const body = await request.json();
        return clusterHandler(body as any, env as any);
      }

      // Serve static assets configured in wrangler.toml [assets]
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse && assetResponse.status !== 404) return assetResponse;

      // SPA fallback
      const indexUrl = new URL('/index.html', url.origin);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    } catch (err) {
      console.error("âŒ Worker error:", err);
      console.error("âŒ Error stack:", err instanceof Error ? err.stack : 'No stack trace');
      return json({ 
        success: false, 
        detail: toMessage(err), 
        error_type: 'internal_error',
        debug_info: err instanceof Error ? err.stack : String(err)
      }, 500);
    }
  },
};
