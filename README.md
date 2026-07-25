# AI Engineering Portfolio — Matt Belas

Production-minded AI systems, built from first principles and **measured**, not demoed. TypeScript · provider-agnostic · free-tier stack (Groq + on-device models).

Each project is built as a "rung ladder" — one runnable step per concept — so the whole modern AI stack is assembled from parts, with the reasoning documented along the way.

## Flagships

### 1. [AI Knowledge Assistant](./ai-knowledge-assistant) — RAG *(complete)*
Retrieval-Augmented Generation: ingest documents → **hybrid retrieval** (semantic + keyword, Reciprocal Rank Fusion) → **grounded, cited answers** with an "I don't know" refusal. Ships with an **eval harness** (retrieval recall@k + LLM-as-judge) and a **production layer** (streaming, relevance-floor guardrail, cost meter). 8-rung build from a single LLM call up. See its [walkthrough](./ai-knowledge-assistant/docs/WALKTHROUGH.md) and [ADRs](./ai-knowledge-assistant/docs/adr).

### 2. [AI Agent Platform](./ai-agent-platform) — Autonomous agents *(in progress)*
An agent built from its atom (LLM + tools + loop), then on **LangGraph.js**: tool calling, multi-step planning, human-in-the-loop approval, guardrails, observability, and checkpoints.

### 3. MCP-native coding assistant *(planned)*

## Strategy

See [`ai-portfolio-plan.md`](./ai-portfolio-plan.md) — the plan and the senior-signal principles (evals with real numbers, a production layer, and ADRs) that drive every project.

## Stack

TypeScript · Groq (OpenAI-compatible) · local embeddings (`@huggingface/transformers`) · hybrid retrieval + reranking · LangGraph.js · eval harnesses · pgvector (planned) · Docker + deploy (planned).
