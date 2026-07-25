/**
 * RUNG 4 — Chunk + store (index once, query cheaply).
 *
 * Reads the real documents from knowledge/, splits them into chunks, embeds
 * each ONCE, and stores the vectors — then queries with no re-embedding.
 *
 * Run with:  npm run learn:04
 */

import { loadDocuments } from "../lib/ingest";
import { chunkText } from "../lib/chunk";
import { embed } from "../lib/embeddings";
import { InMemoryVectorStore } from "../lib/vectorStore";

async function main() {
  // 1. INGEST + CHUNK
  const docs = loadDocuments();
  const chunks = docs.flatMap((d) => chunkText(d.source, d.text));
  console.log(`${docs.length} documents -> ${chunks.length} chunks.\n`);
  console.log("Example chunk:", chunks[0], "\n");

  // 2. EMBED ONCE + STORE (rung 3 re-embedded on every query; this doesn't)
  console.log("Embedding each chunk once and storing its vector...");
  const store = new InMemoryVectorStore();
  for (const c of chunks) store.add(c, await embed(c.text));
  console.log(`Indexed ${store.size()} vectors.\n`);

  // 3. QUERY — just cosine over stored vectors
  const q = "How much is the Pro plan?";
  const top = store.search(await embed(q), 2);
  console.log(`Query: "${q}"  ->  top 2 chunks:`);
  for (const { chunk, score } of top) {
    console.log(`  ${score.toFixed(3)}  (${chunk.source}) ${chunk.text.slice(0, 70)}...`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
