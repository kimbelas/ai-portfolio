/**
 * RUNG 10 — Faithfulness (does every claim trace back to the context?).
 *
 * Answer correctness asks "is the answer right?". Faithfulness asks a different,
 * stricter question: "is every statement in the answer actually SUPPORTED by the
 * retrieved context, or did the model smuggle in outside knowledge?" It's the
 * canonical RAG hallucination metric (RAGAS-style), computed in three steps:
 *   1. generate the answer,
 *   2. decompose it into atomic claims (LLM),
 *   3. judge each claim against the retrieved context (LLM) — supported / total.
 *
 * To show the metric discriminates, we compare the GROUNDED production pipeline
 * against an UNCONSTRAINED prompt that is invited to add outside knowledge.
 *
 * Run with:  npm run eval:faithfulness   (needs GROQ_API_KEY)
 *
 * Honest caveats: two LLM-judged steps → noisy; small question set; single run.
 * Trust the delta between the two configs, not any single percentage point.
 */

import { buildKnowledgeBase } from "../lib/kb";
import { answerQuestion } from "../lib/rag";
import { retrieveReranked } from "../lib/retrieve";
import { chat } from "../lib/llm";
import { parseClaims, parseVerdicts, faithfulnessScore } from "../lib/faithfulness";
import type { InMemoryVectorStore, StoredChunk } from "../lib/vectorStore";

const QUESTIONS = [
  "How much does the Pro plan cost per month?",
  "Is Acme HIPAA compliant?",
  "What is the API rate limit?",
  "Does Acme support SAML single sign-on?",
  "What is the uptime SLA?",
  "Can I use my own encryption keys?",
  "What payment methods can I use?",
  "What happens to my data if I cancel my subscription?",
];

const contextOf = (sources: StoredChunk[]) =>
  sources.map((c, i) => `[${i + 1}] ${c.text}`).join("\n\n");

async function extractClaims(answer: string): Promise<string[]> {
  if (/don.?t know/i.test(answer)) return []; // a refusal asserts nothing
  const { text } = await chat({
    system:
      "Break the answer into atomic factual claims. Output ONE claim per line, plain text, no numbering, no preamble. Each line is a single standalone statement.",
    user: `Answer:\n${answer}`,
    maxTokens: 300,
  });
  return parseClaims(text);
}

async function verifyClaims(context: string, claims: string[]): Promise<boolean[]> {
  if (claims.length === 0) return [];
  const numbered = claims.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const { text } = await chat({
    system:
      "For each numbered claim, decide whether it is DIRECTLY supported by the context. Reply with one line per claim: the number, then SUPPORTED or UNSUPPORTED. Judge ONLY from the context — if the context does not entail the claim, it is UNSUPPORTED.",
    user: `Context:\n${context}\n\nClaims:\n${numbered}`,
    maxTokens: 300,
  });
  return parseVerdicts(text, claims.length);
}

type AnswerFn = (q: string) => Promise<{ answer: string; sources: StoredChunk[] }>;

// The grounded production pipeline (answer ONLY from context).
const grounded = (store: InMemoryVectorStore): AnswerFn => (q) =>
  answerQuestion(store, q, 4).then(({ answer, sources }) => ({ answer, sources }));

// An unconstrained prompt over the SAME retrieved context — invited to add
// outside knowledge, so it should produce claims the context doesn't support.
const unconstrained = (store: InMemoryVectorStore): AnswerFn => async (q) => {
  const sources = await retrieveReranked(store, q, 4);
  const { text } = await chat({
    system:
      "You are a knowledgeable assistant. Answer the question as fully and specifically as you can. You may use the background notes, and also add any other relevant details you know.",
    user: `Background notes:\n${contextOf(sources)}\n\nQuestion: ${q}`,
    maxTokens: 300,
  });
  return { answer: text, sources };
};

async function faithfulnessOver(label: string, answerFn: AnswerFn) {
  let total = 0;
  let supported = 0;
  const notes: string[] = [];
  for (const q of QUESTIONS) {
    const { answer, sources } = await answerFn(q);
    const claims = await extractClaims(answer);
    if (claims.length === 0) {
      notes.push(`${q} — refusal / no claims`);
      continue;
    }
    const verdicts = await verifyClaims(contextOf(sources), claims);
    const s = verdicts.filter(Boolean).length;
    supported += s;
    total += claims.length;
    if (s < claims.length) notes.push(`${q} — ${s}/${claims.length} claims grounded`);
  }
  const pct = total ? Math.round((supported / total) * 100) : 100;
  console.log(`${label.padEnd(30)} faithfulness: ${pct}% (${supported}/${total} claims grounded)`);
  notes.forEach((n) => console.log("   - " + n));
  return pct;
}

async function main() {
  const store = await buildKnowledgeBase();
  console.log(
    `Faithfulness eval · ${QUESTIONS.length} questions · claims judged against the retrieved context\n`,
  );
  await faithfulnessOver("grounded (production)", grounded(store));
  console.log("");
  await faithfulnessOver("unconstrained (world knowledge)", unconstrained(store));
  console.log(
    "\n(Faithfulness = fraction of answer claims entailed by the retrieved context. Two LLM-judged steps — noisy; trust the delta between configs.)",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
