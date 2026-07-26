# Platform Layer — one system from three flagships

This is the "extensible AI platform" layer: it **composes** the portfolio's flagships into a single agent instead of leaving them as three separate demos.

A **LangGraph agent** (Flagship 2's tech) that:
- consults **Flagship 1's RAG** (hybrid retrieval + cross-encoder rerank) through a `search_knowledge_base` tool,
- does arithmetic with a `calculator` tool,
- and runs on a shared **`ai-kit`** (model factory + guardrails + cost meter).

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
- **`ai-kit`** (`src/ai-kit/`) is the shared layer — model factory, guardrails, cost meter — that the flagships consolidate on.
