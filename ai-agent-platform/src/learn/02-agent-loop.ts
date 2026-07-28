/**
 * RUNG A2 — The agent loop, by hand.
 *
 * An "agent" is just: LLM + tools + a LOOP + a stop condition. Keep calling the
 * model; whenever it asks for tools, run them and feed results back; stop when
 * it stops asking. Add a STEP BUDGET so a confused agent can't loop forever
 * (your first agent guardrail).
 *
 * The task below needs TWO tools in sequence — look up the price, THEN do the
 * math — so you'll watch the agent plan a multi-step solution on its own.
 *
 * Run with:  npm run learn:02
 */

import { client, MODEL } from "../lib/llm";
import { TOOL_SCHEMAS, runTool } from "../lib/tools";

const MAX_STEPS = 6; // guardrail: hard ceiling on loop iterations

async function runAgent(task: string) {
  console.log(`TASK: ${task}\n`);
  const messages: any[] = [
    {
      role: "system",
      content:
        "You are a careful assistant. Use tools when needed; never guess prices or arithmetic.",
    },
    { role: "user", content: task },
  ];

  for (let step = 1; step <= MAX_STEPS; step++) {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOL_SCHEMAS,
    });
    const msg = res.choices[0].message;
    messages.push(msg);

    // No tool calls -> the agent is done.
    if (!msg.tool_calls?.length) {
      console.log(`\n[step ${step}] DONE:\n${msg.content}`);
      return;
    }

    // Otherwise execute every requested tool and feed the results back.
    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue; // OpenAI v6 tool_calls is a union; we only use function tools
      const args = JSON.parse(call.function.arguments);
      const result = runTool(call.function.name, args);
      console.log(`[step ${step}] ${call.function.name}(${JSON.stringify(args)}) -> ${result}`);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  console.log(`\n[stopped] hit MAX_STEPS=${MAX_STEPS} without finishing.`);
}

async function main() {
  await runAgent("How much does the Pro plan cost in total if I pay monthly for 2 years?");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
