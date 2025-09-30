// Model routing with explicit whitelists and performance tiers
const RESPONSES_MODELS = new Set([
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5-codex",
  "gpt-5-2025-08-07",
  "gpt-5-mini-2025-08-07"
]);

const CHAT_MODELS = new Set([
  "gpt-5-chat-latest",
  "gpt-4.1",
  "gpt-4o",
  "gpt-4o-mini"
]);

// Performance-based model selection
const FAST_MODELS = new Set([
  "gpt-4o-mini",
  "gpt-5-mini",
  "gpt-5-mini-2025-08-07"
]);

const SLOW_MODELS = new Set([
  "gpt-5",
  "gpt-5-2025-08-07",
  "gpt-4.1"
]);

function isResponsesModel(model: string): boolean { 
  return RESPONSES_MODELS.has(model); 
}

function isChatModel(model: string): boolean { 
  return CHAT_MODELS.has(model); 
}

// Types for request bodies
type ResponsesBody = {
  model: string;
  instructions?: string;
  input: Array<{ role: "user" | "system" | "assistant"; content: string }>;
  max_output_tokens?: number;
  reasoning?: { effort?: "low" | "medium" | "high" };
  store?: boolean;
};

type ChatBody = {
  model: string;
  messages: Array<{ role: "user" | "system" | "assistant"; content: string }>;
  max_tokens?: number;
};

function buildResponsesBody(
  model: string, 
  system: string, 
  user: string, 
  maxOut?: number, 
  effort?: "low" | "medium" | "high"
): ResponsesBody {
  const body: ResponsesBody = {
    model,
    instructions: system,
    input: [{ role: "user", content: user }],
    store: false
  };
  if (maxOut) body.max_output_tokens = maxOut;
  if (effort) body.reasoning = { effort };
  return body; // no merge with defaults that add temperature or top_p
}

function buildChatBody(model: string, system: string, user: string, maxTokens?: number): ChatBody {
  const body: ChatBody = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  };
  if (maxTokens) body.max_tokens = maxTokens;
  return body;
}

function readResponsesText(resp: any): string {
  if (typeof resp?.output_text === "string") return resp.output_text; // SDK object
  const items = Array.isArray(resp?.output) ? resp.output : [];
  const parts = items.flatMap((it: any) => Array.isArray(it?.content) ? it.content : []);
  return parts
    .filter((p: any) => p && (p.type === "output_text" || p.type === "text"))
    .map((p: any) => p.text ?? "")
    .join("")
    .trim();
}

function assertCompleted(resp: any, ctx: string) {
  const st = resp?.status;
  if (st === "completed") return;
  const why = resp?.incomplete_details?.reason ?? "unknown";
  throw new Error(`[${ctx}] Responses status=${st}, reason=${why}`);
}

export async function callOpenAI(
  env: EnvLike, 
  system: string, 
  user: string, 
  model: string, 
  maxTokens: number,
  effort: "low" | "medium" | "high" = "medium"
): Promise<string> {
  const startTime = performance.now();
  const requestId = `openai_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  console.log(`🤖 [${requestId}] OpenAI API call starting...`);
  console.log(`Model: ${model}`);
  console.log(`Max tokens: ${maxTokens}`);
  console.log(`Effort: ${effort}`);
  console.log(`API key present: ${!!env.OPENAI_API_KEY}`);
  
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
  
  const useResponses = isResponsesModel(model);
  const useChat = isChatModel(model);
  
  if (!useResponses && !useChat) {
    console.warn(`⚠️ Unknown model ${model}, defaulting to Chat Completions`);
  }
  
  const endpoint = useResponses ? "https://api.openai.com/v1/responses" : "https://api.openai.com/v1/chat/completions";
  const requestBody = useResponses 
    ? buildResponsesBody(model, system, user, maxTokens, effort)
    : buildChatBody(model, system, user, maxTokens);
  
  console.log(`🤖 [${requestId}] Using ${useResponses ? 'Responses API' : 'Chat Completions API'}`);
  console.log(`🤖 [${requestId}] Request body keys:`, Object.keys(requestBody));
  
  const networkStartTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout
  
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const networkTime = performance.now() - networkStartTime;
    console.log(`🤖 [${requestId}] Response status: ${res.status}, time: ${networkTime.toFixed(2)}ms`);
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ [${requestId}] API error: ${res.status} ${text}`);
      throw new Error(`OpenAI error ${res.status}: ${text}`);
    }
    
    const data = await res.json() as any;
    
    // Log response structure for debugging
    if (useResponses) {
      console.log(`🤖 [${requestId}] Responses data:`, JSON.stringify({
        status: data.status,
        output_length: data.output?.length || 0,
        output_types: data.output?.map((item: any) => item.type) || [],
        usage: data.usage
      }, null, 2));
      
      assertCompleted(data, `${requestId}-responses`);
      const content = readResponsesText(data);
      
      if (!content) {
        console.error(`❌ [${requestId}] No content in Responses output:`, data.output);
        throw new Error("Empty Responses content");
      }
      
      console.log(`✅ [${requestId}] Success: ${content.length} chars`);
      return content;
      
    } else {
      // Chat Completions
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        console.error(`❌ [${requestId}] No content in Chat response:`, data);
        throw new Error("Empty Chat content");
      }
      
      console.log(`✅ [${requestId}] Success: ${content.length} chars`);
      return content;
    }
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Handle incomplete responses with adaptive retry
    if (useResponses && error.message.includes("reason=max_output_tokens")) {
      console.log(`🔄 [${requestId}] Retrying with higher token limit...`);
      const retryBody = buildResponsesBody(model, system, user, maxTokens * 2, "low");
      
      const retryRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(retryBody)
      });
      
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        assertCompleted(retryData, `${requestId}-retry`);
        const retryContent = readResponsesText(retryData);
        if (retryContent) {
          console.log(`✅ [${requestId}] Retry success: ${retryContent.length} chars`);
          return retryContent;
        }
      }
    }
    
    console.error(`❌ [${requestId}] Call failed:`, error.message);
    throw error;
  }
}

// Smart model selection based on query complexity and operation type
export function selectOptimalModel(
  baseModel: string,
  fallbackModel: string,
  operation: 'classification' | 'content' | 'diagram' | 'universal',
  queryLength: number
): string {
  // For simple queries (< 50 chars), always use fastest available model
  if (queryLength < 50) {
    if (FAST_MODELS.has(fallbackModel)) return fallbackModel;
    if (FAST_MODELS.has(baseModel)) return baseModel;
  }

  // For classification, use fastest model available
  if (operation === 'classification') {
    return fallbackModel; // This is gpt-5-mini, should be fast
  }

  // For content generation on simple queries, use fast models
  if (operation === 'content' && queryLength < 100) {
    if (FAST_MODELS.has(fallbackModel)) return fallbackModel;
  }

  // For diagram generation, can use fast models for simple content
  if (operation === 'diagram' && queryLength < 80) {
    if (FAST_MODELS.has(fallbackModel)) return fallbackModel;
  }

  // Default to base model for complex operations
  return baseModel;
}

// Minimal Env-like type to avoid circular imports across modules.
export type EnvLike = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_FALLBACK_MODEL?: string;
};
