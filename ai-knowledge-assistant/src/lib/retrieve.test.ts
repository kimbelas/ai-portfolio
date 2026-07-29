import { test } from "node:test";
import assert from "node:assert/strict";
import { rrfFuse } from "./fusion";
import type { StoredChunk } from "./vectorStore";

const c = (id: string): StoredChunk => ({ id, source: id, text: id } as StoredChunk);

test("rrfFuse ranks an item first when both rankers place it first", () => {
  // "b" is #1 in BOTH rankings -> highest fused score.
  const semantic = [c("b"), c("a"), c("c")];
  const keyword = [c("b"), c("c"), c("a")];
  const fused = rrfFuse([semantic, keyword], 3);
  assert.equal(fused[0].id, "b");
  assert.equal(fused.length, 3);
});

test("rrfFuse respects k and dedupes across rankings", () => {
  const r1 = [c("a"), c("b"), c("c")];
  const r2 = [c("b"), c("c"), c("d")];
  const fused = rrfFuse([r1, r2], 2);
  assert.equal(fused.length, 2);
  assert.equal(new Set(fused.map((x) => x.id)).size, 2); // no duplicate ids
});

test("rrfFuse: a single ranking preserves its order", () => {
  const only = [c("x"), c("y"), c("z")];
  const fused = rrfFuse([only], 3);
  assert.deepEqual(fused.map((x) => x.id), ["x", "y", "z"]);
});

test("rrfFuse handles empty input", () => {
  assert.deepEqual(rrfFuse([], 5), []);
  assert.deepEqual(rrfFuse([[]], 5), []);
});
