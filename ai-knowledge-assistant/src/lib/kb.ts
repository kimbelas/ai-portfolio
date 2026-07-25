import { loadDocuments } from "./ingest";
import { chunkText } from "./chunk";
import { embed } from "./embeddings";
import { InMemoryVectorStore } from "./vectorStore";

/**
 * The "indexing" step: read real documents from knowledge/ -> chunk ->
 * embed EACH ONCE -> store. Done up front so queries are cheap forever after.
 */
export async function buildKnowledgeBase(): Promise<InMemoryVectorStore> {
  const store = new InMemoryVectorStore();
  const docs = loadDocuments();
  const chunks = docs.flatMap((d) => chunkText(d.source, d.text));
  for (const chunk of chunks) {
    store.add(chunk, await embed(chunk.text));
  }
  return store;
}
