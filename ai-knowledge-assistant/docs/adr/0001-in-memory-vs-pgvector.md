# ADR 0001 — In-memory vector store now, pgvector later

**Status:** Accepted

## Context

We need to store embeddings and find the nearest ones to a query. Constraints:
this is a learning/portfolio build, must run free and offline, and the dev
machine has no Docker (so no local Postgres). The corpus is small (tens of
chunks).

## Decision

Use a brute-force **in-memory vector store** (`InMemoryVectorStore`): an array
of vectors, cosine similarity, sort, take top-k.

## Consequences

- ✅ Zero infrastructure, zero cost, trivial to understand and debug.
- ✅ Fine up to ~10k–50k chunks (a linear scan of small vectors is fast).
- ❌ Not persistent — the index rebuilds on every process start.
- ❌ O(n) per query and single-process — won't scale to large corpora or
  concurrent traffic.
- ❌ No metadata filtering, no ANN index.

## When we would flip to pgvector

Persistence, corpora beyond ~50k chunks, concurrent access, or metadata
filtering at scale. **pgvector (Postgres)** is the first choice because it
keeps documents, metadata, and vectors in one datastore we already understand.
Managed alternatives (Pinecone, Qdrant, Weaviate) if we need turnkey ANN at
larger scale or want to avoid running Postgres. The `InMemoryVectorStore`
interface (`add` / `search`) is intentionally small so swapping the
implementation is a localized change.
