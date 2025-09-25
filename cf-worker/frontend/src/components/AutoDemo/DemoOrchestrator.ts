import { DemoAnalytics } from './DemoAnalytics';
import { DemoStep } from './types';

interface DemoOrchestratorCallbacks {
  onNarration?: (text: string) => void;
  onStepStart?: (step: DemoStep, index: number) => void;
  onStepComplete?: (step: DemoStep, index: number) => void;
  onProgress?: (progress: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
  onExit?: () => void;
  onHighlightChange?: (selectors: string[]) => void;
}

interface DemoOrchestratorOptions extends DemoOrchestratorCallbacks {
  steps: DemoStep[];
  analytics?: DemoAnalytics;
  autoPauseOnInteraction?: boolean;
  manualAdvance?: boolean;
  waitTimeoutMs?: number;
}

export class DemoOrchestrator {
  private steps: DemoStep[];
  private currentStepIndex = 0;
  private isRunning = false;
  private isPaused = false;
  private analytics?: DemoAnalytics;
  private autoPauseOnInteraction?: boolean;
  private waitTimeoutMs: number;
  private resumeResolvers: Array<() => void> = [];
  private activeTimeout: number | null = null;
  private destroyed = false;
  private manualAdvance = false;
  private manualAdvanceResolvers: Array<() => void> = [];
  private manualAdvanceRequested = false;
  private isExecutingStep = false;

  private onNarration?: (text: string) => void;
  private onStepStart?: (step: DemoStep, index: number) => void;
  private onStepComplete?: (step: DemoStep, index: number) => void;
  private onProgress?: (progress: number) => void;
  private onPause?: () => void;
  private onResume?: () => void;
  private onComplete?: () => void;
  private onExit?: () => void;
  private onHighlightChange?: (selectors: string[]) => void;

  constructor(options: DemoOrchestratorOptions) {
    this.steps = options.steps;
    this.analytics = options.analytics;
    this.autoPauseOnInteraction = options.autoPauseOnInteraction;
    this.manualAdvance = options.manualAdvance ?? false;
    this.waitTimeoutMs = options.waitTimeoutMs ?? 12_000;

    this.onNarration = options.onNarration;
    this.onStepStart = options.onStepStart;
    this.onStepComplete = options.onStepComplete;
    this.onProgress = options.onProgress;
    this.onPause = options.onPause;
    this.onResume = options.onResume;
    this.onComplete = options.onComplete;
    this.onExit = options.onExit;
    this.onHighlightChange = options.onHighlightChange;

    if (typeof window !== 'undefined' && this.autoPauseOnInteraction) {
      window.addEventListener('click', this.handleUserInteraction);
      window.addEventListener('keydown', this.handleUserInteraction);
      window.addEventListener('touchstart', this.handleUserInteraction);
    }
  }

  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  getCurrentStep(): DemoStep | null {
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.steps.length) {
      return null;
    }
    return this.steps[this.currentStepIndex];
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.currentStepIndex = 0;
    this.analytics?.trackEvent({ type: 'demo_start' });

    if (this.manualAdvance) {
      this.manualAdvanceRequested = true;
    }

    await this.run();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.isPaused = false;
    this.clearHighlights();

    if (this.activeTimeout !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }

    this.resolveResumeWaiters();
    this.resolveManualAdvanceWaiters();
    this.manualAdvanceRequested = false;
    this.analytics?.trackEvent({ type: 'demo_exit' });
    this.onExit?.();
  }

