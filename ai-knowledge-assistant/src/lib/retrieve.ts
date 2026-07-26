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

  const RRF_K = 60;
  const scores = new Map<string, number>();
  const fuse = (ranking: StoredChunk[]) =>
    ranking.forEach((chunk, rank) => {
      scores.set(chunk.id, (scores.get(chunk.id) ?? 0) + 1 / (RRF_K + rank));
    });
  fuse(semantic);
  fuse(keyword);

  const byId = new Map(store.all().map((c) => [c.id, c]));
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id]) => byId.get(id)!);
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
  const ranked = await rerank(query, candidates.map((c) => c.text));
  return ranked.slice(0, k).map((r) => candidates[r.index]);
}
