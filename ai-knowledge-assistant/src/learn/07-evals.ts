/**
 * RUNG 7 — Evals (measure it — the senior differentiator).
 *
 * Over a labeled dataset spanning TWO domains (a cloud SaaS + an e-bike maker,
 * so retrieval must generalize and not confuse one domain's docs for another's),
 * on a deliberately HARD corpus (near-duplicate + distractor docs), we compare
 * retrieval configs and measure answer quality:
 *   1. Retrieval recall@k — did an acceptable source get retrieved? (deterministic)
 *   2. Answer correctness — does the answer state the gold fact? (LLM-judged;
 *      the production config is cross-checked by an INDEPENDENT judge model to
 *      guard against self-preference bias, with judge-agreement reported).
 *   3. Refusal accuracy — does it decline questions the docs don't cover?
 *
 * Run with:  npm run learn:07   (needs GROQ_API_KEY)
 */

import { buildEvalKnowledgeBase } from "../lib/eval-kb";
import { retrieveSemantic, retrieveHybrid, retrieveReranked } from "../lib/retrieve";
import { answerQuestion } from "../lib/rag";
import { chat, MODEL } from "../lib/llm";
import { DATASET, NEGATIVES } from "../lib/eval-dataset";
import type { InMemoryVectorStore } from "../lib/vectorStore";

type Retriever = (store: InMemoryVectorStore, q: string, k: number) => Promise<{ source: string }[]>;

const RETRIEVAL_CONFIGS: { name: string; retrieve: Retriever }[] = [
  { name: "semantic", retrieve: retrieveSemantic },
  { name: "hybrid (RRF)", retrieve: retrieveHybrid },
  { name: "hybrid + rerank", retrieve: retrieveReranked },
];

const hit = (r: { source: string }[], golds: string[], k: number) =>
  r.slice(0, k).some((c) => golds.includes(c.source));

async function judge(question: string, answer: string, goldFact: string, model: string): Promise<boolean> {
  // maxTokens is generous because some judge models (e.g. gpt-oss) are reasoning
  // models — a tiny budget truncates them before they emit a verdict. We parse
  // the LAST PASS/FAIL token so any preceding reasoning doesn't fool the grade.
  const { text } = await chat({
    system: "You are a strict grader. Decide whether the answer correctly conveys the expected fact. Reply with your one-word verdict LAST: PASS or FAIL.",
    user: `Question: ${question}\nExpected fact: ${goldFact}\nAnswer given: ${answer}\n\nDoes the answer correctly convey the expected fact? End with PASS or FAIL.`,
    maxTokens: 512,
    model,
  });
  const verdicts = text.toUpperCase().match(/PASS|FAIL/g);
  return verdicts ? verdicts[verdicts.length - 1] === "PASS" : false;
}

async function main() {
  const store = await buildEvalKnowledgeBase();
  const n = DATASET.length;
  console.log(`Corpus: ${store.size()} chunks · Eval: ${n} questions\n`);

  // --- 1. Retrieval quality per config (deterministic, no LLM) ---
  console.log("retrieval          recall@1   recall@3");
  console.log("-----------------  --------   --------");
  for (const cfg of RETRIEVAL_CONFIGS) {
    let r1 = 0, r3 = 0;
    for (const c of DATASET) {
      const r = await cfg.retrieve(store, c.question, 3);
      if (hit(r, c.goldSources, 1)) r1++;
      if (hit(r, c.goldSources, 3)) r3++;
    }
    const pct = (x: number) => `${Math.round((x / n) * 100)}%`;
    console.log(`${cfg.name.padEnd(17)}  ${pct(r1).padStart(7)}   ${pct(r3).padStart(7)}`);
  }

  // Per-domain recall@1 for the production retriever (does it generalize across
  // domains and not confuse one domain's docs for another's?).
  const domains = [...new Set(DATASET.map((c) => c.domain))];
  for (const d of domains) {
    const cases = DATASET.filter((c) => c.domain === d);
    let r1 = 0;
    for (const c of cases) {
      if (hit(await retrieveReranked(store, c.question, 3), c.goldSources, 1)) r1++;
    }
    console.log(`  recall@1 [hybrid+rerank] · ${d.padEnd(6)}: ${Math.round((r1 / cases.length) * 100)}% (${r1}/${cases.length})`);
  }

  // --- 2. Answer correctness (LLM-judged): hybrid vs hybrid+rerank ---
  // The generator is llama-3.3-70b, so grading with the SAME model risks
  // self-preference bias. We grade with llama, then cross-check the production
  // config with an INDEPENDENT judge (a different family) and report agreement.
  const PRIMARY_JUDGE = MODEL; // llama-3.3-70b — same family as the generator
  const INDEPENDENT_JUDGE = "openai/gpt-oss-120b"; // different family, blind grader
  const ANSWER_CONFIGS: { name: string; retrieve: any }[] = [
    { name: "hybrid", retrieve: retrieveHybrid },
    { name: "hybrid + rerank", retrieve: retrieveReranked },
  ];
  console.log("");
  for (const ac of ANSWER_CONFIGS) {
    let correct = 0;
    const fails: string[] = [];
    const graded: { q: string; answer: string; gold: string; passA: boolean }[] = [];
    for (const c of DATASET) {
      const { answer } = await answerQuestion(store, c.question, 4, ac.retrieve);
      const passA = await judge(c.question, answer, c.goldFact, PRIMARY_JUDGE);
      if (passA) correct++;
      else fails.push(c.question);
      graded.push({ q: c.question, answer, gold: c.goldFact, passA });
    }
    console.log(`answer correctness (${ac.name}) [judge llama-3.3-70b]: ${Math.round((correct / n) * 100)}% (${correct}/${n})`);
    if (fails.length) console.log("  failed:" + fails.map((f) => `\n   - ${f}`).join(""));

    // Independent-judge cross-check on the production pipeline (self-bias guard).
    if (ac.name === "hybrid + rerank") {
      let correctB = 0, agree = 0;
      const disagreements: string[] = [];
      for (const g of graded) {
        const passB = await judge(g.q, g.answer, g.gold, INDEPENDENT_JUDGE);
        if (passB) correctB++;
        if (passB === g.passA) agree++;
        else disagreements.push(`${g.q} (llama ${g.passA ? "PASS" : "FAIL"} vs gpt-oss ${passB ? "PASS" : "FAIL"})`);
      }
      console.log(`answer correctness (${ac.name}) [independent judge gpt-oss-120b]: ${Math.round((correctB / n) * 100)}% (${correctB}/${n})`);
      console.log(`judge agreement (llama vs gpt-oss-120b): ${Math.round((agree / n) * 100)}% (${agree}/${n})`);
      if (disagreements.length) console.log("  judges disagreed on:" + disagreements.map((d) => `\n   - ${d}`).join(""));
    }
  }

  // --- 3. Refusal accuracy: does it decline questions the docs don't cover? ---
  let refused = 0;
  const leaked: string[] = [];
  for (const q of NEGATIVES) {
    const { answer } = await answerQuestion(store, q, 4);
    if (/don.?t know|do not know/i.test(answer)) refused++;
    else leaked.push(`${q} -> ${answer.slice(0, 70)}`);
  }
  console.log(`\nrefusal accuracy (out-of-doc questions): ${Math.round((refused / NEGATIVES.length) * 100)}% (${refused}/${NEGATIVES.length})`);
  if (leaked.length) console.log("  LEAKED (answered instead of refusing):" + leaked.map((l) => `\n   - ${l}`).join(""));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
