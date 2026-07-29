/**
 * The labeled eval dataset — single source of truth, imported by both the full
 * eval (`learn/07-evals.ts`, LLM-judged) and the deterministic CI gate
 * (`eval-gate.ts`). Keeping it here avoids the two drifting apart.
 *
 * Two domains on purpose: "acme" (a cloud-storage SaaS) and "cobalt" (an e-bike
 * maker — deliberately disjoint vocabulary). Both are AUTHORED (not scraped), so
 * treat results as directional; the point is to test that retrieval generalizes
 * across topics and doesn't confuse one domain's docs for another's.
 */

export type Domain = "acme" | "cobalt";

export interface EvalCase {
  question: string;
  goldSources: string[]; // any of these docs is an acceptable retrieval
  goldFact: string;
  domain: Domain;
}

const ACME: EvalCase[] = [
  { question: "How much does the Pro plan cost per month?", goldSources: ["plans"], goldFact: "$9 per month", domain: "acme" },
  { question: "Can Acme staff read my files?", goldSources: ["security", "encryption"], goldFact: "no — zero-knowledge; staff cannot read files", domain: "acme" },
  { question: "Is Acme HIPAA compliant?", goldSources: ["compliance"], goldFact: "No — HIPAA is not supported", domain: "acme" },
  { question: "Does Acme support SAML single sign-on?", goldSources: ["enterprise"], goldFact: "yes — SAML (and OIDC)", domain: "acme" },
  { question: "What is the API rate limit?", goldSources: ["api"], goldFact: "1000 requests per hour", domain: "acme" },
  { question: "Does Acme integrate with Slack?", goldSources: ["integrations"], goldFact: "yes — Slack notifications", domain: "acme" },
  { question: "What is the uptime SLA?", goldSources: ["sla"], goldFact: "99.9% monthly uptime (Business)", domain: "acme" },
  { question: "Is SMS supported for two-factor authentication?", goldSources: ["two-factor"], goldFact: "No — SMS 2FA is not supported (TOTP only)", domain: "acme" },
  { question: "Can I use my own encryption keys?", goldSources: ["encryption"], goldFact: "yes — customer-managed keys on Business", domain: "acme" },
  { question: "What payment methods can I use?", goldSources: ["billing"], goldFact: "credit/debit card and PayPal (and bank transfer for Business)", domain: "acme" },
  { question: "How long can I recover deleted files on the Free plan?", goldSources: ["backup-and-restore"], goldFact: "30 days", domain: "acme" },
  { question: "What happens to my data if I cancel my subscription?", goldSources: ["account"], goldFact: "read-only for 60 days, then deleted", domain: "acme" },
  { question: "Is Acme ISO 27001 certified?", goldSources: ["compliance"], goldFact: "yes — ISO 27001 certified", domain: "acme" },
  { question: "At how many seats do volume discounts start?", goldSources: ["enterprise"], goldFact: "25 seats", domain: "acme" },
  { question: "Can I restore a whole folder from the mobile app?", goldSources: ["mobile"], goldFact: "No — folder restore is desktop-only", domain: "acme" },
];

const COBALT: EvalCase[] = [
  { question: "How much does the Cobalt City e-bike cost?", goldSources: ["cobalt-models"], goldFact: "$1,499", domain: "cobalt" },
  { question: "How much is the Cobalt Cargo bike?", goldSources: ["cobalt-models"], goldFact: "$2,799", domain: "cobalt" },
  { question: "What is the range of a Cobalt e-bike on a single charge?", goldSources: ["cobalt-battery"], goldFact: "up to 60 miles in eco mode", domain: "cobalt" },
  { question: "How long does the Cobalt battery take to fully charge?", goldSources: ["cobalt-battery"], goldFact: "about 4 hours", domain: "cobalt" },
  { question: "What battery capacity does the Cobalt have?", goldSources: ["cobalt-battery"], goldFact: "500Wh", domain: "cobalt" },
  { question: "What motor wattage does the Cobalt use?", goldSources: ["cobalt-motor"], goldFact: "250W mid-drive", domain: "cobalt" },
  { question: "What class of e-bike is the Cobalt, and does it have a throttle?", goldSources: ["cobalt-motor"], goldFact: "Class 1, pedal-assist to 20 mph, no throttle", domain: "cobalt" },
  { question: "How long is the warranty on the Cobalt battery?", goldSources: ["cobalt-warranty"], goldFact: "1 year", domain: "cobalt" },
  { question: "Is the Cobalt frame covered by warranty, and for how long?", goldSources: ["cobalt-warranty"], goldFact: "2 years (frame and motor)", domain: "cobalt" },
  { question: "Does Cobalt offer at-home or mobile bike service?", goldSources: ["cobalt-servicing"], goldFact: "No — service at authorized shops only", domain: "cobalt" },
  { question: "Is there a free tune-up after buying a Cobalt?", goldSources: ["cobalt-servicing"], goldFact: "yes — one free tune-up within the first 30 days", domain: "cobalt" },
  { question: "Can I ride a Cobalt in the rain?", goldSources: ["cobalt-safety"], goldFact: "yes — IP65 water resistant (rain ok, not submersion)", domain: "cobalt" },
  { question: "How assembled does the Cobalt arrive?", goldSources: ["cobalt-assembly"], goldFact: "about 85% assembled, ~30 min setup", domain: "cobalt" },
  { question: "What is the return window for a Cobalt?", goldSources: ["cobalt-returns"], goldFact: "14 days", domain: "cobalt" },
  { question: "Does Cobalt offer financing?", goldSources: ["cobalt-returns"], goldFact: "yes — 0% APR for 12 months on approved credit", domain: "cobalt" },
];

export const DATASET: EvalCase[] = [...ACME, ...COBALT];

// Out-of-doc questions (both domains): correct behavior is to REFUSE.
export const NEGATIVES: string[] = [
  "Who is Acme's CEO?",
  "What is the capital of France?",
  "What was Acme's revenue last quarter?",
  "Does Acme sell a coffee machine?",
  "What is my current account balance?",
  "Does Cobalt Cycles make electric motorcycles?",
  "Who founded Cobalt Cycles?",
  "What colors does the Cobalt City come in?",
];
