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

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Multi-turn, streaming, grounded answer — the chat UI's backend.
 *
 * `messages` is the running conversation, ending with the latest user turn.
 * Yields typed events for a transparent UI:
 *   {type:"status"} → {type:"sources"} → {type:"token"}... → {type:"done"}
 *
 * Follow-ups are handled with the standard **condense-then-retrieve** pattern:
 * when there's history we first rewrite the latest turn into a standalone search
 * query (so "what about the Business plan?" retrieves correctly), then retrieve,
 * then stream a grounded answer that also sees the recent history.
 */
export async function* answerChatStream(
  store: InMemoryVectorStore,
  messages: ChatTurn[],
  k = 4,
  retrieve: Retriever = retrieveReranked,
) {
  const latest = messages.at(-1)?.content ?? "";
  const prior = messages.slice(0, -1);

  yield { type: "status" as const, stage: "searching" as const };

  // 1. Condense a follow-up into a standalone search query (only with history).
  let searchQuery = latest;
  if (prior.length > 0) {
    const convo = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");
    const { text } = await chat({
      system:
        "Rewrite the LATEST user message as a standalone search query capturing its full intent — resolve any pronouns or references using the conversation. Output ONLY the query, nothing else.",
      user: `${convo}\n\nStandalone search query:`,
      maxTokens: 60,
    });
    if (text.trim()) searchQuery = text.trim();
  }

  // 2. Retrieve on the standalone query.
  const sources = await retrieve(store, searchQuery, k);
  yield { type: "sources" as const, sources };

  // 3. Stream the grounded answer, giving the model the recent history too.
  const recent = prior.slice(-4);
  const historyText = recent.length
    ? recent.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n") + "\n\n"
    : "";
  const user = `${historyText}Context:\n${buildContext(sources)}\n\nQuestion: ${latest}`;

  let usage: any = null;
  for await (const delta of streamChat({ system: SYSTEM, user, maxTokens: 512 }, (u) => { usage = u; })) {
    yield { type: "token" as const, text: delta };
  }
  yield { type: "done" as const, sources, usage };
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
