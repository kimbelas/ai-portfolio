/**
 * Probe: can the platform layer import Flagship 1's RAG across package folders?
 * Each imported module resolves ITS OWN deps from ITS OWN node_modules
 * (Flagship 1's @huggingface/transformers lives in ai-knowledge-assistant/),
 * so this should work with no extra installs here. Retrieval only — no LLM key.
 */

import { buildKnowledgeBase } from "../../ai-knowledge-assistant/src/lib/kb";
import { retrieveReranked } from "../../ai-knowledge-assistant/src/lib/retrieve";

async function main() {
  const store = await buildKnowledgeBase();
  console.log("Flagship 1 KB loaded from the platform layer — chunks:", store.size());
  const hits = await retrieveReranked(store, "What is the API rate limit?", 3);
  console.log("Reranked hits:");
  for (const h of hits) console.log(`  (${h.source}) ${h.text.slice(0, 60)}...`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
