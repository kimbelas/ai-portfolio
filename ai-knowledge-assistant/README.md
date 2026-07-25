# AI Knowledge Assistant

**Flagship 1 of a senior AI engineer portfolio.** A RAG (Retrieval-Augmented Generation) system — ask questions about a document set, get grounded, cited answers — built from first principles and *measured*, not demoed.

> Built rung by rung. Numbered lessons in `src/learn/` teach one concept each; reusable pieces live in `src/lib/`; real documents live in `knowledge/`.

## Quickstart

```bash
npm install
cp .env.example .env            # add GROQ_API_KEY (free: https://console.groq.com/keys)

npm run ask -- "Can Acme staff read my files, and is it SOC 2 certified?"
npm run eval                    # benchmark: recall@k + LLM-judged correctness
npm run learn:01                # ... through learn:08, the guided build
```

## The learning ladder

| Rung | Concept | Script |
|------|---------|--------|
| 1 | A single LLM call — messages, tokens, cost | `src/learn/01-single-call.ts` |
| 2 | Structured output — validated JSON with a schema | `src/learn/02-structured-output.ts` |
| 3 | Embeddings — text → vectors, cosine similarity | `src/learn/03-embeddings.ts` |
| 4 | Chunk + store — index once, query cheaply | `src/learn/04-chunk-and-store.ts` |
| 5 | Retrieval — semantic vs hybrid (RRF) | `src/learn/05-retrieval.ts` |
| 6 | The RAG loop — retrieve → ground → cite → "I don't know" | `src/learn/06-rag-loop.ts` |
| 7 | Evals — recall@k + LLM-judged answer correctness | `src/learn/07-evals.ts` |
| 8 | Production — streaming, latency meter, guardrail | `src/learn/08-production.ts` |

## Architecture

```
        question
           │
           ▼
   ┌───────────────┐     indexing (once):  knowledge/*.md → chunk → embed → store
   │  retrieve     │     ──────────────────────────────────────────────────────
   │  (hybrid RRF) │◄──── InMemoryVectorStore (cosine nearest-neighbor)
   └──────┬────────┘        ▲            ▲
          │ top-k chunks    │ semantic   │ keyword
          ▼                 (embeddings) (term overlap)
   ┌───────────────┐
   │  ground+cite  │  "answer ONLY from context, cite [n], else 'I don't know'"
   │  (rag.ts)     │
   └──────┬────────┘
          ▼
     LLM (Groq)  ──►  grounded, cited answer  (+ usage → cost meter)
```

**Modules:** `lib/ingest.ts` (read `knowledge/`) · `lib/chunk.ts` · `lib/embeddings.ts` (local) · `lib/vectorStore.ts` · `lib/retrieve.ts` (semantic + hybrid) · `lib/kb.ts` (indexing) · `lib/rag.ts` (grounding) · `lib/llm.ts` (Groq, provider-agnostic seam) · `cli/ask.ts` (CLI).

## Stack

**Provider-agnostic by design.** Free-tier build: TypeScript · **Groq** (reasoning, OpenAI-compatible) · **local embeddings** (`@huggingface/transformers`, on-device) · in-memory vector store → graduates to **pgvector** · hybrid retrieval + an eval harness.

## Docs

- `docs/WALKTHROUGH.md` — how the system works, end to end
- `docs/adr/` — architecture decisions (vector store, provider, retrieval)

## Status & roadmap

**Done:** full pipeline (ingest → chunk → embed → hybrid retrieve → grounded/cited answer → refusal), eval harness, streaming + guardrail + cost meter, `ask` CLI, ADRs.

**Production graduation (next):** pgvector (Docker) · cross-encoder reranker · PDF ingestion · larger corpus + eval set · API + streaming web UI · Dockerize + deploy · blog post.
