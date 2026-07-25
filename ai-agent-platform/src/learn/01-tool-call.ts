/**
 * RUNG A1 — A tool-calling LLM (the atom of agency).
 *
 * The model can't reliably multiply big numbers. Given a tool, it will REQUEST
 * the tool instead of guessing. We execute it, hand back the result, and the
 * model finishes the answer. That request → execute → respond round-trip is
 * the atom every agent is built from.
 *
 * Run with:  npm run learn:01
 */

import { client, MODEL } from "../lib/llm";
import { TOOL_SCHEMAS, runTool } from "../lib/tools";

async function main() {
  const messages: any[] = [
    { role: "user", content: "What is 4891 multiplied by 7723?" },
  ];

  // 1. Ask, offering tools.
  const first = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools: TOOL_SCHEMAS,
  });
  const msg = first.choices[0].message;

  // finish_reason "tool_calls" = "I don't want to answer yet, I want a tool."
  console.log("finish_reason:", first.choices[0].finish_reason);
  console.log("The model requested:");
  console.log(JSON.stringify(msg.tool_calls, null, 2));

  // 2. Execute what it asked for. Append the request to history first.
  messages.push(msg);
  for (const call of msg.tool_calls ?? []) {
    const args = JSON.parse(call.function.arguments); // arguments arrive as a JSON string
    const result = runTool(call.function.name, args);
    console.log(`\nExecuted ${call.function.name}(${JSON.stringify(args)}) -> ${result}`);
    // 3. Feed the result back, linked to the request by tool_call_id.
    messages.push({ role: "tool", tool_call_id: call.id, content: result });
  }

  // 4. Ask again — now the tool result is in context — for the final answer.
  const second = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools: TOOL_SCHEMAS,
  });
  console.log("\nFinal answer:", second.choices[0].message.content);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
