/**
 * A usable CLI over the RAG system.
 *
 *   npm run ask -- "How much is the Pro plan and does it include versioning?"
 *
 * Streams a grounded, cited answer and lists the sources it used.
 */

import { buildKnowledgeBase } from "../lib/kb";
import { answerQuestionStream } from "../lib/rag";
import type { StoredChunk } from "../lib/vectorStore";

async function main() {
  const question = process.argv.slice(2).join(" ").trim();
  if (!question) {
    console.error('Usage: npm run ask -- "your question"');
    process.exit(1);
  }

  const store = await buildKnowledgeBase();

  let sources: StoredChunk[] = [];
  process.stdout.write("\n");
  for await (const ev of answerQuestionStream(store, question, 4)) {
    if (ev.type === "sources") sources = ev.sources;
    else process.stdout.write(ev.text);
  }

  const cited = [...new Set(sources.map((s) => s.source))].join(", ");
  console.log(`\n\nSources: ${cited}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
