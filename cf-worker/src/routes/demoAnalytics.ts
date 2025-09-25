import { json } from '../utils';

export interface Env {
  DEMO_ANALYTICS?: KVNamespace;
  SLACK_WEBHOOK?: string;
}

interface DemoAnalyticsPayload {
  sessionId?: string;
  events?: unknown[];
  metadata?: Record<string, unknown>;
}

export async function handleDemoAnalytics(request: Request, env: Env): Promise<Response> {
  try {
    const payload = (await request.json()) as DemoAnalyticsPayload;
    const sessionId = payload.sessionId || `demo-${Date.now()}`;
    const record = {
      sessionId,
      events: Array.isArray(payload.events) ? payload.events : [],
      metadata: payload.metadata ?? {},
      receivedAt: Date.now(),
      userAgent: request.headers.get('user-agent') ?? undefined,
    };

    if (env.DEMO_ANALYTICS) {
      try {
        await env.DEMO_ANALYTICS.put(
          `demo:${sessionId}:${record.receivedAt}`,
          JSON.stringify(record),
          { expirationTtl: 60 * 60 * 24 * 30 }
        );
      } catch (kvError) {
        console.error('[AutoDemo] Failed to persist analytics to KV', kvError);
      }
    }

    if (record.metadata && (record.metadata as any).completed && env.SLACK_WEBHOOK) {
      const text = `🎉 AutoDemo completed for session ${sessionId} after ${record.metadata?.duration ?? 'unknown'}ms`;
      try {
        await fetch(env.SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
      } catch (slackError) {
        console.warn('[AutoDemo] Failed to notify Slack', slackError);
      }
    }

    return json({ success: true });
  } catch (error) {
    console.error('[AutoDemo] Failed to process demo analytics payload', error);
    return json({ success: false, detail: 'Invalid analytics payload' }, 400);
  }
}
