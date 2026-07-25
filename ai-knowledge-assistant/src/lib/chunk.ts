export interface Chunk {
  id: string;
  source: string;
  text: string;
}

/**
 * Structure-aware chunking: split text into sentences, then greedily pack
 * sentences into windows of ~maxWords, carrying `overlapSentences` from the
 * previous chunk so meaning isn't sliced in half at a boundary.
 *
 * Why chunk at all? Embedding a whole document gives one vague "average"
 * vector. Embedding small, focused chunks gives precise vectors that match
 * specific questions. Chunk size is a real quality lever you tune with evals.
 */
export function chunkText(
  source: string,
  text: string,
  maxWords = 45,
  overlapSentences = 1,
): Chunk[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [clean];

  const chunks: Chunk[] = [];
  let current: string[] = [];
  let wordCount = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push({ id: `${source}#${chunks.length}`, source, text: current.join(" ") });
  };

  for (const sentence of sentences) {
    const words = sentence.split(" ").length;
    if (wordCount + words > maxWords && current.length > 0) {
      flush();
      current = current.slice(-overlapSentences); // carry overlap
      wordCount = current.join(" ").split(" ").length;
    }
    current.push(sentence);
    wordCount += words;
  }
  flush();
  return chunks;
}
