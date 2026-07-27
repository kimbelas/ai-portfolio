import { test } from "node:test";
import assert from "node:assert/strict";
import { SYSTEM, buildContext } from "./rag";
import type { StoredChunk } from "./vectorStore";

const chunk = (id: string, source: string, text: string): StoredChunk =>
  ({ id, source, text } as StoredChunk);

test("buildContext numbers passages, labels sources, and wraps them as untrusted", () => {
  const ctx = buildContext([
    chunk("a#0", "plans", "Pro is $9/mo."),
    chunk("b#0", "sla", "99.9% uptime."),
  ]);
  assert.match(ctx, /BEGIN UNTRUSTED CONTEXT/);
  assert.match(ctx, /END UNTRUSTED CONTEXT/);
  assert.match(ctx, /\[1\] \(source: plans\)/);
  assert.match(ctx, /\[2\] \(source: sla\)/);
  assert.ok(ctx.includes("Pro is $9/mo."));
});

test("SYSTEM enforces the grounding + exact refusal contract", () => {
  assert.match(SYSTEM, /ONLY the numbered context passages/i);
  assert.ok(SYSTEM.includes(`"I don't know based on the provided documents."`));
  assert.match(SYSTEM, /Never use outside knowledge/i);
});

test("SYSTEM establishes an instruction hierarchy against prompt injection", () => {
  assert.match(SYSTEM, /untrusted/i);
  assert.match(SYSTEM, /Security rules/i);
  assert.match(SYSTEM, /never\s+reveal/i);
});
