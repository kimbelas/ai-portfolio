import { embed } from "./embeddings";
import { rerank } from "./rerank";
import type { InMemoryVectorStore, StoredChunk } from "./vectorStore";

const STOPWORDS = new Set(
  "the a an of to for and or is are do does how what which my your can i on in at it as with".split(" "),
);
function tokens(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9$]+/g)?.filter((t) => !STOPWORDS.has(t)) ?? [];
}

/** Keyword ranking: how many of the query's words appear in each chunk. */
function keywordRanking(store: InMemoryVectorStore, query: string): StoredChunk[] {
  const qTerms = new Set(tokens(query));
  return store
    .all()
    .map((chunk) => {
      let hits = 0;
      for (const t of tokens(chunk.text)) if (qTerms.has(t)) hits++;
      return { chunk, score: hits };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.chunk);
}

/** Pure meaning-based retrieval (rung 3's idea, now over the stored index). */
export async function retrieveSemantic(
  store: InMemoryVectorStore,
  query: string,
  k: number,
): Promise<StoredChunk[]> {
  const qVec = await embed(query);
  return store.search(qVec, k).map((s) => s.chunk);
}

// rrfFuse lives in a dependency-free module (fusion.ts) so unit tests can import
// it without loading the embedding/reranker runtime. Re-exported for callers.
import { rrfFuse } from "./fusion";
export { rrfFuse };

/**
 * Hybrid retrieval: fuse the semantic ranking and the keyword ranking using
 * Reciprocal Rank Fusion (RRF). RRF rewards chunks that BOTH rankers place
 * near the top, and needs no shared score scale. Robust to paraphrased
 * questions (semantic) AND exact-term lookups like "AES-256" (keyword).
 */
export async function retrieveHybrid(
  store: InMemoryVectorStore,
  query: string,
  k: number,
): Promise<StoredChunk[]> {
  const qVec = await embed(query);
  const semantic = store.search(qVec, store.size()).map((s) => s.chunk);
  const keyword = keywordRanking(store, query);
  return rrfFuse([semantic, keyword], k);
}

/**
 * Hybrid retrieval + cross-encoder rerank. Retrieve a WIDE candidate set with
 * hybrid, then re-score each (query, chunk) pair with the cross-encoder and
 * keep the top-k. This is what pulls a truly-relevant chunk that hybrid buried
 * at rank ~8 up into the top-k — the reranker's whole job.
 */
export async function retrieveReranked(
  store: InMemoryVectorStore,
  query: string,
  k: number,
  candidateN = 15,
): Promise<StoredChunk[]> {
  const candidates = await retrieveHybrid(store, query, candidateN);
  if (candidates.length <= k) return candidates.slice(0, k);
  // Reranking is best-effort: if the cross-encoder can't load (e.g. a flaky
  // model download on a fresh host), degrade gracefully to the hybrid ranking
  // rather than failing the whole answer. Locally the model loads, so this path
  // is never taken and the eval numbers are unaffected.
  try {
    const ranked = await rerank(query, candidates.map((c) => c.text));
    return ranked.slice(0, k).map((r) => candidates[r.index]);
  } catch (e) {
    console.error("[retrieve] reranker unavailable — falling back to hybrid:", (e as Error).message);
    return candidates.slice(0, k);
  }
}
