/**
 * RUNG 4 — Evaluating the MCP dev assistant (measure it).
 *
 * The assistant answers codebase questions by calling MCP tools (list_files,
 * read_file, search_code) and citing file:line. Over a labeled question set —
 * with answers we can check DETERMINISTICALLY against the sample repo — we
 * measure four things:
 *   1. Task success   — is the answer factually right? (regex on the known fact)
 *   2. Tool-use rate  — did it actually inspect the repo (call ≥1 tool) rather
 *                        than answer from thin air?
 *   3. Tool-selection — did it use an APPROPRIATE tool for the question?
 *   4. Citation rate  — does the answer cite a source file?
 *
 * Deterministic grading (no LLM judge) is possible here because we control the
 * repo and know the ground truth. Run with:  npm run eval   (needs GROQ_API_KEY)
 */

import { connect } from "../lib/mcp";
import { askCodebase } from "../lib/agent";

interface Q {
  q: string;
  tools: string[]; // an appropriate tool for this question (any-of)
  expect?: RegExp; // answer must contain this known fact
  all?: RegExp[]; // ...or ALL of these (e.g. "list every file")
}

const QUESTIONS: Q[] = [
  { q: "What is the valid API key in this codebase?", tools: ["search_code", "read_file"], expect: /demo-key-123/ },
  { q: "Which source file validates API keys? Answer with the filename.", tools: ["search_code", "read_file", "list_files"], expect: /auth\.ts/ },
  { q: "Are tasks stored in memory or persisted to disk?", tools: ["search_code", "read_file"], expect: /in[- ]?memory|\bmemory\b/i },
  { q: "What does completeTask return when the task id is not found?", tools: ["search_code", "read_file"], expect: /\bfalse\b/i },
  { q: "List the source files under src/.", tools: ["list_files"], all: [/auth\.ts/i, /db\.ts/i, /tasks\.ts/i] },
  { q: "Which relational database engine (Postgres or MySQL) does this project use?", tools: ["search_code", "read_file", "list_files"], expect: /in[- ]?memory|no (external |relational )?database|does not use|doesn.?t use|none|not use/i },
];

const CITES_FILE = /\b[\w./-]*\.(ts|md)\b/;

async function main() {
  const client = await connect();
  const n = QUESTIONS.length;
  let taskOK = 0;
  let usedTool = 0;
  let selOK = 0;
  let cited = 0;
  const notes: string[] = [];

  try {
    for (const Q of QUESTIONS) {
      const called: string[] = [];
      const answer = await askCodebase(client, Q.q, { onTool: (name) => called.push(name) });
      // Strip markdown emphasis so grading isn't fooled by "does **not** use".
      const norm = answer.replace(/[*_`]+/g, " ");

      const ok = Q.all ? Q.all.every((r) => r.test(norm)) : Boolean(Q.expect?.test(norm));
      const sel = called.some((c) => Q.tools.includes(c));
      const cite = CITES_FILE.test(norm);

      if (ok) taskOK++;
      else notes.push(`task ✗ "${Q.q}" — got: ${answer.slice(0, 90)}`);
      if (called.length) usedTool++;
      if (sel) selOK++;
      else notes.push(`tool ✗ "${Q.q}" — called [${called.join(", ") || "none"}], wanted one of [${Q.tools.join(", ")}]`);
      if (cite) cited++;
    }
  } finally {
    await client.close();
  }

  const pct = (x: number) => Math.round((x / n) * 100);
  console.log(`MCP codebase-QA eval · ${n} questions (model: gpt-oss-120b)\n`);
  console.log(`task success:                    ${pct(taskOK)}% (${taskOK}/${n})`);
  console.log(`tool-use rate (inspected repo):  ${pct(usedTool)}% (${usedTool}/${n})`);
  console.log(`tool-selection (appropriate):    ${pct(selOK)}% (${selOK}/${n})`);
  console.log(`file-citation rate:              ${pct(cited)}% (${cited}/${n})`);
  if (notes.length) console.log("\n" + notes.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
