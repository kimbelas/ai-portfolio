import { test } from "node:test";
import assert from "node:assert/strict";
import { extractText } from "./extract";

test("reads markdown and txt as UTF-8", async () => {
  const buf = Buffer.from("# Title\n\nHello world.", "utf8");
  assert.equal(await extractText("notes.md", buf), "# Title\n\nHello world.");
  assert.equal(await extractText("notes.txt", buf), "# Title\n\nHello world.");
});

test("rejects unsupported file types with a helpful message", async () => {
  await assert.rejects(
    () => extractText("evil.exe", Buffer.from("x")),
    /unsupported file type/i,
  );
});
