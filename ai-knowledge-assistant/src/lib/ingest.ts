import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, extname, basename } from "node:path";

// Resolve knowledge/ relative to this file, so it works no matter the cwd.
const KNOWLEDGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../knowledge");

export interface Doc {
  source: string;
  text: string;
}

/** Load every .md/.txt file in the knowledge/ folder as a document. */
export function loadDocuments(dir: string = KNOWLEDGE_DIR): Doc[] {
  return readdirSync(dir)
    .filter((f) => [".md", ".txt"].includes(extname(f).toLowerCase()))
    .sort()
    .map((f) => ({
      source: basename(f, extname(f)),
      text: readFileSync(join(dir, f), "utf8"),
    }));
}
