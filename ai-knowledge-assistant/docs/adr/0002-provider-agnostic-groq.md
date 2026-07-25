# ADR 0002 — Provider-agnostic LLM layer, Groq as the default provider

**Status:** Accepted

## Context

The system needs an LLM for generation and grading. It must run free while
building, and the portfolio should demonstrate that the design is not welded to
a single vendor. Embeddings are handled separately and locally (Anthropic and
Groq do not expose an embeddings API).

## Decision

Talk to the LLM through the **OpenAI-compatible Chat Completions interface**,
isolated in `src/lib/llm.ts`. Use **Groq** as the default provider (free tier,
no credit card, very low latency) with the model `llama-3.3-70b-versatile`.

## Consequences

- ✅ $0 to build and run; fast responses.
- ✅ The OpenAI-compatible shape is spoken by most providers, so switching to
  OpenAI, Together, Fireworks, or a local server is a base-URL + model change
  in one file.
- ✅ `estimateCostUSD()` makes token cost visible even though it is $0 here.
- ❌ Open models are not frontier-class; fine for this workload, revisit for
  harder reasoning.
- ❌ Anthropic-specific features (prompt caching, adaptive thinking) are unused.

## Alternatives considered

Anthropic Claude and OpenAI GPT directly — both are paid and would gate the
build behind billing. `@anthropic-ai/sdk` is kept installed for an optional
provider-comparison in evals later.
