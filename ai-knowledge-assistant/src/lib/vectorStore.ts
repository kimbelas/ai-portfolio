import type { Chunk } from "./chunk";

/** Cosine similarity: 1 = same meaning, 0 = unrelated. The ranking signal. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

export interface StoredChunk extends Chunk {
  vector: number[];
}
export interface ScoredChunk {
  chunk: StoredChunk;
  score: number;
}

/**
 * The simplest possible "vector database": an array of vectors + brute-force
 * nearest-neighbor search. A real vector DB (pgvector, Pinecone) does exactly
 * this, just indexed to stay fast over millions of rows. Same idea.
 */
export class InMemoryVectorStore {
  private items: StoredChunk[] = [];

  add(chunk: Chunk, vector: number[]): void {
    this.items.push({ ...chunk, vector });
  }

  size(): number {
    return this.items.length;
  }

  all(): StoredChunk[] {
    return this.items;
  }

  /** Return the k chunks whose vectors are closest to the query vector. */
  search(queryVec: number[], k: number): ScoredChunk[] {
    return this.items
      .map((chunk) => ({ chunk, score: cosineSimilarity(queryVec, chunk.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
