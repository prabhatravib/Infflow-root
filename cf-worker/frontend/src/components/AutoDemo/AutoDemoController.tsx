import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { COMPLETE_DEMO_FLOW } from './scenarios/CompleteDemo';
import { AutoDemoOverlay } from './AutoDemoOverlay';
import { DemoAnalytics } from './DemoAnalytics';
import { DemoOrchestrator } from './DemoOrchestrator';
import { AutoDemoState, DemoScenario, DemoStep } from './types';

interface AutoDemoControllerProps {
  isActive: boolean;
  scenario?: DemoScenario;
  onExit: () => void;
  onComplete?: () => void;
  onNarration?: (text: string | null) => void;
  autoStartDelay?: number;
}

const DEFAULT_STATE: AutoDemoState = {
  isActive: false,
  currentStep: 0,
  isPaused: false,
  hasUserInteracted: false,
  startTime: 0,
  analyticsEvents: [],
};

export function AutoDemoController({
  isActive,
  scenario,
  onExit,
  onComplete,
  onNarration,
  autoStartDelay = 2200,
}: AutoDemoControllerProps) {
  const [state, setState] = useState<AutoDemoState>(DEFAULT_STATE);
  const [progress, setProgress] = useState<number>(0);
  const [currentNarration, setCurrentNarration] = useState<string | null>(null);
  const [isPriming, setIsPriming] = useState<boolean>(false);
  const [awaitingAdvance, setAwaitingAdvance] = useState<boolean>(false);

  const orchestratorRef = useRef<DemoOrchestrator | null>(null);
  const analyticsRef = useRef<DemoAnalytics | null>(null);
  const primeTimeoutRef = useRef<number | null>(null);
  const hasExitedRef = useRef<boolean>(false);

  const activeScenario = useMemo<DemoScenario>(() => scenario ?? COMPLETE_DEMO_FLOW, [scenario]);

  useEffect(() => {
    if (!isActive) {
      cleanupOrchestrator();
      setState((prev) => ({ ...prev, isActive: false, isPaused: false }));
      setProgress(0);
      setCurrentNarration(null);
      setIsPriming(false);
      setAwaitingAdvance(false);
      onNarration?.(null);
      return;
    }

    hasExitedRef.current = false;
    setIsPriming(true);
    const analytics = new DemoAnalytics();
    analyticsRef.current = analytics;

    setState({
      isActive: true,
      currentStep: 0,
      isPaused: false,
      hasUserInteracted: false,
      startTime: Date.now(),
      analyticsEvents: analytics.getEvents(),
    });

    const startDemo = () => {
      if (!isActive || hasExitedRef.current) {
        return;
      }
      setIsPriming(false);
      setAwaitingAdvance(false);

      const orchestrator = new DemoOrchestrator({
        steps: activeScenario.steps,
        analytics,
        autoPauseOnInteraction: false,
        manualAdvance: true,
        onNarration: handleNarration,
        onStepStart: handleStepStart,
        onStepComplete: handleStepComplete,
        onProgress: setProgress,
        onPause: handlePause,
        onResume: handleResume,
        onComplete: handleComplete,
        onExit: handleInternalExit,
      });

      orchestratorRef.current = orchestrator;
      void orchestrator.start();
    };

    if (typeof window !== 'undefined') {
      primeTimeoutRef.current = window.setTimeout(startDemo, autoStartDelay);
    } else {
      startDemo();
    }

    return () => {
      if (primeTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(primeTimeoutRef.current);
        primeTimeoutRef.current = null;
      }
      cleanupOrchestrator();
      analyticsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, activeScenario.id]);

  const cleanupOrchestrator = () => {
    if (!orchestratorRef.current) {
      return;
    }

    if (!hasExitedRef.current) {
      void orchestratorRef.current.cleanup();
    }

    orchestratorRef.current = null;
    hasExitedRef.current = false;
    setAwaitingAdvance(false);
  };

  const refreshAnalyticsState = () => {
    const analytics = analyticsRef.current;
    if (!analytics) {
      return;
    }
    setState((prev) => ({ ...prev, analyticsEvents: analytics.getEvents() }));
  };

  const handleNarration = (text: string) => {
    setCurrentNarration(text);
    onNarration?.(text);
    refreshAnalyticsState();
  };

  const handleStepStart = (_step: DemoStep, index: number) => {
    setState((prev) => ({ ...prev, currentStep: index, isPaused: false }));
    setAwaitingAdvance(false);
    refreshAnalyticsState();
  };

  const handleStepComplete = () => {
    setAwaitingAdvance(true);
    refreshAnalyticsState();
  };

  const handlePause = () => {
    setState((prev) => ({ ...prev, isPaused: true, hasUserInteracted: true }));
    refreshAnalyticsState();
  };

  const handleResume = () => {
    setState((prev) => ({ ...prev, isPaused: false }));
    refreshAnalyticsState();
  };

  const handleComplete = () => {
    refreshAnalyticsState();
    setAwaitingAdvance(false);
    onComplete?.();
    if (!hasExitedRef.current) {
      handleInternalExit();
    }
  };

  const handleInternalExit = () => {
    if (hasExitedRef.current) {
      return;
    }

    hasExitedRef.current = true;
    refreshAnalyticsState();
    setAwaitingAdvance(false);
    setState((prev) => ({ ...prev, isActive: false }));
    setCurrentNarration(null);
    setProgress(100);
    onNarration?.(null);
    void analyticsRef.current?.flush();
    onExit();
  };

  const handleManualExit = () => {
    setAwaitingAdvance(false);
    if (orchestratorRef.current) {
      void orchestratorRef.current.stop();
    } else {
      handleInternalExit();
    }
  };

  const handleManualNext = () => {
    if (!awaitingAdvance) {
      return;
    }

    setAwaitingAdvance(false);
    orchestratorRef.current?.requestNextStep();
  };

  const handleManualBack = () => {
    if (!awaitingAdvance || state.currentStep <= 0) {
      return;
    }

    setAwaitingAdvance(false);
    orchestratorRef.current?.goToPreviousStep();
  };

  return (
    <>
      <AutoDemoOverlay
        isActive={state.isActive}
        currentStep={state.currentStep}
        totalSteps={activeScenario.steps.length}
        progress={progress}
        narration={currentNarration}
        onBack={handleManualBack}
        onNext={handleManualNext}
        onExit={handleManualExit}
        canGoBack={awaitingAdvance && state.currentStep > 0}
        canGoNext={awaitingAdvance}
      />

      <AnimatePresence>
        {isPriming && (
          <motion.div
            key="autodemo-spinner"
            className="fixed inset-0 z-[55] pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-8 py-6 shadow-2xl flex flex-col items-center gap-3 text-gray-700 dark:text-gray-200">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium uppercase tracking-wide text-purple-600 dark:text-purple-300">
                AutoDemo Revving up...
              </p>
              <p className="text-xs text-center max-w-xs text-gray-500 dark:text-gray-400">
                Cokking the visuals and voice agent....
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
