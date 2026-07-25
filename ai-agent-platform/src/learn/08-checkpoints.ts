/**
 * RUNG A8 — Checkpoints & resumability.
 *
 * The MemorySaver checkpointer persists graph state per thread_id. That single
 * fact powers two things:
 *   1. Resumability — a run paused at an interrupt (A5) can be resumed later,
 *      in a SEPARATE invocation, because its state was checkpointed.
 *   2. Memory — a follow-up on the same thread_id remembers the conversation.
 *
 * Run with:  npm run learn:08   (needs GROQ_API_KEY)
 */

import { Command } from "@langchain/langgraph";
import { createAgent } from "../lib/graph";

async function main() {
  const agent = createAgent(); // holds one MemorySaver across all invokes below
  const config = { configurable: { thread_id: "session-42" }, recursionLimit: 12 };

  // 1. Start a task that pauses for approval. Its state is checkpointed.
  console.log("--- invoke #1: triggers HITL, then we stop ---");
  let res: any = await agent.invoke(
    { messages: [{ role: "user", content: "Email the Pro plan price to bob@example.com." }] },
    config,
  );
  console.log("paused at interrupt?", !!res.__interrupt__, "→ state saved under thread_id, awaiting a human.");

  // 2. A completely separate invocation resumes the SAME thread from the pause.
  console.log("\n--- invoke #2: resume the checkpointed run (approve) ---");
  res = await agent.invoke(new Command({ resume: { approved: true } }), config);
  console.log("resumed & finished:", res.messages.at(-1)?.content);

  // 3. Follow-up on the same thread — the agent remembers the prior turn.
  console.log("\n--- invoke #3: follow-up on same thread (memory) ---");
  res = await agent.invoke(
    { messages: [{ role: "user", content: "Take the price you just emailed and multiply it by 12." }] },
    config,
  );
  console.log("answer:", res.messages.at(-1)?.content);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
