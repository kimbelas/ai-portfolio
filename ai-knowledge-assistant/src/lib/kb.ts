import { loadDocuments } from "./ingest";
import { chunkText } from "./chunk";
import { embedBatch } from "./embeddings";
import { InMemoryVectorStore } from "./vectorStore";

/**
 * The "indexing" step: read real documents from knowledge/ -> chunk ->
 * embed EACH ONCE -> store. Done up front so queries are cheap forever after.
 */
export async function buildKnowledgeBase(): Promise<InMemoryVectorStore> {
  const store = new InMemoryVectorStore();
  const docs = loadDocuments();
  const chunks = docs.flatMap((d) => chunkText(d.source, d.text));
  const vectors = await embedBatch(chunks.map((c) => c.text));
  chunks.forEach((c, i) => store.add(c, vectors[i]));
  return store;
}
