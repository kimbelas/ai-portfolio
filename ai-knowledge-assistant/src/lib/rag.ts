import { chat, streamChat } from "./llm";
import { retrieveReranked } from "./retrieve";
import type { InMemoryVectorStore, StoredChunk } from "./vectorStore";

// A retrieval strategy: (store, query, k) -> top-k chunks. Pluggable so the
// eval can compare hybrid vs hybrid+rerank against the same answer pipeline.
export type Retriever = (
  store: InMemoryVectorStore,
  q: string,
  k: number,
) => Promise<StoredChunk[]>;

// The grounding contract: answer ONLY from context, cite sources, and refuse
// when the answer isn't there. This is what turns an LLM into a trustworthy
// document assistant instead of a confident guesser.
const SYSTEM = `You are a support assistant. Answer the user's question using ONLY the numbered context passages provided. Cite the passages you use with their numbers in square brackets, e.g. [1]. If the answer is not contained in the context, reply exactly: "I don't know based on the provided documents." Never use outside knowledge.`;

function buildContext(chunks: StoredChunk[]): string {
  return chunks.map((c, i) => `[${i + 1}] (${c.source}) ${c.text}`).join("\n\n");
}

export interface RagResult {
  answer: string;
  sources: StoredChunk[];
  usage: any;
}

/** Retrieve -> stuff context into the prompt -> generate a grounded answer.
 *  Defaults to reranked retrieval (best quality); pass a retriever to compare. */
export async function answerQuestion(
  store: InMemoryVectorStore,
  question: string,
  k = 4,
  retrieve: Retriever = retrieveReranked,
): Promise<RagResult> {
  const sources = await retrieve(store, question, k);
  const { text, usage } = await chat({
    system: SYSTEM,
    user: `Context:\n${buildContext(sources)}\n\nQuestion: ${question}`,
    maxTokens: 512,
  });
  return { answer: text, sources, usage };
}

/** Same, but streams the answer token-by-token (for a responsive UI). */
export async function* answerQuestionStream(
  store: InMemoryVectorStore,
  question: string,
  k = 4,
  retrieve: Retriever = retrieveReranked,
) {
  const sources = await retrieve(store, question, k);
  yield { type: "sources" as const, sources };
  for await (const delta of streamChat({
    system: SYSTEM,
    user: `Context:\n${buildContext(sources)}\n\nQuestion: ${question}`,
    maxTokens: 512,
  })) {
    yield { type: "token" as const, text: delta };
  }
}
