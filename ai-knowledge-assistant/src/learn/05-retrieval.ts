/**
 * RUNG 5 — Retrieval: semantic vs hybrid.
 *
 * Semantic search is great at meaning but can miss exact terms (product names,
 * codes). Keyword search is the opposite. HYBRID fuses both (Reciprocal Rank
 * Fusion) so you get the strengths of each.
 *
 * Run with:  npm run learn:05
 */

import { buildKnowledgeBase } from "../lib/kb";
import { retrieveSemantic, retrieveHybrid } from "../lib/retrieve";

async function main() {
  const store = await buildKnowledgeBase();
  console.log(`Knowledge base: ${store.size()} chunks.\n`);

  const queries = [
    "Can Acme staff read my files?", // paraphrase -> semantic shines
    "AES-256 encryption", // exact term -> keyword helps
  ];

  for (const q of queries) {
    const sem = await retrieveSemantic(store, q, 3);
    const hyb = await retrieveHybrid(store, q, 3);
    console.log(`Query: "${q}"`);
    console.log("  semantic top-3:", sem.map((c) => c.source).join(", "));
    console.log("  hybrid   top-3:", hyb.map((c) => c.source).join(", "));
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
