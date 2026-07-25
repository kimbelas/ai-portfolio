# ADR 0003 — Hybrid retrieval via Reciprocal Rank Fusion

**Status:** Accepted

## Context

Pure semantic (embedding) retrieval is strong on paraphrase but can miss exact
tokens — product names, codes, terms like "AES-256" or "SOC 2". Pure keyword
retrieval is the opposite. We want robustness to both.

## Decision

Retrieve with **hybrid search**: run a semantic ranking and a keyword ranking
independently, then fuse them with **Reciprocal Rank Fusion (RRF)**
— `score(d) = Σ 1 / (k + rank_i(d))`, k = 60. Take the top results by fused
score.

## Consequences

- ✅ Robust to both paraphrased questions and exact-term lookups.
- ✅ RRF needs no score normalization — it fuses *ranks*, so the incomparable
  cosine and term-overlap scales don't matter.
- ✅ Simple, deterministic, cheap (no extra model).
- ❌ Keyword ranking is naive term-overlap, not full BM25.
- ❌ On a small clean corpus, hybrid and semantic can score identically; the
  eval harness (rung 7) is what will reveal hybrid's advantage on a larger,
  messier corpus.

## Next lever (not yet implemented)

A **cross-encoder reranker** after retrieval: take the top ~20 hybrid results
and re-score each (query, chunk) pair with a cross-encoder for a precision
boost on the final top-k. Deferred to keep the build free/robust; the retrieval
interface makes it an additive stage.
