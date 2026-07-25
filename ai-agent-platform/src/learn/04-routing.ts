/**
 * RUNG A4 — Multi-tool routing.
 *
 * Give the agent several tools and a task that needs two of them in sequence.
 * We stream the graph node-by-node (streamMode: "updates") to watch it route:
 * agent → tools(get_plan_price) → agent → tools(calculator) → agent → END.
 *
 * Run with:  npm run learn:04
 */

import { createAgent } from "../lib/graph";

async function main() {
  const agent = createAgent();
  const config = { configurable: { thread_id: "route-1" }, recursionLimit: 12 };
  const input = {
    messages: [
      { role: "user", content: "How much does the Pro plan cost in total if I pay monthly for 2 years?" },
    ],
  };

  console.log("Streaming node-by-node:\n");
  for await (const chunk of await agent.stream(input, { ...config, streamMode: "updates" })) {
    for (const [node, update] of Object.entries(chunk)) {
      for (const m of (update as any)?.messages ?? []) {
        if (node === "agent" && m.tool_calls?.length) {
          console.log("agent  → wants:", m.tool_calls.map((t: any) => `${t.name}(${JSON.stringify(t.args)})`).join(", "));
        } else if (node === "agent") {
          console.log("agent  → FINAL:", m.content);
        } else if (node === "tools") {
          console.log("tools  →", m.content);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
