export async function callOpenAI(env: EnvLike, system: string, user: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  console.log("🤖 OpenAI API call starting...");
  console.log("Model:", model);
  console.log("Max tokens:", maxTokens);
  console.log("Temperature:", temperature);
  console.log("API key present:", !!env.OPENAI_API_KEY);
  console.log("API key preview:", env.OPENAI_API_KEY ? `${env.OPENAI_API_KEY.substring(0, 10)}...` : "NOT SET");
  
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
  
  console.log("🤖 Request body:", JSON.stringify({
    model: requestBody.model,
    messages: requestBody.messages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + "..." })),
    temperature: requestBody.temperature,
    max_tokens: requestBody.max_tokens
  }, null, 2));
  
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  
  console.log("🤖 OpenAI response status:", res.status);
  console.log("🤖 OpenAI response headers:", Object.fromEntries(res.headers.entries()));
  
  if (!res.ok) {
    const text = await res.text();
    console.error("❌ OpenAI API error:", res.status, text);
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }
  
  const data = await res.json() as any;
  console.log("🤖 OpenAI response data:", JSON.stringify({
    choices: data.choices?.length || 0,
    usage: data.usage,
    model: data.model
  }, null, 2));
  
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    console.error("❌ Empty or invalid OpenAI response:", data);
    throw new Error("Empty OpenAI response");
  }
  
  console.log("✅ OpenAI API call successful, content length:", content.length);
  return content;
}

// Minimal Env-like type to avoid circular imports across modules.
export type EnvLike = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
