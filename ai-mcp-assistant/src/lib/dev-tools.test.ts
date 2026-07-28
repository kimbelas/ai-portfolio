import { test } from "node:test";
import assert from "node:assert/strict";
import { listFiles, readRepoFile, searchText } from "./dev-tools";

test("listFiles returns the sample-repo sources as POSIX paths", () => {
  const files = listFiles();
  for (const f of ["src/auth.ts", "src/db.ts", "src/tasks.ts"]) {
    assert.ok(files.includes(f), `expected ${f} in ${files.join(", ")}`);
  }
});

test("readRepoFile reads a known file's contents", () => {
  assert.match(readRepoFile("src/auth.ts"), /demo-key-123/);
});

test("searchText finds a string and reports file:line", () => {
  const hits = searchText("demo-key-123");
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].file, "src/auth.ts");
  assert.ok(hits[0].line > 0);
});

test("path traversal is blocked (sandbox guardrail)", () => {
  assert.throws(() => readRepoFile("../../package.json"), /escapes the sample repo/i);
});
