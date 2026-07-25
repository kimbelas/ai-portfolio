import "dotenv/config"; // load GROQ_API_KEY before constructing the model
import { ChatOpenAI } from "@langchain/openai";

// gpt-oss-20b: reliable structured tool calling on Groq (see llm.ts note).
export const MODEL = "openai/gpt-oss-20b";

/**
 * A LangChain chat model pointed at Groq's OpenAI-compatible endpoint.
 * useResponsesApi:false keeps us on /chat/completions — Groq does NOT implement
 * OpenAI's Responses API, so routing there would break.
 */
export function makeModel() {
  return new ChatOpenAI({
    model: MODEL,
    apiKey: process.env.GROQ_API_KEY,
    configuration: { baseURL: "https://api.groq.com/openai/v1" },
    temperature: 0,
    useResponsesApi: false,
  });
}
