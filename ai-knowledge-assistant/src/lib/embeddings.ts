import { pipeline } from "@huggingface/transformers";

// Load the local embedding model once, then reuse it (loading is the slow part).
let _embedder: any = null;
async function getEmbedder() {
  if (!_embedder) {
    _embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return _embedder;
}

/** Turn text into a 384-dim, unit-length vector. Runs locally & free. */
export async function embed(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
