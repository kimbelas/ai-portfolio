/**
 * RUNG A5 — Human-in-the-loop approval.
 *
 * The agent wants to call a RISKY tool (send_email). The graph pauses at
 * interrupt(), surfaces the proposed action, and waits. We resume with
 * Command({resume: true/false}) to approve or reject. Nothing risky happens
 * without a human's OK — the headline "don't fall over" feature.
 *
 * Run with:  npm run learn:05   (needs GROQ_API_KEY)
 */

import { Command } from "@langchain/langgraph";
import { createAgent } from "../lib/graph";

async function run(threadId: string, decision: boolean) {
  const agent = createAgent();
  const config = { configurable: { thread_id: threadId }, recursionLimit: 12 };
  const input = {
    messages: [{ role: "user", content: "Email a summary of the Pro plan pricing to alice@example.com." }],
  };

  let res: any = await agent.invoke(input, config);

  if (res.__interrupt__) {
    const req = res.__interrupt__[0].value;
    console.log(`[HITL] agent proposes: ${req.tool}(${JSON.stringify(req.args)})`);
    console.log(`[HITL] human decision: ${decision ? "APPROVE ✅" : "REJECT ❌"}`);
    res = await agent.invoke(new Command({ resume: { approved: decision } }), config);
  }

  console.log("final:", res.messages.at(-1)?.content, "\n");
}

async function main() {
  console.log("=== Case 1: APPROVE ===");
  await run("hitl-approve", true);
  console.log("=== Case 2: REJECT ===");
  await run("hitl-reject", false);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
