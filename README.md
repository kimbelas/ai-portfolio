# AI Engineering Portfolio — Matt Belas

[![CI](https://github.com/kimbelas/ai-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/kimbelas/ai-portfolio/actions/workflows/ci.yml)

**▶ Live demo:** [Acme Knowledge Assistant (RAG)](https://acme-knowledge-assistant.onrender.com/) — grounded, cited answers over a document set. *(Free host — the first request may take ~1 min to wake.)*

Production-minded AI systems, built from first principles and **measured**, not demoed. TypeScript · provider-agnostic · free-tier stack (Groq + on-device models).

Each project is built as a "rung ladder" — one runnable step per concept — so the whole modern AI stack is assembled from parts, with the reasoning documented along the way.

## Flagships

### 1. [AI Knowledge Assistant](./ai-knowledge-assistant) — RAG *(complete)*
Retrieval-Augmented Generation: ingest documents → **hybrid retrieval** (semantic + keyword, Reciprocal Rank Fusion) → **grounded, cited answers** with an "I don't know" refusal. Ships with an **eval harness** (retrieval recall@k + LLM-as-judge + refusal accuracy + prompt-injection resistance + faithfulness) and a **production layer** (streaming, relevance-floor guardrail, prompt-injection defense, cost meter). 8-rung build from a single LLM call up. See its [walkthrough](./ai-knowledge-assistant/docs/WALKTHROUGH.md), [ADRs](./ai-knowledge-assistant/docs/adr), and the [benchmark writeup](./ai-knowledge-assistant/docs/blog/measuring-rag-quality.md) — how the numbers were produced (recall **93% → 100%** with a reranker; **100%** refusal on out-of-doc questions).

### 2. [AI Agent Platform](./ai-agent-platform) — Autonomous agents *(complete)*
An agent built from its atom (LLM + tools + loop), then on **LangGraph.js**: tool calling, multi-step planning, **human-in-the-loop approval** for risky actions, **guardrails** (input validation, prompt-injection defense, allow-list, timeouts, step budget), **observability** (per-node token/cost/latency trace), and **checkpoints** (pause/resume + cross-turn memory). 9-rung build (A1–A9), all runnable — **A9 is an eval harness** (`npm run eval`): tool-selection accuracy 100%, task success 100%, and a check that the risky tool pauses for human approval.

### 3. [AI MCP Assistant](./ai-mcp-assistant) — MCP-native dev assistant *(complete)*
An MCP **server** (stdio) exposing codebase tools (`list_files`, `read_file`, `search_code`) + an MCP **client/host** that bridges those tools into a Groq function-calling loop for **codebase Q&A with file:line citations**. Built from first principles: raw protocol → client discovery/calls → LLM-over-MCP → the product. **Evaluated** (`npm run eval`, deterministic grading): 100% tool-use + tool-selection + citation on factual lookups, with an adversarial "name the database" question that surfaces a real over-search failure mode. See its [ADR](./ai-mcp-assistant/docs/adr/0001-mcp-stdio-and-tool-reliability.md).

## Platform layer — one system from three flagships

[`platform/`](./platform) composes the flagships into a single agent: a **LangGraph agent** (Flagship 2) that consults **Flagship 1's RAG** (hybrid + rerank) via a `search_knowledge_base` tool and does arithmetic, on a shared **`ai-kit`** (model factory + guardrails + cost meter) — the "extensible AI platform" story, running end to end (`npm --prefix platform run demo`). See its [ADR](./platform/docs/adr/0001-cross-package-composition.md).

## Strategy

See [`ai-portfolio-plan.md`](./ai-portfolio-plan.md) — the plan and the senior-signal principles (evals with real numbers, a production layer, and ADRs) that drive every project.

## Stack

TypeScript · Groq (OpenAI-compatible) · local embeddings (`@huggingface/transformers`) · hybrid retrieval + reranking · LangGraph.js · eval harnesses (all 3 flagships) · **unit tests + typecheck in CI across all 3 flagships (+ a deterministic eval-regression gate for RAG recall@k)** · pgvector (planned) · Docker + deploy (planned).
