/**
 * Cross-encoder reranker (local, free). A bi-encoder (our embedding model)
 * scores query and passage SEPARATELY; a cross-encoder reads (query, passage)
 * TOGETHER, so it judges relevance far more accurately. Too expensive to run
 * over the whole corpus — we run it only on the top-N candidates from retrieval.
 *
 * Model: Xenova/ms-marco-MiniLM-L-6-v2 (single relevance logit). Runs on-device.
 */

import { AutoTokenizer, AutoModelForSequenceClassification } from "@huggingface/transformers";

const MODEL_ID = "Xenova/ms-marco-MiniLM-L-6-v2";

let _tokenizer: any = null;
let _model: any = null;

async function getReranker() {
  if (!_tokenizer || !_model) {
    [_tokenizer, _model] = await Promise.all([
      AutoTokenizer.from_pretrained(MODEL_ID),
      // q8 -> ~23MB quantized weights (downloaded once, then cached)
      AutoModelForSequenceClassification.from_pretrained(MODEL_ID, { dtype: "q8" }),
    ]);
  }
  return { tokenizer: _tokenizer, model: _model };
}

/** Score each passage against the query; return indices sorted best-first. */
export async function rerank(
  query: string,
  passages: string[],
): Promise<{ index: number; score: number }[]> {
  if (passages.length === 0) return [];
  const { tokenizer, model } = await getReranker();

  // Cross-encoder input: query as `text`, passage as `text_pair` ->
  // [CLS] query [SEP] passage [SEP]. Tokenizer call is synchronous.
  const inputs = tokenizer(Array(passages.length).fill(query), {
    text_pair: passages,
    padding: true,
    truncation: true,
  });

  const { logits } = await model(inputs); // Tensor, shape [N, 1]
  // Single-logit head: the raw logit IS the relevance. sigmoid() -> 0..1 is
  // monotonic (doesn't change order), handy for display/thresholds.
  const scores = (logits.sigmoid().tolist() as number[][]).map((row) => row[0]);

  return scores
    .map((score, index) => ({ index, score }))
    .sort((a, b) => b.score - a.score);
}
