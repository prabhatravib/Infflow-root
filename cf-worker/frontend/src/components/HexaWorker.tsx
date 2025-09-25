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
  autoDemoMode?: boolean;
  demoNarration?: string | null;
}

export const HexaWorker: React.FC<HexaWorkerProps> = ({ codeFlowStatus, diagramData, autoDemoMode = false, demoNarration = null }) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Layout constants for the expanded hexagon
  const INTERNAL_HEXAGON_SCALE = 0.8;    // scale internal hexagon to 80%
  const EXTRA_DOWN_OFFSET_PX = 30;       // move down to position hexagon lower
  const BASE = {
    container: 350,        // px (further increased for more hexagon visibility)
    iframeWidth: 300,      // px (increased iframe width for better coverage)
    iframeHeight: 320,     // px (increased iframe height for better coverage)
    iframeTop: -50,        // px (moved further up to show more of hexagon top)
    iframeLeft: -25        // px (adjusted for better centering with larger iframe)
  } as const;
  
  // Keep original iframe dimensions unchanged, only scale internal content
  const SCALED = {
    container: BASE.container,
    iframeWidth: BASE.iframeWidth,
    iframeHeight: BASE.iframeHeight,
    iframeTop: BASE.iframeTop,
    iframeLeft: BASE.iframeLeft
  } as const;

  // Subscribe to session changes
  useEffect(() => {
    const unsubscribe = sessionManager.onSessionChange((newSessionId) => {
      setSessionId(newSessionId);
      console.log('ðŸ†” HexaWorker received session ID:', newSessionId);
    });

    const currentSessionId = sessionManager.getSessionId();
    if (currentSessionId) {
      setSessionId(currentSessionId);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (autoDemoMode) {
      setIsExpanded(true);
      setIsVoiceEnabled(true);
      if (!sessionId) {
        const newSessionId = sessionManager.generateSessionId();
        setSessionId(newSessionId);
        console.log('[AutoDemo] Generated session ID for demo run:', newSessionId);
      }
    } else {
      setIsExpanded(false);
      setIsVoiceEnabled(false);
    }
  }, [autoDemoMode, sessionId]);

  useEffect(() => {
    if (!iframeRef.current) {
      return;
    }

    if (!autoDemoMode) {
      iframeRef.current.contentWindow?.postMessage({ type: 'DEMO_CONTROL', action: 'stop' }, '*');
      return;
    }

    if (!demoNarration) {
      return;
    }

    iframeRef.current.contentWindow?.postMessage(
      {
        type: 'DEMO_NARRATION',
        text: demoNarration,
        voice: { rate: 1.05, pitch: 1.0, emphasis: 'professional' },
      },
      '*'
    );
  }, [autoDemoMode, demoNarration]);

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
        console.log('â­ï¸ Skipping duplicate diagram data send');
        return;
      }
      
      lastSentDataRef.current = dataHash;
      console.log('ðŸ“¤ Sending diagram data to voice worker via API:', diagramData);
      
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
          console.log('âœ… Diagram data sent to voice worker successfully');
        } else {
          console.error('âŒ Failed to send diagram data to voice worker:', response.status);
          // Reset hash on failure so it can be retried
          lastSentDataRef.current = null;
        }
      }).catch(error => {
        console.error('âŒ Error sending diagram data to voice worker:', error);
        // Reset hash on error so it can be retried
        lastSentDataRef.current = null;
      });
    }
  }, [diagramData, sessionId]);

  const toggleVoice = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
    
    if (!isVoiceEnabled && !sessionId) {
      const newSessionId = sessionManager.generateSessionId();
      console.log('ðŸ†” Generated session ID for voice session:', newSessionId);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(false);
    setIsVoiceEnabled(false);
  };


  return (
    <div className="flex flex-col items-center">
      {/* Minimized State - Show Enable Voice button */}
      {!isExpanded && (
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              setIsExpanded(true);
              setIsVoiceEnabled(true);
              if (!sessionId) {
                const newSessionId = sessionManager.generateSessionId();
                console.log('ðŸ†” Generated session ID for voice session:', newSessionId);
              }
            }}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 shadow-lg"
            title="Enable Voice"
          >
            <Plus className="w-4 h-4" />
            <span>Enable Voice</span>
          </button>
          
          {/* Code Flow Status */}
          <div className="text-center mt-6">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {codeFlowStatus === 'sent' ? 'Basic Details Sent' : 'No Details Sent'}
            </div>
          </div>
        </div>
      )}

      {/* Expanded State - Only show when voice is enabled (hexagon widget) */}
      {isExpanded && isVoiceEnabled && (
        <div className="flex flex-col items-center">
          <div className="transition-all duration-500 ease-in-out relative">
            {/* Minimize Button */}
            <button
              onClick={toggleExpanded}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            
            <div 
              className="hexagon-container"
              style={{
                width: `${SCALED.container}px`,
                height: `${SCALED.container}px`,
                position: 'relative',
                // Pull the worker a bit further down to avoid overlap with top panels
                transform: `translateY(${-10 + EXTRA_DOWN_OFFSET_PX}px)`,
                // Ensure container doesn't overflow and covers text
                overflow: 'visible',
                // CSS variable for clean hexagon positioning
                ['--hexa-nudge-y' as any]: '30px',
              }}
            >
              <iframe
                ref={iframeRef}
                src={`https://hexa-worker.prabhatravib.workers.dev/${sessionId ? `?sessionId=${sessionId}&iframe=true` : '?iframe=true'}`}
                width={SCALED.iframeWidth}
                height={SCALED.iframeHeight}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  borderRadius: '0',
                  position: 'absolute',
                  top: `${SCALED.iframeTop}px`,
                  left: `${SCALED.iframeLeft}px`,
                  transform: `scale(${INTERNAL_HEXAGON_SCALE}) translateY(40px)`,  // Further reduced to show more hexagon
                  transformOrigin: 'center center',  // Scale from center
                  zIndex: 1, // Lower z-index than text to ensure text stays visible
                }}
                title="Hexa Voice Agent"
                allow="microphone"
                onLoad={() => {
                  console.log('ðŸ”„ Iframe loaded');
                  if (sessionId) {
                    console.log('ðŸ†” Voice session started with session ID:', sessionId);
                  }
                  // Diagram data is already sent via API, no postMessage needed
                  console.log('âœ… Voice worker iframe loaded - diagram data should be available via API');
                }}
              />
            </div>
          </div>

          {/* Code Flow Status - Positioned to always be visible below iframe */}
          <div className="text-center mt-6 relative z-10">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {codeFlowStatus === 'sent' ? 'Basic Details Sent' : 'No Details Sent'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};