  async pause(): Promise<void> {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.isPaused = true;
    if (this.activeTimeout !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
    this.analytics?.trackEvent({ type: 'demo_pause', stepId: this.getCurrentStep()?.id });
    this.onPause?.();
  }

  async resume(): Promise<void> {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.analytics?.trackEvent({ type: 'demo_resume', stepId: this.getCurrentStep()?.id });
    this.resolveResumeWaiters();
    this.onResume?.();
  }

  requestNextStep(): void {
    if (!this.manualAdvance || !this.isRunning) {
      return;
    }

    this.manualAdvanceRequested = true;
    this.resolveManualAdvanceWaiters();
  }

  goToPreviousStep(): void {
    if (!this.manualAdvance || !this.isRunning || this.isExecutingStep) {
      return;
    }

    const previousIndex = Math.max(0, this.currentStepIndex - 2);
    this.currentStepIndex = previousIndex;
    this.onProgress?.((this.currentStepIndex / this.steps.length) * 100);
    this.manualAdvanceRequested = true;
    this.resolveManualAdvanceWaiters();
  }

  async cleanup(): Promise<void> {
    this.destroyed = true;
    await this.stop();

    if (typeof window !== 'undefined') {
      window.removeEventListener('click', this.handleUserInteraction);
      window.removeEventListener('keydown', this.handleUserInteraction);
      window.removeEventListener('touchstart', this.handleUserInteraction);
    }

    await this.analytics?.flush();
  }

  private async run(): Promise<void> {
    while (this.isRunning && this.currentStepIndex < this.steps.length && !this.destroyed) {
      await this.waitWhilePaused();

      if (!this.isRunning || this.destroyed) {
        break;
      }

      if (this.manualAdvance) {
        await this.waitForManualAdvance();

        if (!this.isRunning || this.destroyed) {
          break;
        }
      }

      if (this.currentStepIndex >= this.steps.length) {
        break;
      }

      const step = this.steps[this.currentStepIndex];
      await this.executeStep(step, this.currentStepIndex);

      if (!this.isRunning || this.destroyed) {
        break;
      }

      this.currentStepIndex += 1;
      this.onProgress?.((this.currentStepIndex / this.steps.length) * 100);
    }

    if (this.isRunning && !this.destroyed) {
      this.isRunning = false;
      this.analytics?.trackEvent({ type: 'demo_complete' });
      await this.analytics?.flush();
      this.onComplete?.();
      this.clearHighlights();
    }

    this.resolveManualAdvanceWaiters();
    this.manualAdvanceRequested = false;
  }

  private async executeStep(step: DemoStep, index: number): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isExecutingStep = true;

    try {
      if (this.manualAdvance) {
        this.clearHighlights();
      }

      this.onStepStart?.(step, index);
      this.analytics?.trackEvent({ type: 'step_start', stepId: step.id });
      this.onNarration?.(step.narration);

      await step.action();

      if (!this.isRunning) {
        return;
      }

      if (step.waitForElement) {
        await this.waitForElement(step.waitForElement);
      }

      if (!this.isRunning) {
        return;
      }

      if (step.highlights?.length) {
        this.highlightElements(step.highlights);
      }

      if (!this.isRunning) {
        return;
      }

      if (this.manualAdvance) {
        if (typeof step.duration === 'number' && step.duration > 0) {
          await this.wait(Math.min(step.duration, 400));
        }
      } else {
        await this.waitForDuration(step.duration);
      }
    } finally {
      this.isExecutingStep = false;
      if (!this.manualAdvance) {
        this.clearHighlights();
      }
    }

    if (!this.isRunning) {
      return;
    }

    this.analytics?.trackEvent({ type: 'step_complete', stepId: step.id });
    this.onStepComplete?.(step, index);
  }

  private wait(ms: number): Promise<void> {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.activeTimeout = window.setTimeout(() => {
        this.activeTimeout = null;
        resolve();
      }, ms);
    });
  }

  private async waitForDuration(duration: number): Promise<void> {
    let elapsed = 0;
    const chunk = 100;

    while (elapsed < duration && this.isRunning && !this.destroyed) {
      if (this.isPaused) {
        await this.waitWhilePaused();
        continue;
      }

      const slice = Math.min(duration - elapsed, chunk);
      await this.wait(slice);
      elapsed += slice;
    }
  }

  private async waitForElement(selector: string): Promise<void> {
    if (typeof document === 'undefined') {
      return;
    }

    const start = Date.now();
    while (Date.now() - start < this.waitTimeoutMs) {
      if (document.querySelector(selector)) {
        return;
      }
      await this.wait(200);
      await this.waitWhilePaused();
    }
    console.warn(`[AutoDemo] Timed out waiting for element ${selector}`);
  }

  private highlightElements(selectors: string[]) {
    if (typeof document === 'undefined') {
      return;
    }

    selectors.forEach((selector) => {
      document
        .querySelectorAll(selector)
        .forEach((element) => element.classList.add('demo-highlight'));
    });

    this.onHighlightChange?.(selectors);
  }

  private clearHighlights() {
    if (typeof document === 'undefined') {
      return;
    }

    document
      .querySelectorAll('.demo-highlight')
      .forEach((element) => element.classList.remove('demo-highlight'));
    this.onHighlightChange?.([]);
  }

  private async waitWhilePaused(): Promise<void> {
    if (!this.isPaused) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.resumeResolvers.push(resolve);
    });
  }

  private resolveResumeWaiters() {
    this.resumeResolvers.splice(0).forEach((resolve) => resolve());
  }

  private async waitForManualAdvance(): Promise<void> {
    if (!this.manualAdvance || !this.isRunning || this.destroyed) {
      return;
    }

    if (this.manualAdvanceRequested) {
      this.manualAdvanceRequested = false;
      return;
    }

    await new Promise<void>((resolve) => {
      this.manualAdvanceResolvers.push(resolve);
    });

    this.manualAdvanceRequested = false;
  }

  private resolveManualAdvanceWaiters() {
    if (!this.manualAdvanceResolvers.length) {
      return;
    }

    this.manualAdvanceResolvers.splice(0).forEach((resolve) => resolve());
  }

  private handleUserInteraction = async (event: MouseEvent | KeyboardEvent | TouchEvent) => {
    if (!event.isTrusted) {
      return;
    }

    if (typeof window !== 'undefined') {
      const win = window as Window & { __AUTO_DEMO_SUPPRESS__?: number };
      if ((win.__AUTO_DEMO_SUPPRESS__ ?? 0) > 0) {
        return;
      }
    }

    if (!this.autoPauseOnInteraction || !this.isRunning || this.isPaused) {
      return;
    }

    await this.pause();
    this.analytics?.trackEvent({ type: 'user_interaction', stepId: this.getCurrentStep()?.id });
  };
}

