/**
 * The actual dev-tool logic the MCP server will expose. Pure filesystem
 * functions, sandboxed to the sample-repo directory. Kept separate from the
 * MCP wiring so the server just registers thin wrappers around these.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative, sep } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../sample-repo");

// GUARDRAIL: resolve a model-supplied path and confirm it stays inside ROOT.
// Tools are driven by an LLM — never let a path escape the sandbox.
function safeResolve(relPath: string): string {
  const abs = resolve(ROOT, relPath);
  if (abs !== ROOT && !abs.startsWith(ROOT + sep)) {
    throw new Error(`path escapes the sample repo: "${relPath}"`);
  }
  return abs;
}

/** List every file in the repo, as repo-relative POSIX paths. */
export function listFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else out.push(relative(ROOT, abs).split(sep).join("/"));
    }
  };
  walk(ROOT);
  return out.sort();
}

/** Read one file's contents (sandboxed). */
export function readRepoFile(relPath: string): string {
  return readFileSync(safeResolve(relPath), "utf8");
}

export interface SearchHit {
  file: string;
  line: number;
  text: string;
}

/** Case-insensitive substring search across the repo (grep-lite). */
export function searchText(query: string): SearchHit[] {
  const q = query.toLowerCase();
  const hits: SearchHit[] = [];
  for (const file of listFiles()) {
    const lines = readFileSync(safeResolve(file), "utf8").split(/\r?\n/);
    lines.forEach((text, i) => {
      if (text.toLowerCase().includes(q)) hits.push({ file, line: i + 1, text: text.trim() });
    });
  }
  return hits;
}
