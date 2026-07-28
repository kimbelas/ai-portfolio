# ADR 0006 — Persistence: graduate the vector store to pgvector

**Status:** Accepted (store shipped + tested; not yet the default backend — see Consequences)

## Context

Retrieval has run on `InMemoryVectorStore` (`src/lib/vectorStore.ts`) — a
brute-force array with cosine scan. That's ideal for learning and fine for 37
chunks, but it's the portfolio's clearest scale weakness: nothing persists
across restarts, and a linear scan doesn't hold up past a few thousand vectors.
ADR-0001 deliberately kept the store behind a small `add` / `search` seam so it
could be swapped later. This is later.

## Decision

Add `PgVectorStore` (`src/lib/pgVectorStore.ts`) — the same interface, backed by
**Postgres + pgvector**: a `vector(384)` column, nearest-neighbour search via
pgvector's cosine operator `<=>`, and an **HNSW ANN index** (falls back to
IVFFlat, then exact scan).

To keep the stack **free and zero-infra**, it runs on **embedded Postgres via
PGlite (WASM)** — no Docker, no cloud account — yet the SQL is standard pgvector.
Pointing it at hosted Postgres (Supabase/Neon/RDS) is a one-line client swap
(PGlite → a `pg` Pool + `DATABASE_URL`); the schema and queries are identical.

(Pinned `@electric-sql/pglite@0.2.17`: 0.3+ moved the `vector` extension export.)

## Results (measured — `npm run learn:11`)

- Indexed all **37 chunks** into pgvector with an **HNSW** index.
- **Retrieval parity** with the in-memory store: semantic top-1 lands on the
  right doc for the same queries — *including the same SAML miss* that pure
  semantic retrieval has in ADR-0004 (which the reranker fixes). Same behavior =
  faithful drop-in, not a different system.
- A full **grounded, cited answer** whose context was retrieved from the DB via
  `<=>` ("customer-managed encryption keys [1]").
- **Unit-tested in CI** (`src/lib/pgVectorStore.test.ts`): add + cosine NN search
  + upsert, running against real pgvector embedded in PGlite — **zero infra, no
  API key** (27 tests total).

## Consequences

- ✅ Closes the single-node/no-persistence red flag with a **runnable, tested**
  artifact — not a "planned" bullet.
- ✅ The ADR-0001 store seam paid off: swapping backends touched no retrieval logic.
- ✅ Hybrid + rerank compose unchanged on top (fetch a wide candidate set via
  pgvector, then rerank in-process).
- ⚠️ **Not yet the default backend.** `retrieve.ts` calls `store.search()`
  synchronously; a DB store is async, so making pgvector the default needs an
  async-store refactor across the retrieval pipeline **plus** a hosted Postgres.
  That refactor + a `VECTOR_STORE=pg|memory` switch is the next step — the README
  claims pgvector is *demonstrated*, not that it's the live default.
- ⚠️ Embedded PGlite is single-process; the hosted-Postgres swap is what makes it
  multi-tenant/durable in production.
