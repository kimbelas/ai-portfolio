/**
 * Lightweight prompt-injection *detection* for ingested/uploaded documents.
 *
 * IMPORTANT: this is a heuristic tripwire, NOT a security boundary. It catches
 * common, known phrasings of injection attempts so we can warn the user and log
 * them — it will miss novel or obfuscated attacks. The real defense lives in the
 * grounding prompt (instruction hierarchy + untrusted-context delimiting in
 * `rag.ts`), which is measured by the injection eval (`learn/09-injection.ts`).
 * Defense-in-depth: detect what we can, and make the model robust to the rest.
 */

const INJECTION_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "ignore-previous-instructions", re: /ignore\s+(all\s+|any\s+)?(previous|prior|the\s+above|earlier)\s+(instructions?|rules?|prompts?|context)/i },
  { label: "disregard-above", re: /disregard\s+(the\s+|all\s+)?(above|previous|prior|earlier|following)/i },
  { label: "system-prompt-reference", re: /\bsystem\s+(prompt|message|instructions?|override)\b/i },
  { label: "reveal-instructions", re: /(reveal|print|repeat|show|output)\b.{0,40}\b(system|prompt|instructions?|rules?)/i },
  { label: "role-override", re: /you\s+are\s+now\b|from\s+now\s+on[, ]|act\s+as\s+(a|an|if)\b/i },
  { label: "new-rules", re: /\bnew\s+(instructions?|rules?|policy|directive)\b/i },
  { label: "suppress-refusal", re: /never\s+(say|reply|respond)\b.{0,30}\b(don.?t|do not|cannot)\s+know|always\s+(answer|respond|provide)/i },
  { label: "jailbreak-persona", re: /\bDAN\b|do\s+anything\s+now|developer\s+mode|no\s+restrictions?/i },
];

export interface InjectionScan {
  flagged: boolean;
  labels: string[]; // which pattern classes matched (deduped)
}

/** Scan a document's text for known injection phrasings. */
export function detectInjection(text: string): InjectionScan {
  const labels = INJECTION_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
  return { flagged: labels.length > 0, labels: [...new Set(labels)] };
}
