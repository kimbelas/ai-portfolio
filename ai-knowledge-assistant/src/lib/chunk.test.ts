import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "./chunk";

test("returns a single chunk for short text, with a stable id", () => {
  const chunks = chunkText("doc", "One short sentence here.");
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].source, "doc");
  assert.equal(chunks[0].id, "doc#0");
});

test("splits long text into multiple chunks with sequential ids", () => {
  const sentence = "This is a fairly wordy sentence used to force chunk boundaries here. ";
  const chunks = chunkText("doc", sentence.repeat(10), 20, 1);
  assert.ok(chunks.length > 1);
  chunks.forEach((c, i) => assert.equal(c.id, `doc#${i}`));
});

test("every chunk carries the source and non-empty text", () => {
  const chunks = chunkText("policy", "Alpha beta gamma. Delta epsilon zeta. Eta theta iota.", 5, 1);
  for (const c of chunks) {
    assert.equal(c.source, "policy");
    assert.ok(c.text.trim().length > 0);
  }
});
