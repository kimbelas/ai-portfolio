/**
 * PLATFORM DEMO — one system from three flagships.
 *
 * A LangGraph agent (Flagship 2's tech) that consults the RAG knowledge base
 * (Flagship 1, via the search_knowledge_base tool) and does arithmetic, all on
 * the shared ai-kit (model factory + guardrails). The "extensible AI platform"
 * story, running end to end.
 *
 * Run with:  npm run demo   (needs GROQ_API_KEY)
 */

import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { SystemMessage, type AIMessage } from "@langchain/core/messages";
import { makeModel } from "../ai-kit/llm";
import { validateInput, detectInjection } from "../ai-kit/guardrails";
import { TOOLS } from "../tools";

const model = makeModel().bindTools(TOOLS);

const SYSTEM =
  "You are Acme's assistant. For ANY question about Acme's product, you MUST call " +
  "search_knowledge_base first and answer only from what it returns, citing the source " +
  "in parentheses like (compliance). Use calculator for arithmetic. If the knowledge base " +
  "does not contain the answer, say so.";

async function agentNode(state: typeof MessagesAnnotation.State) {
  return { messages: [await model.invoke([new SystemMessage(SYSTEM), ...state.messages])] };
}
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const last = state.messages.at(-1) as AIMessage;
  return last?.tool_calls?.length ? "tools" : END;
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode(TOOLS))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent")
  .compile();

async function main() {
  const q =
    "Does Acme support HIPAA, and what is the API rate limit? Also, the Pro plan is $9/month — what's that per year?";

  // Shared guardrails (ai-kit) run before anything else.
  for (const g of [validateInput(q), detectInjection(q)]) {
    if (!g.ok) return console.log("BLOCKED:", g.reason);
  }

  console.log("Q:", q, "\n");
  for await (const chunk of await graph.stream(
    { messages: [{ role: "user", content: q }] },
    { streamMode: "updates", recursionLimit: 12 },
  )) {
    for (const [node, upd] of Object.entries(chunk)) {
      for (const m of (upd as any)?.messages ?? []) {
        if (node === "agent" && m.tool_calls?.length) {
          console.log("agent → calls:", m.tool_calls.map((t: any) => `${t.name}(${JSON.stringify(t.args)})`).join(", "));
        } else if (node === "agent") {
          console.log("\nagent → FINAL ANSWER:\n" + m.content);
        } else if (node === "tools") {
          console.log(`  ${m.name ?? "tool"} → ${String(m.content).replace(/\s+/g, " ").slice(0, 90)}...`);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
