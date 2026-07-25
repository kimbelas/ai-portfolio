/**
 * RUNG 6 — The RAG loop (retrieve -> ground -> cite -> "I don't know").
 *
 * This is the whole thing wired together: find relevant chunks, put them in
 * the prompt, and have the LLM answer FROM them with citations — and refuse
 * when the answer isn't in the documents.
 *
 * Run with:  npm run learn:06   (needs GROQ_API_KEY)
 */

import { buildKnowledgeBase } from "../lib/kb";
import { answerQuestion } from "../lib/rag";
import { estimateCostUSD } from "../lib/llm";
import type { InMemoryVectorStore } from "../lib/vectorStore";

async function ask(store: InMemoryVectorStore, q: string) {
  console.log(`\nQ: ${q}`);
  const { answer, sources, usage } = await answerQuestion(store, q, 4);
  console.log("Retrieved:", sources.map((s) => s.source).join(", "));
  console.log("A:", answer);
  console.log(
    `(tokens: ${usage.prompt_tokens} in / ${usage.completion_tokens} out` +
      ` — ~$${estimateCostUSD(usage).toFixed(5)} at $3/$15 frontier rates; $0 on Groq free)`,
  );
}

async function main() {
  const store = await buildKnowledgeBase();

  // In-corpus -> grounded, cited answers.
  await ask(store, "How much does the Pro plan cost and what does it include?");
  await ask(store, "If I cancel my subscription, how long can I still access my data?");

  // Out-of-corpus -> the model must REFUSE instead of hallucinating.
  await ask(store, "Does Acme offer a lifetime license, and what is the CEO's name?");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
