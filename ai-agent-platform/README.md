# AI Agent Platform

**Flagship 2 of a senior AI engineer portfolio.** An autonomous agent built from first principles, then on **LangGraph.js** — with the things that make agents survive production: state, human-in-the-loop approval, guardrails, observability, and checkpoints.

> Built rung by rung. The agent loop is built *by hand* first (A1–A2) so LangGraph isn't a black box, then re-expressed with the framework (A3+).

## The ladder

| Rung | Concept | Script |
|------|---------|--------|
| A1 | Tool-calling LLM — the atom of agency | `src/learn/01-tool-call.ts` |
| A2 | The agent loop by hand — LLM + tools + loop + step budget | `src/learn/02-agent-loop.ts` |
| A3 | The loop as a LangGraph `StateGraph` | `src/learn/03-langgraph-basics.ts` |
| A4 | Multi-tool routing (streamed node-by-node) | `src/learn/04-routing.ts` |
| A5 | Human-in-the-loop approval (`interrupt` → `Command({resume})`) | `src/learn/05-hitl.ts` |
| A6 | Guardrails — input validation, injection defense, allow-list, timeout, step budget | `src/learn/06-guardrails.ts` |
| A7 | Observability — per-node trace: tokens, cost, timing | `src/learn/07-observability.ts` |
| A8 | Checkpoints & resumability (MemorySaver + thread_id) | `src/learn/08-checkpoints.ts` |

## Architecture

```
   START ──► agent ──(tool_calls?)──► tools ──► agent ──► ... ──► END
              │  (ChatOpenAI→Groq,      │  custom node:
              │   .bindTools)           │   • allow-list  (guardrail)
              │                         │   • interrupt() for risky tools (HITL)
              │                         │   • timeout     (guardrail)
              └── MessagesAnnotation state, MemorySaver checkpointer ──┘
```

**Modules:** `lib/model.ts` (ChatOpenAI→Groq) · `lib/tools.ts` (raw fns) · `lib/lc-tools.ts` (LangChain `tool()` defs) · `lib/graph.ts` (the StateGraph: HITL + guardrails + checkpointer) · `lib/guardrails.ts` (validation, injection, timeout, retry).

## Stack

**Provider-agnostic, free-tier.** TypeScript · **Groq** `openai/gpt-oss-20b` (OpenAI-compatible, reliable tool calling) · **LangGraph.js 1.x** · zod-validated tools.

## Run

```bash
npm install
cp .env.example .env   # add GROQ_API_KEY (free: https://console.groq.com/keys)
npm run learn:01       # ... through learn:08
```
