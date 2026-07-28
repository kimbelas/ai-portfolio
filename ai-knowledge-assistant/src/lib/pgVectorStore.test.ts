import { test } from "node:test";
import assert from "node:assert/strict";
import { PgVectorStore } from "./pgVectorStore";

// Real pgvector (embedded via PGlite/WASM) — no Docker, no cloud, runs in CI.
test("pgvector store: add + cosine nearest-neighbour search via SQL", async () => {
  const store = new PgVectorStore({ dim: 3 });
  await store.add({ id: "a", source: "docA", text: "alpha" }, [1, 0, 0]);
  await store.add({ id: "b", source: "docB", text: "beta" }, [0.9, 0.1, 0]);
  await store.add({ id: "c", source: "docC", text: "gamma" }, [0, 1, 0]);

  assert.equal(await store.size(), 3);

  const hits = await store.search([1, 0, 0], 2);
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((h) => h.chunk.id), ["a", "b"]); // nearest first
  assert.ok(hits[0].score > hits[1].score);
  assert.equal(hits[0].chunk.source, "docA");
  assert.ok(hits[0].score > 0.99); // identical direction → cosine ~1

  await store.close();
});

test("pgvector store: upsert on conflicting id (no duplicates)", async () => {
  const store = new PgVectorStore({ dim: 3 });
  await store.add({ id: "x", source: "s", text: "v1" }, [1, 0, 0]);
  await store.add({ id: "x", source: "s", text: "v2" }, [0, 1, 0]);
  assert.equal(await store.size(), 1);
  const [hit] = await store.search([0, 1, 0], 1);
  assert.equal(hit.chunk.text, "v2");
  await store.close();
});
