/**
 * Pure helpers for the faithfulness metric (RAGAS-style): decompose an answer
 * into atomic claims, then score how many are entailed by the retrieved context.
 * The LLM calls live in learn/10-faithfulness.ts; the parsing/scoring here is
 * deterministic and unit-tested (faithfulness.test.ts).
 */

/** Turn an LLM's "one claim per line" output into clean atomic statements. */
export function parseClaims(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, "").trim())
    .filter((l) => l.length > 0);
}

/**
 * Parse per-claim verdicts from the judge. "UNSUPPORTED" is tested BEFORE
 * "SUPPORTED" (it contains the substring). A missing verdict is filled as
 * unsupported — conservative: unproven claims count against faithfulness.
 */
export function parseVerdicts(text: string, n: number): boolean[] {
  const out: boolean[] = [];
  for (const line of text.split("\n")) {
    if (/unsupported|not supported/i.test(line)) out.push(false);
    else if (/supported/i.test(line)) out.push(true);
    if (out.length === n) break;
  }
  while (out.length < n) out.push(false);
  return out;
}

/** faithfulness = supported / total; 1 when there are no claims (e.g. a refusal). */
export function faithfulnessScore(verdicts: boolean[]): number {
  if (verdicts.length === 0) return 1;
  return verdicts.filter(Boolean).length / verdicts.length;
}
