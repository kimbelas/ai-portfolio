/**
 * RUNG 7 — Evals (measure it — the senior differentiator).
 *
 * Over a labeled dataset:
 *   1. Retrieval recall@k — did the right document get retrieved? (deterministic)
 *   2. Answer correctness — does the answer state the gold fact? (LLM-judged)
 * We compare semantic vs hybrid retrieval to produce a real before/after number.
 *
 * Run with:  npm run learn:07   (needs GROQ_API_KEY)
 */

import { buildKnowledgeBase } from "../lib/kb";
import { retrieveSemantic, retrieveHybrid } from "../lib/retrieve";
import { answerQuestion } from "../lib/rag";
import { chat } from "../lib/llm";

interface EvalCase {
  question: string;
  goldSource: string; // which document SHOULD be retrieved (filename)
  goldFact: string; // what a correct answer must state
}

const DATASET: EvalCase[] = [
  { question: "How much does the Pro plan cost per month?", goldSource: "plans", goldFact: "$9 per month" },
  { question: "Can Acme employees read my files?", goldSource: "security", goldFact: "no — zero-knowledge; staff cannot read files" },
  { question: "Is Acme SOC 2 certified?", goldSource: "security", goldFact: "yes, SOC 2 Type II" },
  { question: "How long can I recover deleted files on the Free plan?", goldSource: "backup-and-restore", goldFact: "30 days" },
  { question: "What happens to my data if I cancel my subscription?", goldSource: "account", goldFact: "read-only, accessible 60 days, then deleted" },
  { question: "What is the first-response time for priority email support?", goldSource: "support", goldFact: "24 hours" },
  { question: "Which mobile platforms have an app?", goldSource: "platforms", goldFact: "iOS and Android" },
  { question: "How do I get a refund?", goldSource: "account", goldFact: "30-day money-back guarantee" },
];

const hit = (r: { source: string }[], gold: string, k: number) =>
  r.slice(0, k).some((c) => c.source === gold);

// LLM-as-judge: a second call grades the answer. Cheap, scalable.
async function judge(question: string, answer: string, goldFact: string): Promise<boolean> {
  const { text } = await chat({
    system: "You are a strict grader. Reply with ONLY the word PASS or FAIL.",
    user: `Question: ${question}\nExpected fact: ${goldFact}\nAnswer given: ${answer}\n\nDoes the answer correctly convey the expected fact? PASS or FAIL.`,
    maxTokens: 5,
  });
  return /pass/i.test(text);
}

async function main() {
  const store = await buildKnowledgeBase();
  let semR1 = 0, hybR1 = 0, semR3 = 0, hybR3 = 0, correct = 0;

  for (const c of DATASET) {
    const sem = await retrieveSemantic(store, c.question, 3);
    const hyb = await retrieveHybrid(store, c.question, 3);
    semR1 += hit(sem, c.goldSource, 1) ? 1 : 0;
    hybR1 += hit(hyb, c.goldSource, 1) ? 1 : 0;
    semR3 += hit(sem, c.goldSource, 3) ? 1 : 0;
    hybR3 += hit(hyb, c.goldSource, 3) ? 1 : 0;

    const { answer } = await answerQuestion(store, c.question, 4);
    const ok = await judge(c.question, answer, c.goldFact);
    correct += ok ? 1 : 0;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.question}`);
  }

  const n = DATASET.length;
  const pct = (x: number) => `${Math.round((x / n) * 100)}%`.padStart(4);
  console.log("\n=== Benchmark (n=" + n + ") ===");
  console.log(`retrieval recall@1   semantic ${pct(semR1)}   hybrid ${pct(hybR1)}`);
  console.log(`retrieval recall@3   semantic ${pct(semR3)}   hybrid ${pct(hybR3)}`);
  console.log(`answer correctness (hybrid, LLM-judged):  ${pct(correct)} (${correct}/${n})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
