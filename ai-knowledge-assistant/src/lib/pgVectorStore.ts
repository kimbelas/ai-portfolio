/**
 * A Postgres + pgvector backed vector store — the production graduation of the
 * in-memory store (see ADR-0006). Same idea as `InMemoryVectorStore`, but
 * embeddings live in a real `vector` column and nearest-neighbour search is a
 * SQL query using pgvector's cosine-distance operator (`<=>`) with an ANN index.
 *
 * It runs on EMBEDDED Postgres via PGlite (WASM) so the demo needs no Docker and
 * no cloud account — yet the SQL is standard pgvector. To point it at a real
 * hosted Postgres (Supabase/Neon/RDS), swap the PGlite client for a `pg` Pool;
 * the schema and queries are identical.
 */

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import type { Chunk } from "./chunk";
import type { StoredChunk } from "./vectorStore";

const toVectorLiteral = (v: number[]) => JSON.stringify(v); // pgvector accepts '[1,2,3]'

export interface PgVectorScored {
  chunk: StoredChunk;
  score: number; // cosine similarity in [0,1], higher = closer
}

export class PgVectorStore {
  private db: PGlite;
  private dim: number;
  private ready: Promise<void>;
  public indexType = "none (exact scan)";

  /** dim defaults to all-MiniLM-L6-v2's 384; dataDir persists to disk (omit = in-memory). */
  constructor(opts: { dim?: number; dataDir?: string } = {}) {
    this.dim = opts.dim ?? 384;
    this.db = opts.dataDir
      ? new PGlite(opts.dataDir, { extensions: { vector } })
      : new PGlite({ extensions: { vector } });
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await this.db.exec("CREATE EXTENSION IF NOT EXISTS vector;");
    await this.db.exec(
      `CREATE TABLE IF NOT EXISTS chunks (
         id TEXT PRIMARY KEY, source TEXT NOT NULL, text TEXT NOT NULL, embedding vector(${this.dim})
       );`,
    );
    // Prefer an HNSW ANN index (pgvector >= 0.5); fall back to IVFFlat, then to
    // an exact scan. On a tiny corpus the scan is exact anyway — the index is
    // what keeps it fast at scale, which is the whole point of graduating.
    try {
      await this.db.exec(`CREATE INDEX IF NOT EXISTS chunks_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);`);
      this.indexType = "hnsw";
    } catch {
      try {
        await this.db.exec(`CREATE INDEX IF NOT EXISTS chunks_ivf ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1);`);
        this.indexType = "ivfflat";
      } catch {
        this.indexType = "none (exact scan)";
      }
    }
  }

  async add(chunk: Chunk, embedding: number[]): Promise<void> {
    await this.ready;
    await this.db.query(
      `INSERT INTO chunks (id, source, text, embedding) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET source = EXCLUDED.source, text = EXCLUDED.text, embedding = EXCLUDED.embedding`,
      [chunk.id, chunk.source, chunk.text, toVectorLiteral(embedding)],
    );
  }

  async size(): Promise<number> {
    await this.ready;
    const r = await this.db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM chunks");
    return r.rows[0].n;
  }

  /** k nearest chunks by cosine distance (pgvector `<=>`), best-first. */
  async search(queryVec: number[], k: number): Promise<PgVectorScored[]> {
    await this.ready;
    const r = await this.db.query<{ id: string; source: string; text: string; score: number }>(
      `SELECT id, source, text, 1 - (embedding <=> $1) AS score
       FROM chunks ORDER BY embedding <=> $1 LIMIT $2`,
      [toVectorLiteral(queryVec), k],
    );
    return r.rows.map((row) => ({
      chunk: { id: row.id, source: row.source, text: row.text, vector: [] } as StoredChunk,
      score: Number(row.score),
    }));
  }

  async close(): Promise<void> {
    await this.ready;
    await this.db.close();
  }
}
