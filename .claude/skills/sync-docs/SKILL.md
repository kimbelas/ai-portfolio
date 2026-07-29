---
name: sync-docs
description: Detect and fix documentation drift — reconcile READMEs, WALKTHROUGH, ADR indexes, learning-ladder tables, and rung/ADR/test/script counts against the actual repo state, and flag stale "not done yet" or claim-vs-reality gaps. Use when docs may be outdated after code changes, when asked to "update outdated files/docs" or "sync the docs", or before making the repo public.
---

# sync-docs — reconcile documentation with reality

Docs drift the moment code moves: a README says "8 rungs / 3 ADRs" after you shipped 11 and 6, or "no reranker/deploy yet" long after both shipped. This skill finds claims the repo no longer supports and fixes the unambiguous ones, flagging judgment calls for the human.

**Integrity first:** never invent a number, and never "fix" a doc by rewording a false claim to *sound* true. Only change what the repo can prove; surface everything else.

## 1. Gather ground truth (from code, never from other docs)

For each package (every directory with a `package.json`), collect:
- **Rungs / lessons:** list `src/learn/*.ts` (or the repo's equivalent) → exact count + filenames.
- **ADRs:** list `docs/adr/*.md` → count + titles.
- **Tests:** list `**/*.test.ts`; if the test script is fast and needs no secrets, run it for the passing count.
- **Scripts + deps:** read `package.json` (`scripts` names, dependency names + versions).
- **Deploy / URLs:** look for `render.yaml`, `Dockerfile`, and any live-URL references.
- **Wired vs demo:** grep to check whether a *claimed* feature (guardrail, cost meter, tracing, retry) is actually imported/called on a shipped path (`src/lib`, `src/web`, the server/graph entry) — versus existing only in a `learn/`/demo file or defined-but-never-called.

## 2. Scan the docs for drift

Check every `README.md` (root + per package), `WALKTHROUGH.md`, `docs/blog/*.md`, ADR indexes, and any plan/strategy doc for:
- **Count drift:** "N rungs", "N ADRs", "N tests", ladder tables, script lists → compare to §1.
- **Stale status:** "no X yet", "planned", "TODO", "not deployed" for things now shipped — and the reverse (claiming shipped what isn't).
- **Command/version drift:** referenced commands or versions that no longer exist in `package.json`.
- **Claim-vs-reality (the dangerous kind):** a README sells a feature that §1 showed is defined-but-not-wired. Do **not** silently reword to hide it.

## 3. Apply, then report

- **Auto-fix** only unambiguous, code-provable drift (counts, ladder tables, script/ADR lists, resolved "not-done-yet" claims). Match each doc's existing tone and formatting.
- **Flag for the human — do not auto-change:** claim-vs-reality feature gaps, any number you can't reproduce, and anything inside a personal narrative or strategy/plan doc. Recommend the fix (wire the feature *or* downgrade the claim) and let the human choose.
- End with a short report: what was reconciled, and what needs a human decision.

## 4. Guardrails
- Never fabricate a benchmark number. If a doc cites a result, verify it's reproducible (`npm run eval` etc.) or flag it.
- Prefer honest, specific language ("demonstrated in `src/learn/`, not yet wired into the product") over vague upgrades.
- This skill normally edits only Markdown; if you touch anything executable, re-run `typecheck`/tests before finishing.
