export interface AutoDemoState {
  isActive: boolean;
  currentStep: number;
  isPaused: boolean;
  hasUserInteracted: boolean;
  startTime: number;
  analyticsEvents: DemoEvent[];
}

export interface DemoStep {
  id: string;
  narration: string;
  duration: number;
  action: () => Promise<void>;
  waitForElement?: string;
  highlights?: string[];
  allowInteraction?: boolean;
}

export interface DemoScenario {
  id: string;
  name: string;
  estimatedDuration: number;
  steps: DemoStep[];
}

export type DemoEventType =
  | 'demo_start'
  | 'demo_pause'
  | 'demo_resume'
  | 'demo_complete'
  | 'demo_exit'
  | 'step_start'
  | 'step_complete'
  | 'user_interaction';

export interface DemoEvent {
  type: DemoEventType;
  stepId?: string;
  timestamp?: number;
  details?: Record<string, unknown>;
  sessionId?: string;
}
