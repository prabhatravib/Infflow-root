import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer } from 'lucide-react';

interface SelectionIndicatorProps {
  selectedText: string;
  hasSelection: boolean;
  onClear: () => void;
}

export function SelectionIndicator({ selectedText, hasSelection, onClear }: SelectionIndicatorProps) {
  if (!hasSelection) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-200 dark:border-gray-700 mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <MousePointer className="w-4 h-4" />
            <span className="text-sm font-medium">Selected:</span>
          </div>
          <div className="flex-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
            {selectedText.length > 80 ? `${selectedText.substring(0, 80)}...` : selectedText}
          </div>
          <button
            onClick={onClear}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Clear selection"
          >
            ×
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
