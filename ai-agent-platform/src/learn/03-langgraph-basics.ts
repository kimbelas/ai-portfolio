/**
 * RUNG A3 — The same A2 loop, expressed as a LangGraph StateGraph.
 *
 * Two nodes (agent, tools), a conditional edge (tool_calls? → tools, else END),
 * and shared message state. Identical behavior to your hand-built loop — but
 * now the graph structure is what unlocks checkpoints, HITL, and observability
 * in the next rungs.
 *
 * Run with:  npm run learn:03
 */

import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import { makeModel } from "../lib/model";
import { calculatorTool, planPriceTool } from "../lib/lc-tools";

const tools = [calculatorTool, planPriceTool];
const model = makeModel().bindTools(tools);

async function agent(state: typeof MessagesAnnotation.State) {
  return { messages: [await model.invoke(state.messages)] };
}

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const last = state.messages.at(-1) as AIMessage;
  return last?.tool_calls?.length ? "tools" : END;
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agent)
  .addNode("tools", new ToolNode(tools)) // prebuilt: runs the requested tools
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent")
  .compile();

async function main() {
  const res = await graph.invoke({
    messages: [{ role: "user", content: "What is 4891 * 7723?" }],
  });
  console.log(`final state has ${res.messages.length} messages (user, AI+toolcall, tool, AI-answer)`);
  console.log("answer:", res.messages.at(-1)?.content);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
