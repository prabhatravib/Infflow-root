import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Download, MessageCircle } from 'lucide-react';

interface DeepDiveProps {
  selectedText: string;
  isProcessing: boolean;
  response: string | null;
  history: Array<{
    selectedText: string;
    question: string;
    response: string;
    timestamp: number;
  }>;
  onAsk: (question: string) => void;
  onClose: () => void;
}

export function DeepDive({
  selectedText,
  isProcessing,
  response,
  history,
  onAsk,
  onClose,
}: DeepDiveProps) {
  const [question, setQuestion] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isProcessing) {
      onAsk(question.trim());
      setQuestion('');
    }
  };

  const copyResponse = async () => {
    if (response) {
      try {
        await navigator.clipboard.writeText(response);
        // You could add a toast notification here
      } catch (error) {
        console.error('Failed to copy response:', error);
      }
    }
  };

  const saveResponse = () => {
    if (response) {
      const content = [
        `Deep Dive: ${selectedText}`,
        '='.repeat(50),
        '',
        `Q: ${history[history.length - 1]?.question || 'Unknown question'}`,
        '',
        `A: ${response}`,
        '',
        '---',
        `Generated on: ${new Date().toLocaleString()}`,
      ].join('\n');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deep-dive-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatResponse = (text: string) => {
    // Escape HTML
    const escaped = text.replace(/[<>&"']/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return escapeMap[match];
    });

    // Convert paragraphs
    const paragraphs = escaped.split('\n\n').filter(p => p.trim().length > 0);
    const formatted = paragraphs
      .map((p, index) => {
        const cleaned = p.replace(/^<br\s*\/>+|<br\s*\/>+$/g, '');
        const className = index === 0 ? 'first-para' : '';
        return `<p class="${className}">${cleaned.replace(/\n+/g, '<br>')}</p>`;
      })
      .join('');

    // Add syntax highlighting for code blocks
    const withCode = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Make lists look better
    const withLists = withCode.replace(/^- (.+)$/gm, '<li>$1</li>');
    const finalFormatted = withLists.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    return finalFormatted;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    
    return date.toLocaleDateString();
  };

  const relevantHistory = history.filter(item => item.selectedText === selectedText).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Deep Dive
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
            <strong>Selected:</strong>
          </div>
          <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex-1">
            {selectedText.length > 100 ? `${selectedText.substring(0, 100)}...` : selectedText}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about this selection..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!question.trim() || isProcessing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Asking...
              </>
            ) : (
              'Ask'
            )}
          </button>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600 dark:text-gray-400">Diving deep...</span>
            </div>
          </motion.div>
        )}

        {response && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: formatResponse(response) }}
            />
            
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={copyResponse}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={saveResponse}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {relevantHistory.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Previous questions ({relevantHistory.length})
            </summary>
            <div className="mt-2 space-y-2">
              {relevantHistory.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setQuestion(item.question)}
                >
                  <div className="text-sm text-gray-900 dark:text-white font-medium">
                    {item.question}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTime(item.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </motion.div>
  );
}
