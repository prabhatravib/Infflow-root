import { useState, useRef, useEffect } from 'react';
import { sessionManager } from '../utils/sessionManager';
import { Minus, Plus } from 'lucide-react';

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

  // Send diagram data to voice worker via API when it changes (regardless of voice state)
  const lastSentDataRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (diagramData) {
      // Create a hash to prevent duplicate sends (include sessionId in hash)
      const dataHash = JSON.stringify({
        mermaidCode: diagramData.mermaidCode,
        prompt: diagramData.prompt,
        sessionId: sessionId || 'default'
      });
      
      if (dataHash === lastSentDataRef.current) {
        console.log('⏭️ Skipping duplicate diagram data send');
        return;
      }
      
      lastSentDataRef.current = dataHash;
      console.log('📤 Sending diagram data to voice worker via API:', diagramData);
      
      // Send diagram data to voice worker via API call
      fetch('https://hexa-worker.prabhatravib.workers.dev/api/external-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mermaidCode: diagramData.mermaidCode,
          diagramImage: diagramData.diagramImage,
          prompt: diagramData.prompt,
          type: 'diagram',
          sessionId: sessionId || 'default'
        })
      }).then(response => {
        if (response.ok) {
          console.log('✅ Diagram data sent to voice worker successfully');
        } else {
          console.error('❌ Failed to send diagram data to voice worker:', response.status);
          // Reset hash on failure so it can be retried
          lastSentDataRef.current = null;
        }
      }).catch(error => {
        console.error('❌ Error sending diagram data to voice worker:', error);
        // Reset hash on error so it can be retried
        lastSentDataRef.current = null;
      });
    }
  }, [diagramData, sessionId]);

  const toggleVoice = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
    
    if (!isVoiceEnabled && !sessionId) {
      const newSessionId = sessionManager.generateSessionId();
      console.log('🆔 Generated session ID for voice session:', newSessionId);
    }
  };


  return (
    <div className="flex flex-col items-center">
      {/* Voice Control Bar - Positioned at top right */}
      <div className="relative w-[280px] mb-2">
        <button
          onClick={toggleVoice}
          className={`absolute -top-2 -right-2 z-10 transition-all duration-200 shadow-lg ${
            isVoiceEnabled
              ? 'w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center'
              : 'px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-medium flex items-center gap-2'
          }`}
          title={isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
        >
          {isVoiceEnabled ? (
            <Minus className="w-4 h-4" />
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Enable Voice</span>
            </>
          )}
        </button>
      </div>

      {/* Hexagon Container - Shows when voice is disabled */}
      <div 
        className={`transition-all duration-500 ease-in-out overflow-visible flex items-center justify-center ${
          isVoiceEnabled ? 'h-[280px] mb-4' : 'h-0 mb-0'
        }`}
      >
        {!isVoiceEnabled ? (
          <div 
            className="w-[250px] h-[250px] bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              transform: 'translateY(8px)',
            }}
          >
            <div className="text-white text-sm font-medium text-center">
              <div className="text-2xl mb-2">🎤</div>
              <div>Voice Disabled</div>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={`https://hexa-worker.prabhatravib.workers.dev/${sessionId ? `?sessionId=${sessionId}&iframe=true` : '?iframe=true'}`}
            width="280"
            height="280"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              transform: 'translateY(8px)',
            }}
            title="Hexa Voice Agent"
            allow="microphone"
            onLoad={() => {
              console.log('🔄 Iframe loaded');
              if (sessionId) {
                console.log('🆔 Voice session started with session ID:', sessionId);
              }
              // Diagram data is already sent via API, no postMessage needed
              console.log('✅ Voice worker iframe loaded - diagram data should be available via API');
            }}
          />
        )}
      </div>

      {/* Code Flow Status - Moved to bottom */}
      <div className="text-center mt-6">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {codeFlowStatus === 'sent' ? 'Basic Details Sent' : 'No Details Sent'}
        </div>
      </div>

    </div>
  );
};
