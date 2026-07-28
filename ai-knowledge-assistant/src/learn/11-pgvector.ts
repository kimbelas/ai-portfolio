/**
 * RUNG 11 — Graduate the vector store to Postgres + pgvector (see ADR-0006).
 *
 * Rungs 3–4 used a brute-force in-memory array. That's perfect for learning and
 * fine for 37 chunks, but a real system persists embeddings in a database and
 * does nearest-neighbour search with an ANN index. Here we do exactly that with
 * `PgVectorStore` — real pgvector SQL (`vector` column, `<=>` cosine, ANN index)
 * running on EMBEDDED Postgres (PGlite/WASM): no Docker, no cloud account.
 *
 * We (1) index the same knowledge base into pgvector, (2) show retrieval parity
 * with the in-memory store on a few queries, and (3) produce a grounded, cited
 * answer whose context was retrieved straight from the database.
 *
 * Run with:  npm run learn:11     (needs GROQ_API_KEY for the final answer)
 */

import { loadDocuments } from "../lib/ingest";
import { chunkText } from "../lib/chunk";
import { embed } from "../lib/embeddings";
import { PgVectorStore } from "../lib/pgVectorStore";
import { answerQuestion, type Retriever } from "../lib/rag";
import type { StoredChunk } from "../lib/vectorStore";

async function main() {
  const store = new PgVectorStore(); // embedded pgvector, dim 384 (all-MiniLM-L6-v2)

  // (1) Index: same ingest → chunk → embed pipeline, into pgvector.
  const chunks = loadDocuments().flatMap((d) => chunkText(d.source, d.text));
  for (const c of chunks) await store.add(c, await embed(c.text));
  console.log(`Indexed ${await store.size()} chunks into pgvector · ANN index: ${store.indexType}\n`);

  // (2) Retrieval parity: cosine search via SQL should surface the right doc.
  const checks: [string, string][] = [
    ["Is Acme HIPAA compliant?", "compliance"],
    ["What is the API rate limit?", "api"],
    ["Does Acme support SAML single sign-on?", "enterprise"],
    ["Can Acme staff read my files?", "security"],
  ];
  console.log("pgvector semantic retrieval (top-1 source):");
  for (const [q, expected] of checks) {
    const [top] = await store.search(await embed(q), 1);
    const ok = top?.chunk.source === expected ? "✓" : "✗";
    console.log(`  ${ok} "${q}" -> ${top?.chunk.source} (cosine ${top?.score.toFixed(3)})`);
  }

  // (3) A full grounded answer, retrieving context from pgvector via `<=>`.
  const retrievePg: Retriever = async (_store, question, k) =>
    (await store.search(await embed(question), k)).map((h) => h.chunk) as StoredChunk[];

  const q = "Can I use my own encryption keys?";
  const { answer, sources } = await answerQuestion(null as any, q, 4, retrievePg);
  console.log(`\nGrounded answer (context retrieved from pgvector):`);
  console.log(`Q: ${q}`);
  console.log(`A: ${answer}`);
  console.log(`sources: ${[...new Set(sources.map((s) => s.source))].join(", ")}`);

  await store.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
