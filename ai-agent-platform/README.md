# AI Agent Platform

**Flagship 2 of a senior AI engineer portfolio.** An autonomous agent built from first principles, then on **LangGraph.js** — with the things that make agents survive production: state, human-in-the-loop approval, guardrails, observability, and checkpoints.

[![CI](https://github.com/kimbelas/ai-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/kimbelas/ai-portfolio/actions/workflows/ci.yml)

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
| A9 | Evaluation — tool-selection accuracy, task success, HITL-gate check | `src/learn/09-evals.ts` |

## Architecture

```
   START ─► guard ─► agent ─(tool_calls?)─► tools ─► agent ─► … ─► END
             │         │ (ChatOpenAI→Groq,   │ custom node:
   input validation +  │  wrapped in         │  • allow-list   (guardrail)
   injection scan;     │  withRetry)         │  • interrupt() for risky tools (HITL)
   refuse → END        │                     │  • timeout      (guardrail)
                       └ MessagesAnnotation state, MemorySaver checkpointer ┘
```

The guardrails are **wired into the shipped graph**, not just demoed: the `guard`
node runs `validateInput` + `detectInjection` before any model call (refuse →
END), the agent's model call is wrapped in `withRetry`, and the tools node
enforces the allow-list, a per-tool timeout, and the HITL interrupt.

**Modules:** `lib/model.ts` (ChatOpenAI→Groq) · `lib/tools.ts` (raw fns) · `lib/lc-tools.ts` (LangChain `tool()` defs) · `lib/graph.ts` (the StateGraph: guard + HITL + guardrails + retry + checkpointer) · `lib/guardrails.ts` (validation, injection, timeout, retry).

## Evaluation

`npm run eval` runs the agent over a labelled task set and measures what "reliable" actually means for an agent:

| metric | result |
|---|---|
| tool-selection accuracy | **100% (6/6)** |
| task success | **100% (6/6)** |
| HITL gate on risky tool | **PASS** — `send_email` pauses for approval, never fires silently |

Tool-selection also checks the agent does *not* reach for a tool when none is needed. *(Small task set, single run, temp 0 — a regression guard, not a leaderboard.)* The pure tool logic is also unit-tested (`npm test`) and typechecked in CI.

## Stack

**Provider-agnostic, free-tier.** TypeScript · **Groq** `openai/gpt-oss-20b` (OpenAI-compatible, reliable tool calling) · **LangGraph.js 1.x** · zod-validated tools.

## Run

```bash
npm install
cp .env.example .env   # add GROQ_API_KEY (free: https://console.groq.com/keys)
npm run learn:01       # ... through learn:09, the guided build
npm run eval           # agent eval: tool-selection + task success + HITL gate
npm test               # unit tests (deterministic — no API key)
npm run typecheck      # tsc --noEmit
npm run web            # serve the agent over HTTP (HITL approval) → http://localhost:8788
```

## Deploy — the agent as an HTTP service

`npm run web` serves the agent over HTTP with **human-in-the-loop approval across requests**:

- `POST /api/agent` `{ message }` → runs the agent. If it wants a risky tool (`send_email`) it **pauses** and returns `{ status: "needs_approval", threadId, request }`.
- `POST /api/agent/resume` `{ threadId, approved }` → resumes the paused run.
- Every response includes the tool calls made and a **token/cost readout**. `GET /health` for liveness.

Real, verified run (approve branch):

```
POST /api/agent  {"message":"Email dana@acme.com the price of the Business plan, subject Quote."}
 → needs_approval: send_email(to=dana@acme.com, subject=Quote, body="…25 USD per month.")
POST /api/agent/resume  {"threadId":"…","approved":true}
 → "✅ Email sent to dana@acme.com…"   toolCalls: get_plan_price, send_email · 1190 tokens
```

Deny instead (`approved:false`) → *"the email was not sent"* and `send_email` never executes.

**Deploy:** the repo's `render.yaml` includes a free Node service for this app (`rootDir: ai-agent-platform`, `npm run web`, `GROQ_API_KEY` as a dashboard secret) — the same one-blueprint flow as Flagship 1.

**Honest limitation:** HITL state uses the graph's in-process `MemorySaver`, so a paused run resumes fine within a live instance but is lost if the instance restarts mid-approval. A durable checkpointer (SQLite/Postgres) is the production upgrade; it's deferred to keep the free-tier deploy free of native build dependencies.
