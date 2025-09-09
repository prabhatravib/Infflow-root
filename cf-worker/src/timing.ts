/**
 * Performance timing utilities for tracking end-to-end request performance
 */

export interface TimingResult {
  step: string;
  duration: number;
  timestamp: number;
  details?: Record<string, any>;
}

export class PerformanceTimer {
  private startTime: number;
  private timings: TimingResult[] = [];
  private requestId: string;

  constructor(requestId?: string) {
    this.startTime = performance.now();
    this.requestId = requestId || this.generateRequestId();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Mark the start of a timing step
   */
  markStart(step: string, details?: Record<string, any>): void {
    const timing: TimingResult = {
      step,
      duration: 0,
      timestamp: performance.now(),
      details
    };
    this.timings.push(timing);
  }

  /**
   * Mark the end of the most recent timing step
   */
  markEnd(step: string, details?: Record<string, any>): number {
    const timing = this.timings.find(t => t.step === step && t.duration === 0);
    if (!timing) {
      console.warn(`No start timing found for step: ${step}`);
      return 0;
    }

    const duration = performance.now() - timing.timestamp;
    timing.duration = duration;
    if (details) {
      timing.details = { ...timing.details, ...details };
    }

    console.log(`⏱️  [${this.requestId}] ${step}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Time a complete step (start and end in one call)
   */
  async timeStep<T>(
    step: string, 
    operation: () => Promise<T>, 
    details?: Record<string, any>
  ): Promise<T> {
    this.markStart(step, details);
    try {
      const result = await operation();
      this.markEnd(step, { success: true });
      return result;
    } catch (error) {
      this.markEnd(step, { success: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get total elapsed time since timer creation
   */
  getTotalTime(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Get all timing results
   */
  getTimings(): TimingResult[] {
    return [...this.timings];
  }

  /**
   * Get timing summary for logging
   */
  getSummary(): string {
    const total = this.getTotalTime();
    const steps = this.timings
      .filter(t => t.duration > 0)
      .map(t => `${t.step}: ${t.duration.toFixed(2)}ms`)
      .join(', ');
    
    return `[${this.requestId}] Total: ${total.toFixed(2)}ms | Steps: ${steps}`;
  }

  /**
   * Log detailed performance report
   */
  logPerformanceReport(): void {
    const total = this.getTotalTime();
    console.log(`\n🚀 PERFORMANCE REPORT [${this.requestId}]`);
    console.log(`📊 Total Request Time: ${total.toFixed(2)}ms`);
    console.log(`📈 Step Breakdown:`);
    
    this.timings
      .filter(t => t.duration > 0)
      .forEach(timing => {
        const percentage = ((timing.duration / total) * 100).toFixed(1);
        const details = timing.details ? ` | ${JSON.stringify(timing.details)}` : '';
        console.log(`   • ${timing.step}: ${timing.duration.toFixed(2)}ms (${percentage}%)${details}`);
      });
    
    console.log(`\n`);
  }

  /**
   * Get request ID for correlation
   */
  getRequestId(): string {
    return this.requestId;
  }
}

/**
 * Create a new performance timer
 */
export function createTimer(requestId?: string): PerformanceTimer {
  return new PerformanceTimer(requestId);
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}
