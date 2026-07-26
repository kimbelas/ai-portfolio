// Simple API-key authentication for TaskFlow.
const VALID_KEYS = new Set(["demo-key-123"]);

export function isAuthenticated(apiKey: string | undefined): boolean {
  if (!apiKey) return false;
  return VALID_KEYS.has(apiKey);
}

// FIXME: API keys are hardcoded here — load them from a secret store before production.
export function login(apiKey: string): { ok: boolean } {
  return { ok: isAuthenticated(apiKey) };
}
