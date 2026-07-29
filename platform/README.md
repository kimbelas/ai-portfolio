# Platform Layer — one system from three flagships

[![CI](https://github.com/kimbelas/ai-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/kimbelas/ai-portfolio/actions/workflows/ci.yml)

This is the "extensible AI platform" layer: it **composes** the portfolio's flagships into a single agent instead of leaving them as three separate demos.

A **LangGraph agent** (Flagship 2's tech) that:
- consults **Flagship 1's RAG** (hybrid retrieval + cross-encoder rerank) through a `search_knowledge_base` tool,
- does arithmetic with a `calculator` tool,
- and runs on a shared **`ai-kit`** (model factory + guardrails).

## Run

```bash
npm install
cp .env.example .env   # add GROQ_API_KEY (free: https://console.groq.com/keys)
npm run demo
```

Example: *"Does Acme support HIPAA, and what is the API rate limit? The Pro plan is $9/month — what's that per year?"* → the agent calls the RAG tool twice (→ `compliance`, `api`) and the calculator (→ 108), then answers with citations.

## Architecture

```
  question
     │
     ▼
  guardrails (ai-kit: validate + injection check)
     │
     ▼
  LangGraph agent (ai-kit model: Groq gpt-oss-120b)
     │  tool calls
     ├── search_knowledge_base ──►  Flagship 1 RAG  (hybrid + rerank over knowledge/)
     └── calculator
     ▼
  grounded, cited answer
```

## Design

- **Cross-package composition.** `platform/` imports Flagship 1's RAG directly across the monorepo; each package resolves its own dependencies from its own `node_modules`, so the flagships remain independently runnable and untouched. See `docs/adr/0001`.
- **`ai-kit`** (`src/ai-kit/`) is the *intended* shared layer (model factory + guardrails). **Honest status:** the flagships each still carry their own copies today; consolidating them onto `ai-kit` via **npm workspaces** is the planned refactor (see `docs/adr/0001`) — the current cross-package relative imports are what makes that the right next step.

## Status

- **Tested + in CI:** the self-contained `ai-kit` guardrails have unit tests (`npm test`), run in GitHub Actions.
- **Composition demo today** (CLI via `npm run demo`) — not yet a deployed service. **Planned next (the remaining Flagship-portfolio work):** an HTTP entrypoint + a durable checkpointer (SQLite/pglite) so human-in-the-loop interrupt/resume survives a stateless host, deployed as the "one system" story; plus the npm-workspaces consolidation above.
