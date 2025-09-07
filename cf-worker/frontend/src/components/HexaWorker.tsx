import { useState, useRef, useEffect } from 'react';
import { sessionManager } from '../utils/sessionManager';

interface DiagramData {
  mermaidCode: string;
  diagramImage: string;
  prompt: string;
}

interface HexaWorkerProps {
  codeFlowStatus: 'sent' | 'not-sent';
  diagramData: DiagramData | null;
}

export const HexaWorker: React.FC<HexaWorkerProps> = ({ codeFlowStatus, diagramData }) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Subscribe to session changes
  useEffect(() => {
    const unsubscribe = sessionManager.onSessionChange((newSessionId) => {
      setSessionId(newSessionId);
      console.log('🆔 HexaWorker received session ID:', newSessionId);
    });

    const currentSessionId = sessionManager.getSessionId();
    if (currentSessionId) {
      setSessionId(currentSessionId);
    }

    return unsubscribe;
  }, []);

  // Send diagram data to iframe when it changes
  useEffect(() => {
    if (diagramData && iframeRef.current && isVoiceEnabled) {
      console.log('📤 Sending diagram data to HexaWorker iframe:', diagramData);
      
      iframeRef.current.contentWindow?.postMessage({
        type: 'diagram_data',
        data: diagramData
      }, 'https://hexa-worker.prabhatravib.workers.dev');
    }
  }, [diagramData, isVoiceEnabled]);

  const toggleVoice = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
    
    if (!isVoiceEnabled && !sessionId) {
      const newSessionId = sessionManager.generateSessionId();
      console.log('🆔 Generated session ID for voice session:', newSessionId);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Voice Status */}
      <div className="text-center">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isVoiceEnabled 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {isVoiceEnabled ? 'Voice ON' : 'Voice OFF'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {codeFlowStatus === 'sent' ? 'Code Flow Sent' : 'No Code Flow Sent'}
        </div>
      </div>

      {/* Hexagon Container */}
      <div className="relative">
        {isVoiceEnabled ? (
          <iframe
            ref={iframeRef}
            src={`https://hexa-worker.prabhatravib.workers.dev/${sessionId ? `?sessionId=${sessionId}` : ''}`}
            width="200"
            height="200"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              transition: 'opacity 0.3s ease',
              transform: 'scale(1)',
              transformOrigin: 'center',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
            title="Hexa Voice Agent"
            allow="microphone"
            onLoad={() => {
              console.log('🔄 Iframe loaded');
              if (sessionId) {
                console.log('🆔 Voice session started with session ID:', sessionId);
              }
              if (diagramData) {
                console.log('📤 Sending diagram data on iframe load:', diagramData);
                iframeRef.current?.contentWindow?.postMessage({
                  type: 'diagram_data',
                  data: diagramData
                }, 'https://hexa-worker.prabhatravib.workers.dev');
              }
            }}
          />
        ) : (
          <div 
            className="w-[200px] h-[200px] bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          >
            <div className="text-white text-sm font-medium text-center">
              <div className="text-2xl mb-2">🎤</div>
              <div>Voice Disabled</div>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button 
        onClick={toggleVoice}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          isVoiceEnabled
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
      </button>
    </div>
  );
};
