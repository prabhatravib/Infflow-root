import { DemoEvent } from './types';

interface DemoAnalyticsOptions {
  flushInterval?: number;
  endpoint?: string;
}

export class DemoAnalytics {
  private sessionId: string;
  private buffer: DemoEvent[] = [];
  private history: DemoEvent[] = [];
  private startTime: number;
  private pendingFlush: Promise<void> | null = null;
  private flushInterval: number;
  private endpoint: string;

  constructor(options: DemoAnalyticsOptions = {}) {
    this.sessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `demo-${Date.now()}`;
    this.startTime = Date.now();
    this.flushInterval = options.flushInterval ?? 5;
    this.endpoint = options.endpoint ?? '/api/demo-analytics';

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.buffer.length) {
          navigator.sendBeacon?.(
            this.endpoint,
            JSON.stringify({
              sessionId: this.sessionId,
              events: this.buffer,
              metadata: this.buildMetadata(),
            })
          );
        }
      });
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getStartTime(): number {
    return this.startTime;
  }

  getEvents(): DemoEvent[] {
    return [...this.history];
  }

  async trackEvent(event: DemoEvent): Promise<void> {
    const enrichedEvent: DemoEvent = {
      ...event,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    };

    this.buffer.push(enrichedEvent);
    this.history.push(enrichedEvent);

    if (this.buffer.length >= this.flushInterval) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    if (this.pendingFlush) {
      await this.pendingFlush;
      return;
    }

    const eventsSnapshot = [...this.buffer];
    const payload = {
      sessionId: this.sessionId,
      events: eventsSnapshot,
      metadata: this.buildMetadata(),
    };

    this.pendingFlush = fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to flush demo analytics: ${response.status}`);
        }
        this.buffer = this.buffer.filter((event) => !eventsSnapshot.includes(event));
      })
      .catch((error) => {
        console.error('[AutoDemo] Analytics flush failed', error);
      })
      .finally(() => {
        this.pendingFlush = null;
      });

    await this.pendingFlush;
  }

  private buildMetadata() {
    const completed = this.history.some((event) => event.type === 'demo_complete');
    const interactionPoints = this.history.filter((event) => event.type === 'user_interaction').length;

    return {
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      duration: Date.now() - this.startTime,
      completed,
      interactionPoints,
    };
  }
}
