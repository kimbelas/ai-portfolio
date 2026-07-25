/**
 * RUNG 8 — Production layer (streaming, latency meter, a guardrail).
 *
 * The "boring" things that separate a demo from a product:
 *   - Guardrail: refuse BEFORE spending an LLM call if nothing is relevant.
 *   - Streaming: show the answer as it generates (time-to-first-token UX).
 *   - Metrics: measure latency so you can actually reason about the UX.
 *
 * Run with:  npm run learn:08   (needs GROQ_API_KEY)
 */

import { buildKnowledgeBase } from "../lib/kb";
import { answerQuestionStream } from "../lib/rag";
import { embed } from "../lib/embeddings";

// If the closest chunk isn't at least this similar, we don't trust the KB to
// answer — so we refuse cheaply instead of letting the LLM improvise.
const RELEVANCE_FLOOR = 0.25;

async function main() {
  const store = await buildKnowledgeBase();
  const question = "How do I restore a deleted file, and how far back can I go on Pro?";

  // --- Guardrail ---
  const best = store.search(await embed(question), 1)[0];
  console.log(`Top relevance for the question: ${best.score.toFixed(3)} (floor ${RELEVANCE_FLOOR})`);
  if (!best || best.score < RELEVANCE_FLOOR) {
    console.log("Guardrail tripped: no relevant context — refusing without calling the LLM.");
    return;
  }

  // --- Streaming answer + latency meter ---
  const start = performance.now();
  let firstTokenAt = 0;
  process.stdout.write("\nA: ");
  for await (const ev of answerQuestionStream(store, question, 4)) {
    if (ev.type === "token") {
      if (!firstTokenAt) firstTokenAt = performance.now();
      process.stdout.write(ev.text);
    }
  }
  const end = performance.now();

  console.log("\n\n--- production metrics ---");
  console.log(`time to first token: ${Math.round(firstTokenAt - start)} ms`);
  console.log(`total answer time:   ${Math.round(end - start)} ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
