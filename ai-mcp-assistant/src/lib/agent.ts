import "dotenv/config";
import OpenAI from "openai";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { textOf } from "./mcp";

const MODEL = "openai/gpt-oss-120b";
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Groq occasionally emits malformed tool-call JSON (400 tool_use_failed).
// It's stochastic, so re-roll a few times — a simple, real reliability guard.
async function createWithRetry(params: any, tries = 4): Promise<any> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (err: any) {
      lastErr = err;
      const code = err?.code ?? err?.error?.code;
      if (code === "tool_use_failed" && i < tries - 1) continue;
      throw err;
    }
  }
  throw lastErr;
}

const SYSTEM =
  "You are a codebase assistant. Use the provided tools to inspect the code before answering. " +
  "Prefer search_code to locate things and read_file to confirm. Cite files and line numbers " +
  "(file:line) in your answer. If the code doesn't contain the answer, say so.";

/** MCP tools (JSON-Schema inputSchema) -> OpenAI/Groq function-tool defs. */
async function toolsForLLM(client: Client) {
  const { tools } = await client.listTools();
  return tools.map((t: any) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: t.inputSchema ?? { type: "object", properties: {} },
    },
  }));
}

/**
 * Agentic loop: the LLM plans, calls MCP tools (executed via the client),
 * and gets results back until it produces a final answer. A step budget
 * prevents runaway loops.
 */
export async function askCodebase(
  client: Client,
  question: string,
  opts: { verbose?: boolean; onTool?: (name: string, args: any) => void } = {},
): Promise<string> {
  const tools = await toolsForLLM(client);
  const messages: any[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: question },
  ];

  for (let step = 0; step < 8; step++) {
    const res = await createWithRetry({ model: MODEL, messages, tools });
    const msg = res.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) return msg.content ?? "";

    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || "{}");
      opts.onTool?.(call.function.name, args);
      if (opts.verbose) console.log(`  ↳ ${call.function.name}(${JSON.stringify(args)})`);
      const result = await client.callTool({ name: call.function.name, arguments: args });
      messages.push({ role: "tool", tool_call_id: call.id, content: textOf(result) });
    }
  }
  return "(stopped: step budget reached without a final answer)";
}
