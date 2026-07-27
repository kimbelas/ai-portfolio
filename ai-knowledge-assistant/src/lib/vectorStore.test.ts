import { test } from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, InMemoryVectorStore } from "./vectorStore";

test("cosineSimilarity: identical = 1, orthogonal = 0, opposite = -1", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [1, 0]) - 1) < 1e-9);
  assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1]) - 0) < 1e-9);
  assert.ok(Math.abs(cosineSimilarity([1, 1], [-1, -1]) + 1) < 1e-9);
});

test("cosineSimilarity: a zero vector never divides by zero", () => {
  assert.equal(Number.isFinite(cosineSimilarity([0, 0], [1, 1])), true);
});

test("search returns the k nearest chunks, best-first", () => {
  const store = new InMemoryVectorStore();
  store.add({ id: "a", source: "a", text: "a" }, [1, 0]);
  store.add({ id: "b", source: "b", text: "b" }, [0.9, 0.1]);
  store.add({ id: "c", source: "c", text: "c" }, [0, 1]);
  const top = store.search([1, 0], 2);
  assert.equal(top.length, 2);
  assert.deepEqual(top.map((s) => s.chunk.id), ["a", "b"]);
  assert.ok(top[0].score >= top[1].score);
});

test("size reflects added chunks", () => {
  const store = new InMemoryVectorStore();
  assert.equal(store.size(), 0);
  store.add({ id: "x", source: "x", text: "x" }, [1]);
  assert.equal(store.size(), 1);
});
