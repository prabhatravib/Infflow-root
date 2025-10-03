# External Frame and Hexagon Component Connection Implementation Guide

## Overview

This guide provides a comprehensive implementation strategy for creating an external frame that connects to a hexagon component using iframe communication, session management, and real-time data synchronization. The architecture enables seamless integration between a main application (external frame) and a specialized voice-enabled hexagon component.

## Architecture Summary

The system consists of two main components:
1. **External Frame**: Main application with diagram generation, code flow, and Marimo notebook functionality
2. **Hexagon Component**: Specialized voice-enabled worker with AI agent capabilities

## Core Communication Patterns

### 1. Session Management System

#### SessionManager Class
```typescript
// cf-worker/frontend/src/utils/sessionManager.ts
class SessionManager {
  private sessionId: string | null = null;
  private listeners: ((sessionId: string | null) => void)[] = [];

  generateSessionId(): string {
    this.sessionId = this.generateUUID();
    this.notifyListeners();
    return this.sessionId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    this.notifyListeners();
  }

  clearSession(): void {
    this.sessionId = null;
    this.notifyListeners();
  }

  onSessionChange(callback: (sessionId: string | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.sessionId));
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export const sessionManager = new SessionManager();
```

### 2. iframe Communication Protocol

#### Message Types
```typescript
interface DiagramData {
  mermaidCode: string
  diagramImage: string
  prompt: string
}

interface PostMessageTypes {
  diagram_data: {
    type: 'diagram_data'
    data: DiagramData
  }
  session_info: {
    type: 'session_info'
    sessionId: string
    clientSecret: string
    audioData?: string
  }
  transcription: {
    type: 'transcription'
    text: string
  }
  response_text_delta: {
    type: 'response_text_delta'
    text: string
  }
  agent_start: {
    type: 'agent_start'
  }
  agent_end: {
    type: 'agent_end'
  }
  error: {
    type: 'error'
    error: { message: string }
  }
}
```


#### External Frame Implementation
```typescript
// cf-worker/frontend/src/components/HexaWorker.tsx (simplified)
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

  // Subscribe to session changes
  useEffect(() => {
    const unsubscribe = sessionManager.onSessionChange((newSessionId) => {
      setSessionId(newSessionId);
      console.log('🆔 HexaWorker received session ID:', newSessionId);
    });
    const currentSessionId = sessionManager.getSessionId();
    if (currentSessionId) setSessionId(currentSessionId);
    return unsubscribe;
  }, []);

  // Send diagram data to voice worker via API when it changes (deduplicated)
  const lastSentDataRef = useRef<string | null>(null);
  useEffect(() => {
    if (diagramData) {
      const dataHash = JSON.stringify({
        mermaidCode: diagramData.mermaidCode,
        prompt: diagramData.prompt,
        sessionId: sessionId || 'default',
      });
      if (dataHash === lastSentDataRef.current) {
        console.log('⏭️ Skipping duplicate diagram data send');
        return;
      }
      lastSentDataRef.current = dataHash;
      fetch('https://hexa-worker.prabhatravib.workers.dev/api/external-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mermaidCode: diagramData.mermaidCode,
          diagramImage: diagramData.diagramImage,
          prompt: diagramData.prompt,
          type: 'diagram',
          sessionId: sessionId || 'default',
        })
      }).then(response => {
        if (!response.ok) lastSentDataRef.current = null;
      }).catch(() => { lastSentDataRef.current = null; });
    }
  }, [diagramData, sessionId]);

  // ...existing code for UI, expansion, demo mode, and iframe rendering...
  // The iframe src should be:
  // src={`https://hexa-worker.prabhatravib.workers.dev/${sessionId ? `?sessionId=${sessionId}&iframe=true` : '?iframe=true'}`}
}
```


### 3. HTTP API Communication

#### External Data Endpoint
```typescript
// Send diagram data to hexagon worker via HTTP API (with deduplication and sessionId)
const lastSentDataRef = useRef<string | null>(null);
useEffect(() => {
  if (diagramData) {
    const dataHash = JSON.stringify({
      mermaidCode: diagramData.mermaidCode,
      prompt: diagramData.prompt,
      sessionId: sessionId || 'default',
    });
    if (dataHash === lastSentDataRef.current) return;
    lastSentDataRef.current = dataHash;
    fetch('https://hexa-worker.prabhatravib.workers.dev/api/external-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mermaidCode: diagramData.mermaidCode,
        diagramImage: diagramData.diagramImage,
        prompt: diagramData.prompt,
        type: 'diagram',
        sessionId: sessionId || 'default',
      })
    }).then(response => {
      if (!response.ok) lastSentDataRef.current = null;
    }).catch(() => { lastSentDataRef.current = null; });
  }
}, [diagramData, sessionId]);
```


### 4. Hexagon Worker Implementation

**Note:** The current repo does not use Durable Objects or a `VoiceSession` class. The worker implementation may be a standard Cloudflare Worker or similar, and the `/api/external-data` endpoint should accept POST requests with the diagram data and sessionId. Update this section if you add Durable Objects or advanced session management in the future.

#### External Data Handler
```typescript
export class VoiceSessionExternalData {
  constructor(
    private core: VoiceSessionCore,
    private state: DurableObjectState,
    private messageHandlers: MessageHandlers,
    private agentManager: AgentManager
  ) {}

