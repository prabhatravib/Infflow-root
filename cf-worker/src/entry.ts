import { describeHandler, deepDiveHandler } from './handlers';
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

    try {
      if (request.method === 'POST' && pathname === '/api/describe') {
        const body = await request.json();
        return describeHandler(body as any, env as any);
      }

      if (request.method === 'POST' && pathname === '/api/deep-dive') {
        const body = await request.json();
        return deepDiveHandler(body as any, env as any);
      }

      // Serve static assets configured in wrangler.toml [assets]
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse && assetResponse.status !== 404) return assetResponse;

      // SPA fallback
      const indexUrl = new URL('/index.html', url.origin);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    } catch (err) {
      return json({ success: false, detail: toMessage(err), error_type: 'internal_error' }, 500);
    }
  },
};
