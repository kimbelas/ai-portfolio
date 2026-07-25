import "dotenv/config"; // load GROQ_API_KEY before constructing the client
import OpenAI from "openai";

// Provider-agnostic seam — Groq speaks the OpenAI protocol, incl. tool calling.
// gpt-oss-20b is chosen for RELIABLE function calling: Llama-family models on
// Groq occasionally emit malformed tool calls (400 tool_use_failed). Model
// choice matters for agents — pick one that's strong at structured tool use.
export const MODEL = "openai/gpt-oss-20b";
export const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export function estimateCostUSD(usage: any, inPerM = 3, outPerM = 15): number {
  return ((usage?.prompt_tokens ?? 0) * inPerM + (usage?.completion_tokens ?? 0) * outPerM) / 1e6;
}
