# AI Knowledge Assistant

**Flagship 1 of a senior AI engineer portfolio.** A RAG (Retrieval-Augmented Generation) system — ask questions about a document set, get grounded, cited answers — built from first principles and *measured*, not demoed.

> Built rung by rung. Numbered lessons in `src/learn/` teach one concept each; reusable pieces live in `src/lib/`; real documents live in `knowledge/`.

## Quickstart

```bash
npm install
cp .env.example .env            # add GROQ_API_KEY (free: https://console.groq.com/keys)

npm run ask -- "Can Acme staff read my files, and is it SOC 2 certified?"
npm run web                     # browser chat UI → http://localhost:8787
npm run eval                    # benchmark: recall@k (3 retrievers) + LLM-judged correctness
npm run learn:01                # ... through learn:08, the guided build
```

## Benchmark

`npm run eval` over a 37-chunk corpus (15 labelled questions with near-duplicate/distractor docs), comparing retrieval strategies:

| retrieval | recall@1 | recall@3 |
|---|---|---|
| semantic | 93% | 93% |
| hybrid (RRF) | 93% | 93% |
| **hybrid + cross-encoder rerank** | **100%** | **100%** |

Answer correctness (LLM-judged): **93% → 100%** with reranking. The reranker fixed a real retrieval miss — a SAML-SSO question whose source doc ranked outside the top-k, where the grounded pipeline had correctly *refused* rather than hallucinate. See `docs/adr/0004`. *(LLM-as-judge is itself noisy — trust the trend, not any single point.)*

## The learning ladder

| Rung | Concept | Script |
|------|---------|--------|
| 1 | A single LLM call — messages, tokens, cost | `src/learn/01-single-call.ts` |
| 2 | Structured output — validated JSON with a schema | `src/learn/02-structured-output.ts` |
| 3 | Embeddings — text → vectors, cosine similarity | `src/learn/03-embeddings.ts` |
| 4 | Chunk + store — index once, query cheaply | `src/learn/04-chunk-and-store.ts` |
| 5 | Retrieval — semantic → hybrid (RRF) → cross-encoder rerank | `src/learn/05-retrieval.ts` |
| 6 | The RAG loop — retrieve → ground → cite → "I don't know" | `src/learn/06-rag-loop.ts` |
| 7 | Evals — recall@k + LLM-judged correctness (with vs without rerank) | `src/learn/07-evals.ts` |
| 8 | Production — streaming, latency meter, guardrail | `src/learn/08-production.ts` |

## Architecture

```
        question
           │
           ▼
   ┌────────────────────┐   indexing (once): knowledge/*.md → chunk → embed → store
   │  retrieve          │   ────────────────────────────────────────────────────────
   │  hybrid (RRF)      │◄─── InMemoryVectorStore (cosine nearest-neighbor)
   │  → cross-encoder   │        ▲             ▲
   │    rerank (top-15) │        │ semantic    │ keyword
   └─────────┬──────────┘        (embeddings)  (term overlap)
             │ top-k chunks
             ▼
   ┌───────────────┐   "answer ONLY from context, cite [n], else 'I don't know'"
   │  ground+cite  │
   │  (rag.ts)     │
   └──────┬────────┘
          ▼
     LLM (Groq)  ──►  grounded, cited answer  (+ usage → cost meter)
```

**Modules:** `lib/ingest.ts` (read `knowledge/`) · `lib/chunk.ts` · `lib/embeddings.ts` (local) · `lib/vectorStore.ts` · `lib/retrieve.ts` (semantic + hybrid + reranked) · `lib/rerank.ts` (cross-encoder) · `lib/kb.ts` (indexing) · `lib/rag.ts` (grounding) · `lib/llm.ts` (Groq, provider-agnostic seam) · `cli/ask.ts` (CLI).

## Stack

**Provider-agnostic by design.** Free-tier build: TypeScript · **Groq** (reasoning, OpenAI-compatible) · **local embeddings** + **cross-encoder reranker** (`@huggingface/transformers`, on-device) · in-memory vector store → graduates to **pgvector** · hybrid retrieval + reranking + an eval harness.

## Docs

- `docs/WALKTHROUGH.md` — how the system works, end to end
- `docs/adr/` — architecture decisions (vector store, provider, hybrid retrieval, reranker)

## Status & roadmap

**Done:** full pipeline (ingest → chunk → embed → hybrid retrieve → **rerank** → grounded/cited answer → refusal), eval harness with a real benchmark, streaming + guardrail + cost meter, `ask` CLI, **browser chat UI** (`npm run web`), 4 ADRs.

**Production graduation (next):** pgvector (Docker) · PDF ingestion · larger corpus + eval set · **deploy the web UI** (host) · blog post.
