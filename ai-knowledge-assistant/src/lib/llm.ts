import "dotenv/config"; // load GROQ_API_KEY before we construct the client
import OpenAI from "openai";

// Provider-agnostic seam: swap these two lines to point at OpenAI/local/etc.
export const MODEL = "llama-3.3-70b-versatile";
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export interface ChatArgs {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string; // override the default model (e.g. an independent eval judge)
}

/** One-shot chat completion. Returns the text and token usage. */
export async function chat({ system, user, maxTokens = 1024, model = MODEL }: ChatArgs) {
  const r = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return { text: r.choices[0].message.content ?? "", usage: r.usage };
}

/** Streaming chat completion. Yields text deltas as they generate. */
export async function* streamChat({ system, user, maxTokens = 1024 }: ChatArgs) {
  const stream = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/** Illustrative cost meter. Groq's free tier is $0; these are example rates. */
export function estimateCostUSD(usage: any, inPerM = 3, outPerM = 15): number {
  return ((usage?.prompt_tokens ?? 0) * inPerM + (usage?.completion_tokens ?? 0) * outPerM) / 1e6;
}
