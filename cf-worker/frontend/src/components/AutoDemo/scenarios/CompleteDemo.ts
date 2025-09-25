import { DemoScenario } from '../types';
import { DEMO_SCRIPT } from '../demoScript';

export const COMPLETE_DEMO_FLOW: DemoScenario = {
  id: 'complete_investor_demo',
  name: 'Full Product Tour',
  estimatedDuration: DEMO_SCRIPT.reduce((total, step) => total + step.duration, 0),
  steps: DEMO_SCRIPT,
};