  async handleExternalData(request: Request): Promise<Response> {
    try {
      const data = await request.json()
      
      // Store external data for injection
      await this.state.storage.put('externalData', data)
      
      // Set external data in message handlers
      this.messageHandlers.setExternalData(data)
      
      // Broadcast to connected clients
      this.core.broadcastToClients({
        type: 'external_data_received',
        data: data
      })
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Error handling external data:', error)
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}
```

### 5. Message Handlers

#### Audio Input Processing
```typescript
export class MessageHandlers {
  public openaiConnection: any
  private currentExternalData: any = null

  async handleAudioInput(audioData: string, sessionId: string): Promise<void> {
    try {
      console.log('🔧 Audio data received, sending session info to frontend for WebRTC connection...')
      
      // Set external data for WebRTC injection if available
      if (this.currentExternalData) {
        console.log('🔧 Setting external data for WebRTC injection:', this.currentExternalData)
        this.openaiConnection.setExternalData(this.currentExternalData)
      }
      
      // Get session info for WebRTC connection
      const sessionInfo = this.openaiConnection.getSessionInfo()
      
      this.broadcastToClients({
        type: 'session_info',
        sessionId: sessionInfo.sessionId,
        clientSecret: sessionInfo.clientSecret,
        audioData: audioData
      })
      
      console.log('✅ Session info sent to frontend for WebRTC connection')
    } catch (error) {
      console.error('❌ Failed to process audio:', error)
      this.broadcastToClients({
        type: 'error',
        error: { message: 'Failed to process audio. Please try again.' }
      })
    }
  }

  setExternalData(externalData: any): void {
    this.currentExternalData = externalData
  }
}
```


### 6. OpenAI Integration

#### Standard Chat Completion API
```typescript
// cf-worker/src/openai.ts
export async function callOpenAI(env: EnvLike, system: string, user: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  // ...existing code...
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  // ...existing code...
}
```

## Implementation Steps

### Step 1: Set Up External Frame

1. **Create Session Manager**
   - Implement the `SessionManager` class
   - Add session persistence and cleanup
   - Handle session state changes

2. **Create HexaWorker Component**
   - Implement iframe communication
   - Add postMessage handling
   - Manage voice enable/disable state

3. **Add HTTP API Communication**
   - Implement external data endpoint calls
   - Handle error responses and retries
   - Add request deduplication


### Step 2: Set Up Hexagon Worker

1. **Create Worker Endpoint**
  - Implement `/api/external-data` POST endpoint to receive diagram data and sessionId
  - Store or process data as needed for the session

2. **Implement OpenAI Integration**
  - Use the `callOpenAI` function to generate responses

3. **(Optional) Add Advanced Session Management**
  - If needed, add Durable Objects or WebSocket support for real-time features


### Step 3: Configure Communication

1. **Set Up CORS**
  - Allow cross-origin requests
  - Configure allowed headers and methods
  - Handle preflight requests

2. **Implement Security**
  - Validate message origins (for iframe postMessage, if used)
  - Sanitize external data
  - Add rate limiting

3. **Add Error Handling**
  - Implement retry logic for API calls
  - Add fallback mechanisms
  - Create user-friendly error messages

### Step 4: Deploy and Test

1. **Deploy Hexagon Worker**
   - Deploy to Cloudflare Workers
   - Configure environment variables
   - Test WebSocket connections

2. **Deploy External Frame**
   - Deploy main application
   - Configure hexagon worker URL
   - Test iframe communication

3. **Integration Testing**
   - Test session management
   - Verify data synchronization
   - Test voice functionality

## Configuration Requirements

### Environment Variables

#### External Frame
```env
VITE_HEXA_WORKER_URL=https://hexa-worker.prabhatravib.workers.dev
VITE_OPENAI_API_KEY=your_openai_api_key
```

#### Hexagon Worker
```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_REALTIME_MODEL=gpt-4.1
```

### CORS Configuration
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}
```


## Security Considerations

1. **Message Origin Validation**
  - If using postMessage, always validate origins and use specific target origins

2. **Data Sanitization**
  - Sanitize external data before processing
  - Validate data types and structure

3. **Rate Limiting**
  - Implement rate limiting for API endpoints

4. **Session Security**
  - Use secure session ID generation
  - Implement session expiration if needed
  - Add session validation

## Performance Optimization

1. **Connection Pooling**
   - Reuse WebSocket connections
   - Implement connection pooling

2. **Data Caching**
   - Cache external data in Durable Object storage
   - Implement data deduplication

3. **Lazy Loading**
   - Load hexagon component only when needed
   - Implement progressive enhancement

## Troubleshooting

### Common Issues

1. **iframe Communication Failures**
   - Check CORS configuration
   - Verify target origins
   - Check browser console for errors

2. **Session Management Issues**
   - Verify session ID generation
   - Check session persistence
   - Validate session cleanup

3. **Voice Functionality Problems**
   - Check microphone permissions
   - Verify WebRTC connection
   - Check OpenAI API configuration

### Debug Tools

1. **Console Logging**
   - Add comprehensive logging
   - Use structured log messages
   - Implement log levels

2. **Network Monitoring**
   - Monitor WebSocket connections
   - Track API request/response times
   - Check for failed requests

3. **Session Debugging**
   - Log session state changes
   - Track external data flow
   - Monitor message passing

## Conclusion

This implementation guide provides a complete framework for creating an external frame that connects to a hexagon component. The architecture supports real-time communication, session management, and seamless data synchronization between the two components. Follow the implementation steps carefully and refer to the troubleshooting section for common issues.

