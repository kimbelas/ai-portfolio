# ADR 0004 — Cross-encoder reranker

**Status:** Accepted (implements the "next lever" flagged in ADR 0003)

## Context

On the (now harder, 37-chunk) corpus, semantic and hybrid retrieval both scored
**93% recall@1 / 93% recall@3** and **93% answer correctness**. The single miss —
*"Does Acme support SAML single sign-on?"* — was a **retrieval** failure: the
relevant doc (`enterprise.md`) ranked outside the top-k, so the grounded pipeline
correctly refused with "I don't know." A bi-encoder (our embedding model) scores
query and passage *separately*, which can bury the right chunk.

## Decision

Add a **cross-encoder reranker** — `Xenova/ms-marco-MiniLM-L-6-v2`, on-device via
Transformers.js, ~23MB (q8) — as a **retrieve-wide → rerank → top-k** stage
(`retrieveReranked`: hybrid top-15 → cross-encoder re-scores each (query, chunk)
pair → top-k). The RAG pipeline uses it by default.

## Results (measured — `npm run eval`, 37 chunks, 15 questions)

| retrieval | recall@1 | recall@3 |
|---|---|---|
| semantic | 93% | 93% |
| hybrid (RRF) | 93% | 93% |
| **hybrid + rerank** | **100%** | **100%** |

Answer correctness (LLM-judged): **hybrid 93% → hybrid + rerank 100%.** The
reranker fixed the SAML miss end-to-end (retrieved `enterprise.md`, answered).

## Consequences

- ✅ +7 pts recall@1 and answer correctness; fixes a real, named failure.
- ⚠️ Cost: one cross-encoder forward pass per candidate (O(N)) — run only on the
  top-N from retrieval, never the whole corpus.
- ⚠️ Adds a one-time ~23MB model load (cached) and a few ms per query.
- 📝 **LLM-as-judge is itself noisy:** an earlier run false-failed a *correct*
  "payment methods" answer. Trust trends over single-point numbers, and keep a
  human eye on judge disagreements.
