import { describeHandler, deepDiveHandler, clusterHandler } from './handlers';
import { json, toMessage } from './utils';

export interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    console.log("🚀 Worker request received:", {
      method: request.method,
      pathname: pathname,
      url: url.toString()
    });

    try {
      if (request.method === 'POST' && pathname === '/api/describe') {
        console.log("🔵 Handling describe request...");
        const body = await request.json();
        console.log("🔵 Request body:", JSON.stringify(body, null, 2));
        
        return describeHandler(body as any, env as any);
      }

      if (request.method === 'POST' && pathname === '/api/deep-dive') {
        console.log("🔵 Handling deep-dive request...");
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
      console.error("❌ Worker error:", err);
      console.error("❌ Error stack:", err instanceof Error ? err.stack : 'No stack trace');
      return json({ 
        success: false, 
        detail: toMessage(err), 
        error_type: 'internal_error',
        debug_info: err instanceof Error ? err.stack : String(err)
      }, 500);
    }
  },
};
