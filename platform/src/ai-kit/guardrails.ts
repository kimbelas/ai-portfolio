/**
 * ai-kit/guardrails — the shared guardrail layer for the platform. Same set the
 * flagships use; centralized here as the consolidation target.
 */

export interface GuardResult {
  ok: boolean;
  reason?: string;
}

export function validateInput(input: string, maxChars = 4000): GuardResult {
  const text = (input ?? "").trim();
  if (!text) return { ok: false, reason: "empty input" };
  if (text.length > maxChars) return { ok: false, reason: `input too long (${text.length} chars)` };
  return { ok: true };
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |the )?(previous|prior|above) (instructions|prompts?)/i,
  /disregard (the )?(system|previous) (prompt|instructions)/i,
  /you are now (a|an|the)?\s*\w+/i,
  /reveal (your )?(system prompt|instructions)/i,
];
export function detectInjection(input: string): GuardResult {
  for (const p of INJECTION_PATTERNS) {
    if (p.test(input)) return { ok: false, reason: `possible prompt injection (matched ${p})` };
  }
  return { ok: true };
}
