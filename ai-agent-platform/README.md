# AI Agent Platform

**Flagship 2 of a senior AI engineer portfolio.** An autonomous agent built from first principles, then on **LangGraph.js** — with the things that make agents survive production: state, human-in-the-loop approval, guardrails, retries, and checkpoints.

> Built rung by rung. The agent loop is built *by hand* first (so LangGraph isn't a black box), then re-expressed with the framework.

## The ladder

| Rung | Concept | Script |
|------|---------|--------|
| A1 | Tool-calling LLM — the atom of agency | `src/learn/01-tool-call.ts` |
| A2 | The agent loop by hand — LLM + tools + loop + step budget | `src/learn/02-agent-loop.ts` |
| A3 | State & graph with LangGraph.js | *(next)* |
| A4 | Multi-tool routing | |
| A5 | Human-in-the-loop approval (interrupt → resume) | |
| A6 | Guardrails — input validation, injection defense, allow-lists, retries, timeouts | |
| A7 | Observability — per-node trace: tokens, cost, timing | |
| A8 | Checkpoints & resumability | |

## Stack

**Provider-agnostic, free-tier.** TypeScript · **Groq** (OpenAI-compatible tool calling) · **LangGraph.js** (from rung A3) · local tools.

## Run

```bash
npm install
cp .env.example .env   # add GROQ_API_KEY (free: https://console.groq.com/keys)
npm run learn:01
npm run learn:02
```
