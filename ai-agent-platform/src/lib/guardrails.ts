/**
 * Guardrails — cheap, standalone checks that keep the agent safe and robust.
 * These are the "boring" production pieces that separate a demo from a system.
 */

export interface GuardResult {
  ok: boolean;
  reason?: string;
}

// 1. Input validation — reject empty or oversized input before spending a call.
export function validateInput(input: string, maxChars = 4000): GuardResult {
  const text = (input ?? "").trim();
  if (!text) return { ok: false, reason: "empty input" };
  if (text.length > maxChars) {
    return { ok: false, reason: `input too long (${text.length} > ${maxChars} chars)` };
  }
  return { ok: true };
}

// 2. Prompt-injection detection — flag obvious attempts to override the system.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |the )?(previous|prior|above) (instructions|prompts?)/i,
  /disregard (the )?(system|previous) (prompt|instructions)/i,
  /you are now (a|an|the)?\s*\w+/i,
  /reveal (your )?(system prompt|instructions)/i,
  /pretend (to be|you are)/i,
];
export function detectInjection(input: string): GuardResult {
  for (const p of INJECTION_PATTERNS) {
    if (p.test(input)) return { ok: false, reason: `possible prompt injection (matched ${p})` };
  }
  return { ok: true };
}

// 3. Tool allow-list — only known tools may execute (defense in depth against a
//    model hallucinating a tool name).
export function isToolAllowed(name: string, allow: ReadonlySet<string>): boolean {
  return allow.has(name);
}

// 4. Tool timeout — never let a slow/hung tool stall the whole run.
export async function withTimeout<T>(promise: Promise<T>, ms: number, label = "tool"): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

// 5. Retry with exponential backoff — survive transient model/tool errors.
export async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseMs = 300): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < tries - 1) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}
