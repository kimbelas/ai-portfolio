/**
 * Deterministic eval-regression GATE for CI.
 *
 * Retrieval recall@k is fully deterministic (local embeddings + cross-encoder
 * rerank, no LLM, no API key), so we can assert it as a build INVARIANT: if the
 * production retriever's recall drops below a floor, the build fails. The
 * LLM-judged metrics (correctness/faithfulness) need GROQ_API_KEY and run
 * separately — this is the always-on guard that keeps quality from silently
 * regressing.
 *
 * Run with:  npm run eval:ci     (no API key needed)
 */

import { buildKnowledgeBase } from "./lib/kb";
import { retrieveReranked } from "./lib/retrieve";
import { DATASET } from "./lib/eval-dataset";
import type { InMemoryVectorStore } from "./lib/vectorStore";

// The production retriever must clear these on the labeled set. Current run is
// 100% recall@1/@3 (see ADR-0004); the floor leaves headroom for noise while
// still failing on a real retrieval regression.
const FLOOR = { recall1: 0.9, recall3: 0.9 };

async function recallOf(store: InMemoryVectorStore) {
  const n = DATASET.length;
  let r1 = 0, r3 = 0;
  for (const c of DATASET) {
    const r = await retrieveReranked(store, c.question, 3);
    if (r.slice(0, 1).some((x) => c.goldSources.includes(x.source))) r1++;
    if (r.slice(0, 3).some((x) => c.goldSources.includes(x.source))) r3++;
  }
  return { recall1: r1 / n, recall3: r3 / n };
}

async function build(): Promise<InMemoryVectorStore> {
  // One retry: the first run downloads the embedding/reranker models, so tolerate
  // a transient network hiccup before failing the build.
  try {
    return await buildKnowledgeBase();
  } catch {
    return await buildKnowledgeBase();
  }
}

async function main() {
  const store = await build();
  const { recall1, recall3 } = await recallOf(store);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  console.log(
    `eval gate · production retriever (hybrid + rerank) · ${DATASET.length} questions\n` +
      `  recall@1 = ${pct(recall1)} (floor ${pct(FLOOR.recall1)})\n` +
      `  recall@3 = ${pct(recall3)} (floor ${pct(FLOOR.recall3)})`,
  );

  const failures: string[] = [];
  if (recall1 < FLOOR.recall1) failures.push(`recall@1 ${pct(recall1)} < floor ${pct(FLOOR.recall1)}`);
  if (recall3 < FLOOR.recall3) failures.push(`recall@3 ${pct(recall3)} < floor ${pct(FLOOR.recall3)}`);

  if (failures.length) {
    console.error(`\n❌ EVAL GATE FAILED: ${failures.join("; ")}`);
    process.exit(1);
  }
  console.log("\n✅ EVAL GATE PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
