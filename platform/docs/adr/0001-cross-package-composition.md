# ADR 0001 — Compose the flagships via cross-package imports (not a full workspace, yet)

**Status:** Accepted

## Context

The three flagships work and are green. We want to demonstrate an *extensible
platform* — one agent that reuses the others (agent-consults-RAG) — and a shared
`ai-kit`, **without** destabilizing three independently-runnable, already-pushed
packages.

## Decision

Add an **additive `platform/` package** that:
- imports Flagship 1's RAG across the monorepo by relative path
  (`../../ai-knowledge-assistant/src/lib/...`), and
- houses a shared **`ai-kit`** (model factory, guardrails, cost meter).

This works because `tsx`/esbuild resolves each module's imports relative to
**that module's** location: Flagship 1's RAG resolves `@huggingface/transformers`
from `ai-knowledge-assistant/node_modules`, while the platform agent resolves
`@langchain/langgraph` from `platform/node_modules`. No hoisting, no shared lock.

## Consequences

- ✅ The flagships stay independently runnable and were not modified.
- ✅ The composition (LangGraph agent → Flagship 1 RAG tool + calculator) runs
  end to end on the shared `ai-kit`.
- ⚠️ Relative cross-package imports are slightly unidiomatic and would break if
  a flagship folder were renamed/moved.
- ⚠️ `ai-kit` lives in `platform/`; the flagships don't yet import it (they still
  have their own `llm`/`guardrails`), so the DRY win is partial.

## Next step

Convert the repo to **npm workspaces** and publish `ai-kit` as
`@portfolio/ai-kit`, consumed by name from all packages (and make each flagship
a named package so imports are `import { … } from "@portfolio/rag"` rather than
relative paths). Deferred here to avoid a risky mid-flight restructure of a clean,
pushed portfolio.
