/**
 * ai-kit/llm — the shared model factory + cost meter. Provider-agnostic seam:
 * Groq via the OpenAI-compatible endpoint. The flagships consolidate on this.
 */

import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

export const MODEL = "openai/gpt-oss-120b";

export function makeModel() {
  return new ChatOpenAI({
    model: MODEL,
    apiKey: process.env.GROQ_API_KEY,
    configuration: { baseURL: "https://api.groq.com/openai/v1" },
    temperature: 0,
    useResponsesApi: false, // Groq only implements /chat/completions
  });
}

export function estimateCostUSD(usage: any, inPerM = 3, outPerM = 15): number {
  return ((usage?.input_tokens ?? 0) * inPerM + (usage?.output_tokens ?? 0) * outPerM) / 1e6;
}
