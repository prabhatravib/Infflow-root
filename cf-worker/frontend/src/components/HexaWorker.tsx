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
    <div className="flex flex-col items-center space-y-4">
      {/* Code Flow Status */}
      <div className="text-center">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {codeFlowStatus === 'sent' ? 'Basic Details Sent' : 'No Details Sent'}
        </div>
      </div>

      {/* Hexagon Container */}
      <div className="relative">
        {isVoiceEnabled ? (
          <iframe
            ref={iframeRef}
            src={`https://hexa-worker.prabhatravib.workers.dev/${sessionId ? `?sessionId=${sessionId}&iframe=true` : '?iframe=true'}`}
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
              // Diagram data is already sent via API, no postMessage needed
              console.log('✅ Voice worker iframe loaded - diagram data should be available via API');
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
