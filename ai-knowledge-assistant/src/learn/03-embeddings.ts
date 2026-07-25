/**
 * RUNG 3 — Embeddings (the heart of RAG).
 *
 * An embedding turns text into a VECTOR: a fixed-length array of numbers that
 * captures MEANING. Texts with similar meaning land close together in that
 * space — even when they share no words. We measure "closeness" with cosine
 * similarity. That single idea is the entire engine behind semantic search.
 *
 * Runs 100% locally & free: downloads a ~25MB model once, then works offline.
 *
 * Run with:  npm run learn:03
 */

import { pipeline } from "@huggingface/transformers";

// Cosine similarity = the cosine of the angle between two vectors.
//   1.0  = same direction  (same meaning)
//   0.0  = unrelated
//  -1.0  = opposite
// This is the number semantic search ranks by.
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const documents = [
  "The Pro plan is $9 per month for 1 TB of storage.",
  "All plans use AES-256 encryption.",
  "Acme Cloud Backup runs on Windows, macOS, and Linux.",
];

const query = "How much does the paid plan cost?";

async function main() {
  // A small, classic sentence-embedding model -> 384-dimensional vectors.
  // First run downloads + caches it; later runs are instant and offline.
  console.log("Loading local embedding model (first run downloads ~25MB)...\n");
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  const embed = async (text: string): Promise<number[]> => {
    // pooling "mean" -> ONE vector per sentence (not one per token)
    // normalize true -> unit length (keeps cosine values clean)
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  };

  const queryVec = await embed(query);

  // An embedding is just an array of floats. See it with your own eyes:
  console.log(`An embedding is a vector of ${queryVec.length} numbers. First 5:`);
  console.log(queryVec.slice(0, 5).map((n) => n.toFixed(4)), "\n");

  // Score every document against the query, then rank by similarity.
  const scored = [];
  for (const doc of documents) {
    scored.push({ doc, sim: cosineSimilarity(queryVec, await embed(doc)) });
  }
  scored.sort((a, b) => b.sim - a.sim);

  console.log(`Query: "${query}"\n`);
  console.log("Ranked by cosine similarity (higher = closer in meaning):");
  for (const { doc, sim } of scored) {
    console.log(`  ${sim.toFixed(3)}   ${doc}`);
  }

  console.log(
    '\nThe top hit shares NO words with the query ("cost"/"paid" vs "$9"/"Pro").',
  );
  console.log("Keyword search would miss it. Meaning-based search finds it — that's RAG's engine.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
