import { pipeline } from "@huggingface/transformers";

// Load the local embedding model once, then reuse it (loading is the slow part).
let _embedder: any = null;
async function getEmbedder() {
  if (!_embedder) {
    // q8 (int8-quantized) weights: smaller + faster on CPU, negligible quality
    // loss for this model. Verified to keep the eval recall gate green.
    _embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
  }
  return _embedder;
}

/** Turn text into a 384-dim, unit-length vector. Runs locally & free. */
export async function embed(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

/**
 * Embed many texts, batched — far faster than calling embed() per item, since
 * the model processes a whole batch in one forward pass. Batched in small groups
 * to stay within the free tier's memory. Mean-pooling uses the attention mask, so
 * each vector is identical to the single-text result (retrieval unaffected).
 */
export async function embedBatch(texts: string[], batchSize = 16): Promise<number[][]> {
  if (texts.length === 0) return [];
  const embedder = await getEmbedder();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const t = await embedder(batch, { pooling: "mean", normalize: true });
    for (const row of t.tolist() as number[][]) out.push(row);
  }
  return out;
}
