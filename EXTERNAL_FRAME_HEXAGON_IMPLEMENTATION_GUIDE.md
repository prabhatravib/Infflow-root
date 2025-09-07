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
class SessionManager {
  private sessionId: string | null = null
  private listeners: ((sessionId: string | null) => void)[] = []

  generateSessionId(): string {
    this.sessionId = this.generateUUID()
    this.notifyListeners()
    return this.sessionId
  }

  getSessionId(): string | null {
    return this.sessionId
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId
    this.notifyListeners()
  }

  clearSession(): void {
    this.sessionId = null
    this.notifyListeners()
  }

  onSessionChange(callback: (sessionId: string | null) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.sessionId))
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}

export const sessionManager = new SessionManager()
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
// HexaWorker Component
interface HexaWorkerProps {
  codeFlowStatus: 'sent' | 'not-sent'
  diagramData: DiagramData | null
}

export const HexaWorker: React.FC<HexaWorkerProps> = ({ codeFlowStatus, diagramData }) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Subscribe to session changes
  useEffect(() => {
    const unsubscribe = sessionManager.onSessionChange((newSessionId) => {
      setSessionId(newSessionId)
      console.log('🆔 HexaWorker received session ID:', newSessionId)
    })

    const currentSessionId = sessionManager.getSessionId()
    if (currentSessionId) {
      setSessionId(currentSessionId)
    }

    return unsubscribe
  }, [])

  // Send diagram data to iframe when it changes
  useEffect(() => {
    if (diagramData && iframeRef.current && isVoiceEnabled) {
      console.log('📤 Sending diagram data to HexaWorker iframe:', diagramData)
      
      iframeRef.current.contentWindow?.postMessage({
        type: 'diagram_data',
        data: diagramData
      }, 'https://hexa-worker.prabhatravib.workers.dev')
    }
  }, [diagramData, isVoiceEnabled])

  const toggleVoice = () => {
    setIsVoiceEnabled(!isVoiceEnabled)
    
    if (!isVoiceEnabled && !sessionId) {
      const newSessionId = sessionManager.generateSessionId()
      console.log('🆔 Generated session ID for voice session:', newSessionId)
    }
  }

  return (
    <div className="hexa-worker-container">
      <button onClick={toggleVoice} className="voice-toggle">
        {isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
      </button>

      {isVoiceEnabled ? (
        <iframe
          ref={iframeRef}
          src={`https://hexa-worker.prabhatravib.workers.dev/${sessionId ? `?sessionId=${sessionId}` : ''}`}
          width="340"
          height="340"
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
            console.log('🔄 Iframe loaded')
            if (sessionId) {
              console.log('🆔 Voice session started with session ID:', sessionId)
            }
            if (diagramData) {
              console.log('📤 Sending diagram data on iframe load:', diagramData)
              iframeRef.current?.contentWindow?.postMessage({
                type: 'diagram_data',
                data: diagramData
              }, 'https://hexa-worker.prabhatravib.workers.dev')
            }
          }}
        />
      ) : (
        <div className="voice-disabled-placeholder">
          <div className="text-white text-sm font-medium">Voice Disabled</div>
        </div>
      )}
    </div>
  )
}
```

### 3. HTTP API Communication

#### External Data Endpoint
```typescript
// Send diagram data to hexagon worker via HTTP API
const handleDiscussionRequest = async (diagramContext: DiagramData) => {
  console.log('Hexagon discussion started for diagram:', diagramContext)
  
  try {
    const response = await fetch('https://hexa-worker.prabhatravib.workers.dev/api/external-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mermaidCode: diagramContext.mermaidCode,
        diagramImage: diagramContext.diagramImage,
        prompt: diagramContext.prompt,
        type: 'diagram'
      })
    })

    if (!response.ok) {
      if (response.status === 409) {
        console.error('❌ 409 Conflict: Hexagon worker rejected the diagram data')
        const errorText = await response.text()
        throw new Error(`Hexagon worker rejected data: ${errorText}`)
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('✅ Diagram data sent to hexagon worker:', result)
    
    // Update status to show "Code Flow Sent"
    onCodeFlowStatusChange?.('sent')
    
  } catch (error) {
    console.error('❌ Error sending data to hexagon worker:', error)
  }
}
```

### 4. Hexagon Worker Implementation

#### Voice Session Management
```typescript
export class VoiceSession {
  private core: VoiceSessionCore
  private handlers: VoiceSessionHandlers
  private externalData: VoiceSessionExternalData
  private openaiConnection: OpenAIConnection
  private messageHandlers: MessageHandlers
  private agentManager: AgentManager

