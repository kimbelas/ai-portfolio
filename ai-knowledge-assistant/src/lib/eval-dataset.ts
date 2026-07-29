/**
 * The labeled eval dataset — single source of truth, imported by both the full
 * eval (`learn/07-evals.ts`, LLM-judged) and the deterministic CI gate
 * (`eval-gate.ts`). Keeping it here avoids the two drifting apart.
 */

export interface EvalCase {
  question: string;
  goldSources: string[]; // any of these docs is an acceptable retrieval
  goldFact: string;
}

export const DATASET: EvalCase[] = [
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

// Out-of-doc questions: correct behavior is to REFUSE ("I don't know…").
export const NEGATIVES: string[] = [
  "Who is Acme's CEO?",
  "What is the capital of France?",
  "What was Acme's revenue last quarter?",
  "Does Acme sell a coffee machine?",
  "What is my current account balance?",
];
