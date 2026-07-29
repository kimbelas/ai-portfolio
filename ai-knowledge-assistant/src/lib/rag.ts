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

// The grounding contract (SYSTEM prompt + untrusted-context wrapping) lives in a
// dependency-free module so unit tests can import it without loading the local
// embedding/reranker runtime. Re-exported here for existing importers.
import { SYSTEM, buildContext } from "./grounding";
export { SYSTEM, buildContext };

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
