import { test } from "node:test";
import assert from "node:assert/strict";
import { parseClaims, parseVerdicts, faithfulnessScore } from "./faithfulness";

test("parseClaims strips list markers but preserves decimals/prices", () => {
  const claims = parseClaims("1. The Pro plan costs $9/mo.\n- It includes 3.5 GB storage.\n\n2) SSO is supported.");
  assert.deepEqual(claims, ["The Pro plan costs $9/mo.", "It includes 3.5 GB storage.", "SSO is supported."]);
});

test("parseVerdicts reads one verdict per line, UNSUPPORTED before SUPPORTED", () => {
  assert.deepEqual(parseVerdicts("1. SUPPORTED\n2. UNSUPPORTED\n3. supported", 3), [true, false, true]);
  assert.deepEqual(parseVerdicts("1. not supported", 1), [false]);
});

test("parseVerdicts fills missing verdicts conservatively (unsupported)", () => {
  assert.deepEqual(parseVerdicts("1. SUPPORTED", 3), [true, false, false]);
});

test("parseVerdicts stops at n even if extra lines follow", () => {
  assert.deepEqual(parseVerdicts("1. SUPPORTED\n2. SUPPORTED\n3. SUPPORTED", 2), [true, true]);
});

test("faithfulnessScore: ratio, and 1.0 for a no-claim refusal", () => {
  assert.equal(faithfulnessScore([true, true, false]), 2 / 3);
  assert.equal(faithfulnessScore([]), 1);
  assert.equal(faithfulnessScore([false, false]), 0);
});
