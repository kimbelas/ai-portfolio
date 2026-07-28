import { test } from "node:test";
import assert from "node:assert/strict";
import { calculator, getPlanPrice } from "./tools";

test("calculator evaluates arithmetic", () => {
  assert.equal(calculator("9 * 24"), "216");
  assert.equal(calculator("1000 / 8"), "125");
  assert.equal(calculator("(2 + 3) * 4"), "20");
});

test("calculator refuses non-arithmetic input (injection boundary)", () => {
  assert.match(calculator("process.exit(1)"), /invalid expression/i);
  assert.match(calculator("require('fs')"), /invalid expression/i);
  assert.match(calculator("1; while(true){}"), /invalid expression/i);
});

test("getPlanPrice returns known prices and rejects unknown plans", () => {
  assert.match(getPlanPrice("free"), /\b0\b/);
  assert.match(getPlanPrice("pro"), /\b9\b/);
  assert.match(getPlanPrice("BUSINESS"), /\b25\b/); // case-insensitive
  assert.match(getPlanPrice("enterprise"), /unknown plan/i);
});
