/**
 * Platform tools — this is where the flagships COMPOSE. The
 * `search_knowledge_base` tool is Flagship 1's RAG (hybrid + rerank), exposed
 * as a LangChain tool so a Flagship-2-style agent can consult it.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
// Import Flagship 1's RAG across the monorepo. Its modules resolve their own
// deps (transformers, etc.) from ai-knowledge-assistant/node_modules.
import { buildKnowledgeBase } from "../../ai-knowledge-assistant/src/lib/kb";
import { retrieveReranked } from "../../ai-knowledge-assistant/src/lib/retrieve";

// Build Flagship 1's knowledge base once, lazily, on first tool use.
let _store: Awaited<ReturnType<typeof buildKnowledgeBase>> | null = null;
async function knowledgeBase() {
  if (!_store) _store = await buildKnowledgeBase();
  return _store;
}

export const searchKnowledgeBase = tool(
  async ({ query }) => {
    const hits = await retrieveReranked(await knowledgeBase(), query, 4);
    return hits.map((h, i) => `[${i + 1}] (${h.source}) ${h.text}`).join("\n\n");
  },
  {
    name: "search_knowledge_base",
    description:
      "Search Acme's product knowledge base (RAG: hybrid retrieval + reranking over the docs) and return relevant passages with their source. Use for ANY question about Acme's product, plans, pricing, security, API, compliance, etc.",
    schema: z.object({ query: z.string().describe("What to look up in the knowledge base") }),
  },
);

export const calculator = tool(
  async ({ expression }) => {
    if (!/^[0-9+\-*/(). ]+$/.test(expression)) return `Error: invalid expression "${expression}"`;
    try {
      return String(Function(`"use strict"; return (${expression});`)());
    } catch {
      return `Error: could not evaluate "${expression}"`;
    }
  },
  {
    name: "calculator",
    description: "Evaluate a basic arithmetic expression, e.g. '9 * 12'.",
    schema: z.object({ expression: z.string().describe("An arithmetic expression") }),
  },
);

export const TOOLS = [searchKnowledgeBase, calculator];
