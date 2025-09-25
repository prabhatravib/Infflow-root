import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react';

interface AutoDemoOverlayProps {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  progress: number;
  narration: string | null;
  onBack: () => void;
  onNext: () => void;
  onExit: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
}

export function AutoDemoOverlay({
  isActive,
  currentStep,
  totalSteps,
  progress,
  narration,
  onBack,
  onNext,
  onExit,
  canGoBack,
  canGoNext,
}: AutoDemoOverlayProps) {
  const isFinalStep = currentStep >= totalSteps - 1;
  const nextLabel = isFinalStep ? 'Finish' : 'Next';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60]"
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-4 min-w-[360px]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
              <span className="font-semibold">AutoDemo Mode</span>
            </div>

            <div className="hidden md:flex flex-col text-xs text-white/80 leading-tight">
              <span>
                Step {Math.min(currentStep + 1, totalSteps)} / {totalSteps}
              </span>
              {narration && <span className="truncate max-w-[200px]">{narration}</span>}
            </div>

            <div className="w-36 bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                disabled={!canGoBack}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/30 transition-all duration-200 ${
                  canGoBack ? 'hover:bg-white/20 focus:bg-white/25 focus:outline-none' : 'opacity-40 cursor-not-allowed'
                }`}
                aria-label="Go to previous step"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-medium">Back</span>
              </button>

              <button
                onClick={onNext}
                disabled={!canGoNext}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-purple-600 shadow-sm text-xs font-semibold transition-all duration-200 ${
                  canGoNext ? 'hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/60' : 'opacity-60 cursor-not-allowed'
                }`}
                aria-label={isFinalStep ? 'Finish demo' : 'Advance to next step'}
              >
                <span className="hidden sm:inline">{nextLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExit}
                className="hover:bg-white/20 p-1.5 rounded-lg"
                aria-label="Exit demo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
