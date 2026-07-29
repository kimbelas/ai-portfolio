/**
 * Build the EVAL knowledge base — the product corpus (`knowledge/`, Acme) PLUS
 * an extra domain (`eval-corpus/`, the Cobalt e-bike docs). This lets the eval
 * test cross-domain retrieval WITHOUT changing what the shipped product answers
 * (the deployed app still builds an Acme-only store via `buildKnowledgeBase`).
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadDocuments } from "./ingest";
import { chunkText } from "./chunk";
import { embedBatch } from "./embeddings";
import { InMemoryVectorStore } from "./vectorStore";

const EVAL_CORPUS = resolve(dirname(fileURLToPath(import.meta.url)), "../../eval-corpus");

export async function buildEvalKnowledgeBase(): Promise<InMemoryVectorStore> {
  const store = new InMemoryVectorStore();
  const docs = [...loadDocuments(), ...loadDocuments(EVAL_CORPUS)]; // knowledge/ + eval-corpus/
  const chunks = docs.flatMap((d) => chunkText(d.source, d.text));
  const vectors = await embedBatch(chunks.map((c) => c.text));
  chunks.forEach((c, i) => store.add(c, vectors[i]));
  return store;
}
