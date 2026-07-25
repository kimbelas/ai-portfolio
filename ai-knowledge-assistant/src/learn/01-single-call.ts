/**
 * RUNG 1 — A single LLM call (the atom).
 *
 * We call Groq, which serves fast open models (Llama, etc.) over the
 * OpenAI-compatible API — free within generous rate limits. This same
 * OpenAI-shaped interface is spoken by almost every provider EXCEPT Anthropic,
 * so learning it here is broadly transferable. Later we can point the exact
 * same code at OpenAI, Together, or a local model by changing two lines.
 *
 * Run with:  npm run learn:01
 */

import "dotenv/config";
import OpenAI from "openai";

// Groq speaks the OpenAI protocol, so we use the `openai` SDK but point its
// baseURL at Groq and authenticate with a Groq key. We never hardcode the key.
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

async function main() {
  // One endpoint — chat.completions — is the atom everything is built from.
  // - model:      which model to use (a stable, capable free model on Groq).
  // - max_tokens: a HARD ceiling on the response length the model can't see.
  // - messages:   the conversation so far. The API is STATELESS — you resend
  //               the full history every time; the server remembers nothing.
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "In one sentence, what is a vector embedding?" },
    ],
  });

  // In the OpenAI shape, the answer is a plain STRING at this path.
  // (Anthropic instead returns an ARRAY of typed blocks — a real difference
  //  we'll hide behind our own provider-agnostic interface at a later rung.)
  console.log(response.choices[0].message.content);

  // finish_reason tells you WHY it stopped: "stop" = done naturally,
  // "length" = hit max_tokens (answer truncated), "tool_calls" = wants a tool.
  console.log("\nfinish_reason:", response.choices[0].finish_reason);

  // usage: prompt_tokens = what you sent, completion_tokens = what it generated.
  // On Groq's free tier this costs $0 — but watching usage is the habit that
  // becomes our cost meter at rung 8.
  console.log("--- usage ---");
  console.log(response.usage);
}

// Any thrown error (bad key, rate limit, bad model id, network) lands here.
main().catch((err) => {
  console.error("Request failed:", err);
  process.exit(1);
});
