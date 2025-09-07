export async function callOpenAI(env: EnvLike, system: string, user: string, model: string, maxTokens: number, temperature: number): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }
  const data = await res.json() as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("Empty OpenAI response");
  return content;
}

// Minimal Env-like type to avoid circular imports across modules.
export type EnvLike = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
