/**
 * The agent, as a LangGraph StateGraph — the A2 loop, made durable.
 *
 *   START → agent → (tool_calls? → tools → agent) ... → END
 *
 * The custom tools node adds the senior touches:
 *   - allow-list check (A6)          - tool timeout (A6)
 *   - human-in-the-loop for risky tools via interrupt() (A5)
 * Compiled with a MemorySaver checkpointer (A8), which is also what makes the
 * interrupt/resume in A5 possible.
 */

import { StateGraph, MessagesAnnotation, START, END, MemorySaver, interrupt } from "@langchain/langgraph";
import { AIMessage, ToolMessage, SystemMessage } from "@langchain/core/messages";
import { makeModel } from "./model";
import { TOOLS, TOOLS_BY_NAME, RISKY_TOOLS, ALLOWED_TOOLS } from "./lc-tools";
import { isToolAllowed, withTimeout, validateInput, detectInjection, withRetry } from "./guardrails";

const SYSTEM =
  "You are a careful assistant. Use tools when needed; never guess prices or arithmetic. " +
  "When the user asks to email or notify someone, use the send_email tool.";

export function createAgent() {
  const model = makeModel().bindTools(TOOLS);

  // Input guardrails (A6), wired into the graph — run BEFORE spending any model
  // call. On a violation, short-circuit with a refusal (routed straight to END).
  function firstUserText(messages: any[]): string {
    const m = messages.find((x) => x?._getType?.() === "human") ?? messages[0];
    return typeof m?.content === "string" ? m.content : "";
  }
  function guardNode(state: typeof MessagesAnnotation.State) {
    const text = firstUserText(state.messages as any[]);
    const v = validateInput(text);
    if (!v.ok) return { messages: [new AIMessage(`I can't process that request: ${v.reason}.`)] };
    const inj = detectInjection(text);
    if (!inj.ok) return { messages: [new AIMessage(`Request blocked by a safety guardrail: ${inj.reason}.`)] };
    return { messages: [] };
  }
  function afterGuard(state: typeof MessagesAnnotation.State) {
    // If the guard produced a refusal (an AI message), stop; else proceed.
    return state.messages.at(-1)?._getType?.() === "ai" ? END : "agent";
  }

  async function agentNode(state: typeof MessagesAnnotation.State) {
    // withRetry: survive transient model errors (backoff) instead of crashing the run.
    const res = await withRetry(() => model.invoke([new SystemMessage(SYSTEM), ...state.messages]));
    return { messages: [res] };
  }

  async function toolsNode(state: typeof MessagesAnnotation.State) {
    const last = state.messages.at(-1) as AIMessage;
    const out: ToolMessage[] = [];

    for (const call of last.tool_calls ?? []) {
      const id = call.id!;

      // Guardrail: allow-list.
      if (!isToolAllowed(call.name, ALLOWED_TOOLS)) {
        out.push(new ToolMessage({ tool_call_id: id, content: `Blocked: tool "${call.name}" is not allowed.` }));
        continue;
      }

      // Human-in-the-loop: pause for approval before a risky tool. interrupt()
      // throws on the first pass (graph pauses, state checkpointed); on resume
      // via Command({resume}) it returns that value.
      if (RISKY_TOOLS.has(call.name)) {
        // Resume value must be truthy — LangGraph rejects Command({resume:false})
        // as "empty input", so approvals are encoded as { approved: boolean }.
        const decision: any = interrupt({ type: "approval_request", tool: call.name, args: call.args });
        if (decision?.approved !== true) {
          out.push(new ToolMessage({ tool_call_id: id, content: `The user DECLINED to run ${call.name}. Do not retry; tell the user it was cancelled.` }));
          continue;
        }
      }

      // Guardrail: timeout. Execute the tool (zod-validated by tool()).
      try {
        const tool = TOOLS_BY_NAME[call.name] as { invoke: (args: any) => Promise<unknown> };
        const result = await withTimeout(tool.invoke(call.args), 10_000, call.name);
        out.push(new ToolMessage({ tool_call_id: id, content: String(result) }));
      } catch (err) {
        out.push(new ToolMessage({ tool_call_id: id, content: `Error running ${call.name}: ${(err as Error).message}` }));
      }
    }

    return { messages: out };
  }

  function shouldContinue(state: typeof MessagesAnnotation.State) {
    const last = state.messages.at(-1) as AIMessage;
    return last?.tool_calls?.length ? "tools" : END;
  }

  return new StateGraph(MessagesAnnotation)
    .addNode("guard", guardNode)
    .addNode("agent", agentNode)
    .addNode("tools", toolsNode)
    .addEdge(START, "guard")
    .addConditionalEdges("guard", afterGuard, ["agent", END])
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent")
    .compile({ checkpointer: new MemorySaver() });
}
