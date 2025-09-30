export async function callOpenAI(env: EnvLike, system: string, user: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  const startTime = performance.now();
  const requestId = `openai_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  console.log(`🤖 [${requestId}] OpenAI API call starting...`);
  console.log(`Model: ${model}`);
  console.log(`Max tokens: ${maxTokens}`);
  console.log(`Temperature: ${temperature}`);
  console.log(`API key present: ${!!env.OPENAI_API_KEY}`);
  console.log(`API key preview: ${env.OPENAI_API_KEY ? `${env.OPENAI_API_KEY.substring(0, 10)}...` : "NOT SET"}`);
  
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
  
  const requestBody = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  };
  
  console.log(`🤖 [${requestId}] Request body:`, JSON.stringify({
    model: requestBody.model,
    messages: requestBody.messages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + "..." })),
    temperature: requestBody.temperature,
    max_tokens: requestBody.max_tokens
  }, null, 2));
  
  const networkStartTime = performance.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const networkTime = performance.now() - networkStartTime;
  
  console.log(`🤖 [${requestId}] OpenAI response status: ${res.status}`);
  console.log(`🤖 [${requestId}] OpenAI response headers:`, Object.fromEntries(res.headers.entries()));
  console.log(`⏱️  [${requestId}] Network request time: ${networkTime.toFixed(2)}ms`);
  
  if (!res.ok) {
    const text = await res.text();
    const totalTime = performance.now() - startTime;
    console.error(`❌ [${requestId}] OpenAI API error: ${res.status} ${text}`);
    console.error(`⏱️  [${requestId}] Total time before error: ${totalTime.toFixed(2)}ms`);
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }
  
  const parseStartTime = performance.now();
  const data = await res.json() as any;
  const parseTime = performance.now() - parseStartTime;
  
  console.log(`🤖 [${requestId}] OpenAI response data:`, JSON.stringify({
    choices: data.choices?.length || 0,
    usage: data.usage,
    model: data.model
  }, null, 2));
  
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    const totalTime = performance.now() - startTime;
    console.error(`❌ [${requestId}] Empty or invalid OpenAI response:`, data);
    console.error(`⏱️  [${requestId}] Total time before error: ${totalTime.toFixed(2)}ms`);
    throw new Error("Empty OpenAI response");
  }
  
  const totalTime = performance.now() - startTime;
  console.log(`✅ [${requestId}] OpenAI API call successful, content length: ${content.length}`);
  console.log(`⏱️  [${requestId}] Performance breakdown:`);
  console.log(`   • Network request: ${networkTime.toFixed(2)}ms (${((networkTime / totalTime) * 100).toFixed(1)}%)`);
  console.log(`   • Response parsing: ${parseTime.toFixed(2)}ms (${((parseTime / totalTime) * 100).toFixed(1)}%)`);
  console.log(`   • Total time: ${totalTime.toFixed(2)}ms`);
  
  return content;
}

// Minimal Env-like type to avoid circular imports across modules.
export type EnvLike = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
