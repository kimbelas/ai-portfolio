/**
 * RUNG A7 — Observability.
 *
 * You can't run agents in production if you can't see what they did. We stream
 * the graph node-by-node and record a trace: which node ran, what it did,
 * token usage (from usage_metadata), and elapsed time — then a cost total.
 *
 * Run with:  npm run learn:07   (needs GROQ_API_KEY)
 */

import { createAgent } from "../lib/graph";
import { estimateCostUSD } from "../lib/llm";

async function main() {
  const agent = createAgent();
  const config = { configurable: { thread_id: "obs-1" }, recursionLimit: 12 };
  const input = {
    messages: [{ role: "user", content: "What is the Pro plan's total cost for 2 years billed monthly?" }],
  };

  const t0 = performance.now();
  let inTok = 0, outTok = 0, step = 0;

  console.log("step | node  | detail                                  | tokens in/out | ms");
  console.log("-----+-------+-----------------------------------------+---------------+-----");
  for await (const chunk of await agent.stream(input, { ...config, streamMode: "updates" })) {
    for (const [node, update] of Object.entries(chunk)) {
      step++;
      const m = ((update as any)?.messages ?? []).at(-1);
      let detail = "";
      if (node === "agent" && m?.tool_calls?.length) detail = "calls " + m.tool_calls.map((t: any) => t.name).join(", ");
      else if (node === "agent") detail = "final answer";
      else if (node === "tools") detail = String(m?.content).slice(0, 39);

      const u = m?.usage_metadata;
      if (u) { inTok += u.input_tokens; outTok += u.output_tokens; }
      const tokStr = u ? `${u.input_tokens}/${u.output_tokens}` : "-";
      const ms = Math.round(performance.now() - t0);
      console.log(`${String(step).padEnd(4)} | ${node.padEnd(5)} | ${detail.padEnd(39)} | ${tokStr.padStart(13)} | ${ms}`);
    }
  }

  const cost = estimateCostUSD({ prompt_tokens: inTok, completion_tokens: outTok });
  console.log(`\nTOTAL: ${inTok} in / ${outTok} out tokens  ~$${cost.toFixed(5)} at $3/$15 frontier rates ($0 on Groq free)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