  constructor(private state: DurableObjectState, private env: Env) {
    // Initialize core session management
    this.core = new VoiceSessionCore(state, env)
    
    // Initialize OpenAI connection
    this.openaiConnection = new OpenAIConnection(
      env,
      (data: string) => this.handlers.handleOpenAIConnectionMessage(data),
      (error: any) => this.core.broadcastToClients({ type: 'error', error }),
      () => this.handlers.onOpenAIConnected(),
      () => this.handlers.onOpenAIDisconnected()
    )

    // Initialize message handlers
    this.messageHandlers = new MessageHandlers(
      this.openaiConnection,
      (message: any) => this.core.broadcastToClients(message)
    )

    // Initialize agent manager
    this.agentManager = new AgentManager(
      this.openaiConnection,
      (message: any) => this.core.broadcastToClients(message)
    )

    // Initialize external data management
    this.externalData = new VoiceSessionExternalData(
      this.core,
      state,
      this.messageHandlers,
      this.agentManager
    )

    // Initialize handlers
    this.handlers = new VoiceSessionHandlers(
      this.core,
      this.openaiConnection,
      this.messageHandlers,
      this.agentManager
    )

    // Wire up handlers with external data
    this.handlers.setExternalData(this.externalData)
    this.core.setHandlers(this.handlers)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    // Handle external data endpoint
    if (url.pathname === '/api/external-data' && request.method === 'POST') {
      return this.externalData.handleExternalData(request)
    }
    
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.core.handleWebSocketUpgrade(request)
    }
    
    // Handle other requests
    return this.core.handleRequest(request)
  }
}
```

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

#### Realtime API Connection
```typescript
export class OpenAIConnection {
  private env: Env
  private sessionId: string | null = null
  private clientSecret: string | null = null
  private externalData: any = null

  async sendMessage(message: any): Promise<void> {
    if (!this.sessionId) {
      console.error('No active session for sending message')
      return
    }

    try {
      if (message.type === 'text') {
        const conversationItem = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: message.text
              }
            ]
          }
        }

        const response = await fetch(`https://api.openai.com/v1/realtime/sessions/${this.sessionId}/conversation/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(conversationItem)
        })

        if (response.ok) {
          console.log('✅ Text message sent to Realtime session')
          
          // Trigger response
          const responseTrigger = { type: "response.create" }
          await fetch(`https://api.openai.com/v1/realtime/sessions/${this.sessionId}/responses`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(responseTrigger)
          })
        }
      }
    } catch (error) {
      console.error('❌ Failed to send message to OpenAI:', error)
    }
  }

  setExternalData(externalData: any): void {
    this.externalData = externalData
  }

  getSessionInfo(): { sessionId: string; clientSecret: string } {
    return {
      sessionId: this.sessionId || '',
      clientSecret: this.clientSecret || ''
    }
  }
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

1. **Create Voice Session Durable Object**
   - Implement session management
   - Add WebSocket handling
   - Create external data endpoints

2. **Implement Message Handlers**
   - Add audio input processing
   - Handle text input
   - Manage OpenAI integration

3. **Add External Data Management**
   - Store external data in Durable Object storage
   - Inject data into AI context
   - Broadcast updates to clients

### Step 3: Configure Communication

1. **Set Up CORS**
   - Allow cross-origin requests
   - Configure allowed headers and methods
   - Handle preflight requests

2. **Implement Security**
   - Validate message origins
   - Sanitize external data
   - Add rate limiting

3. **Add Error Handling**
   - Implement retry logic
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
   - Always validate postMessage origins
   - Use specific target origins in postMessage calls

2. **Data Sanitization**
   - Sanitize external data before processing
   - Validate data types and structure

3. **Rate Limiting**
   - Implement rate limiting for API endpoints
   - Add request throttling for voice input

4. **Session Security**
   - Use secure session ID generation
   - Implement session expiration
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

