/**
 * RUNG 7 — Evals (measure it — the senior differentiator).
 *
 * Over a labeled dataset, on a deliberately HARD corpus (near-duplicate and
 * distractor docs), we compare retrieval configs and measure answer quality:
 *   1. Retrieval recall@k — did an acceptable source get retrieved? (deterministic)
 *   2. Answer correctness — does the answer state the gold fact? (LLM-judged),
 *      compared with vs without the cross-encoder reranker.
 *
 * Run with:  npm run learn:07   (needs GROQ_API_KEY)
 */

import { buildKnowledgeBase } from "../lib/kb";
import { retrieveSemantic, retrieveHybrid, retrieveReranked } from "../lib/retrieve";
import { answerQuestion } from "../lib/rag";
import { chat } from "../lib/llm";
import type { InMemoryVectorStore } from "../lib/vectorStore";

interface EvalCase {
  question: string;
  goldSources: string[]; // any of these docs is an acceptable retrieval
  goldFact: string;
}

const DATASET: EvalCase[] = [
  { question: "How much does the Pro plan cost per month?", goldSources: ["plans"], goldFact: "$9 per month" },
  { question: "Can Acme staff read my files?", goldSources: ["security", "encryption"], goldFact: "no — zero-knowledge; staff cannot read files" },
  { question: "Is Acme HIPAA compliant?", goldSources: ["compliance"], goldFact: "No — HIPAA is not supported" },
  { question: "Does Acme support SAML single sign-on?", goldSources: ["enterprise"], goldFact: "yes — SAML (and OIDC)" },
  { question: "What is the API rate limit?", goldSources: ["api"], goldFact: "1000 requests per hour" },
  { question: "Does Acme integrate with Slack?", goldSources: ["integrations"], goldFact: "yes — Slack notifications" },
  { question: "What is the uptime SLA?", goldSources: ["sla"], goldFact: "99.9% monthly uptime (Business)" },
  { question: "Is SMS supported for two-factor authentication?", goldSources: ["two-factor"], goldFact: "No — SMS 2FA is not supported (TOTP only)" },
  { question: "Can I use my own encryption keys?", goldSources: ["encryption"], goldFact: "yes — customer-managed keys on Business" },
  { question: "What payment methods can I use?", goldSources: ["billing"], goldFact: "credit/debit card and PayPal (and bank transfer for Business)" },
  { question: "How long can I recover deleted files on the Free plan?", goldSources: ["backup-and-restore"], goldFact: "30 days" },
  { question: "What happens to my data if I cancel my subscription?", goldSources: ["account"], goldFact: "read-only for 60 days, then deleted" },
  { question: "Is Acme ISO 27001 certified?", goldSources: ["compliance"], goldFact: "yes — ISO 27001 certified" },
  { question: "At how many seats do volume discounts start?", goldSources: ["enterprise"], goldFact: "25 seats" },
  { question: "Can I restore a whole folder from the mobile app?", goldSources: ["mobile"], goldFact: "No — folder restore is desktop-only" },
];

type Retriever = (store: InMemoryVectorStore, q: string, k: number) => Promise<{ source: string }[]>;

const RETRIEVAL_CONFIGS: { name: string; retrieve: Retriever }[] = [
  { name: "semantic", retrieve: retrieveSemantic },
  { name: "hybrid (RRF)", retrieve: retrieveHybrid },
  { name: "hybrid + rerank", retrieve: retrieveReranked },
];

const hit = (r: { source: string }[], golds: string[], k: number) =>
  r.slice(0, k).some((c) => golds.includes(c.source));

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

  // --- 2. Answer correctness (LLM-judged): hybrid vs hybrid+rerank ---
  const ANSWER_CONFIGS: { name: string; retrieve: any }[] = [
    { name: "hybrid", retrieve: retrieveHybrid },
    { name: "hybrid + rerank", retrieve: retrieveReranked },
  ];
  console.log("");
  for (const ac of ANSWER_CONFIGS) {
    let correct = 0;
    const fails: string[] = [];
    for (const c of DATASET) {
      const { answer } = await answerQuestion(store, c.question, 4, ac.retrieve);
      if (await judge(c.question, answer, c.goldFact)) correct++;
      else fails.push(c.question);
    }
    console.log(`answer correctness (${ac.name}): ${Math.round((correct / n) * 100)}% (${correct}/${n})`);
    if (fails.length) console.log("  failed:" + fails.map((f) => `\n   - ${f}`).join(""));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
