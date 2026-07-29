/**
 * Reciprocal Rank Fusion — a DEPENDENCY-FREE module (only a type import) so it
 * can be unit-tested without pulling `retrieve.ts`'s embedding/reranker runtime.
 * `retrieve.ts` re-exports it.
 *
 * RRF merges several rankings of the same items into one, rewarding items that
 * MULTIPLE rankers place near the top, using rank position (not raw scores), so
 * no shared score scale is needed.
 */

import type { StoredChunk } from "./vectorStore";

export function rrfFuse(rankings: StoredChunk[][], k: number, rrfK = 60): StoredChunk[] {
  const scores = new Map<string, number>();
  const byId = new Map<string, StoredChunk>();
  for (const ranking of rankings) {
    ranking.forEach((chunk, rank) => {
      scores.set(chunk.id, (scores.get(chunk.id) ?? 0) + 1 / (rrfK + rank));
      byId.set(chunk.id, chunk);
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id]) => byId.get(id)!);
}
