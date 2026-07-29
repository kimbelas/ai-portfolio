# Senior AI Engineer Portfolio — Build Plan

> **Goal:** A portfolio that makes an AI-first startup think *"this person can architect and ship production AI systems,"* not *"another ChatGPT wrapper."*
>
> **Owner:** Matt Belas — senior full-stack (Angular, Laravel, Node, TypeScript, enterprise). Positioning: **the rare full-stack engineer who builds AI-native products end-to-end.**
>
> **Status (2026-07-28) — read this first.** This is the *original* plan; the build deliberately diverged. Stack: a **free, provider-agnostic** setup — **Groq** (`gpt-oss`, `llama-3.3`) for generation + **on-device `@huggingface/transformers`** embeddings/reranker + **Render** deploy — *not* Claude/Vercel/Railway. Scale is **smaller** than the aspirational targets below (which are templates, not results). The real, reproducible numbers live in each flagship's README and in [`ai-knowledge-assistant/docs/blog/measuring-rag-quality.md`](ai-knowledge-assistant/docs/blog/measuring-rag-quality.md). §10 (interview narrative) has been rewritten to the **actual shipped** results — use that one.

---

## 1. Positioning thesis

You are **not** competing as "an ML researcher." You are competing as **a senior engineer who builds AI-native products** — someone who owns the whole stack from UI → API → orchestration → retrieval → evals → deployment, and who *measures and productionizes* instead of demoing.

Everything in this portfolio must reinforce three claims:

1. **I design AI *systems*, not prompts.** (architecture diagrams, ADRs, failure handling)
2. **I *measure* AI quality.** (eval sets, benchmark numbers, before/after charts)
3. **I *ship* AI to production.** (deployed URLs, Docker, observability, cost tracking)

If a repo doesn't advance one of those three claims, cut it.

---

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| **Primary language** | TypeScript (Node 20+) | Your leverage; startups run on TS/React. Read Python, ship TS. |
| **Structure** | 3 deep flagship repos + shared platform kit | Depth = senior. Shared kit = coherent body of work. |
| **Timeline** | Full-time, ~8–10 wk phased | Enough for real evals + deployment + writeups. |
| **Target** | AI-first startups (seed–Series B) | Optimizes for velocity, full-stack ownership, cost. |
| **LLM** | Model-agnostic abstraction; Claude (Anthropic) primary, OpenAI wired for eval comparison | Shows you don't marry one vendor; comparison = judgment. |

### Default stack (pragmatic, one-datastore-where-possible)

- **Orchestration:** LangGraph.js (agents/state), Vercel AI SDK (streaming/product surface), direct SDK where simpler.
- **Data + vectors:** PostgreSQL + `pgvector` (one datastore for a startup). Note Qdrant/Pinecone as alternatives in an ADR.
- **Retrieval:** Hybrid = pgvector (dense) + Postgres FTS/BM25 (sparse) + a reranker (Cohere rerank or a cross-encoder).
- **Embeddings:** `voyage-3`-class or `text-embedding-3-large`. Pick one, justify in an ADR, benchmark the other.
- **Evals:** Custom lightweight TS harness (or Promptfoo). Real labeled datasets committed to the repo.
- **Observability:** LangSmith **or** OpenTelemetry traces + cost/token middleware (Helicone or hand-rolled).
- **Frontend:** Next.js (App Router). You know Angular — Next is a short ramp and it's the AI-app lingua franca. Use Angular only if velocity demands it.
- **Deploy:** Docker everywhere; backend on Railway/Fly, frontend on Vercel.
- **MCP:** TypeScript MCP SDK (flagship 3).

> Model note: use a **Sonnet-class** model for most agent/tool work (cost + latency), reserve an **Opus-class** model for hard reasoning/eval-judge steps, and a **Haiku-class** for cheap classification/routing. Build a thin model-router so you can swap and A/B in evals — that abstraction *is* a senior signal.

---

## 3. The senior signals (what actually wins the offer)

These are cross-cutting and they matter **more than the project list**. Bake them into every repo.

1. **Evals with real numbers.** A committed dataset + a benchmark you can defend. *(Illustrative target — NOT a result: "hybrid + reranking lifted accuracy X% → Y% on N questions.")* **Actual, shipped:** retrieval recall@1 **93% → 100%** by adding a cross-encoder reranker on a 15-question labeled set (see the blog), plus refusal, injection-resistance, and faithfulness metrics. This is the #1 differentiator. Most candidates have zero of it.
2. **The production layer.** Streaming, retries + backoff, timeouts, structured-output validation (Zod), token/cost budgeting per request, response caching, rate limiting, **prompt-injection guardrails**, and **human-in-the-loop approval** for risky tool calls.
3. **ADRs (Architecture Decision Records).** 1-page `docs/adr/NNNN-*.md` files: *"Why pgvector over Pinecone, and when I'd flip."* Judgment > code.
4. **Observability.** Every LLM call traced; a dashboard or screenshots showing latency, tokens, cost per request. "I can debug an agent in prod."
5. **Cost discipline.** A README line: *"avg query = 1,850 tokens ≈ $0.004; cut 40% via caching + a smaller router model."* Startups feel this.
6. **A definition of done per repo (§7)** — no half-finished repos pinned.

---

## 4. The three flagships

Chosen to (a) cover retrieval, agents, and modern agent-infra without overlap, and (b) each carry one distinct senior claim.

### 🟦 Flagship 1 — Production RAG Knowledge Assistant
**Claim it proves:** *"I measure and optimize retrieval quality."*
**Difficulty:** ⭐⭐⭐ · **Build time:** ~2 weeks

The "table-stakes" project done at a level 95% of candidates don't reach. Upload docs → hybrid retrieval → grounded, cited answers → **measured**.

- **Pipeline:** ingest (PDF/MD/HTML) → smart chunking (structure-aware, not naive 512-token) → embed → store (pgvector + FTS) → hybrid retrieve → rerank → answer with inline citations → stream to UI.
- **The star feature — the eval harness:** a committed set of ~150–250 Q/A pairs with ground-truth sources. Metrics: retrieval recall@k, answer faithfulness (LLM-judge + spot-checks), citation accuracy, p50/p95 latency, $/query. Ship a **benchmark table** comparing: naive vs hybrid; with vs without reranking; chunk-size sweep; two embedding models.
- **Senior touches:** metadata filtering, "I don't know" when retrieval is weak (no hallucinated answers), streaming, caching, cost readout.
- **Deliverables:** deployed demo, architecture diagram, 2 ADRs (vector store choice, chunking strategy), a blog post *"How I took RAG accuracy from X% to Y%."*

### 🟩 Flagship 2 — Autonomous Agent Platform (LangGraph)
**Claim it proves:** *"I build agents that don't fall over in production."*
**Difficulty:** ⭐⭐⭐⭐ · **Build time:** ~3 weeks

A multi-step agent that takes a goal, plans, calls tools (web search, retrieval from Flagship 1, code exec, external APIs), keeps state, and produces a structured deliverable (e.g., a researched report or an ops action). Merges the "research agent" and "multi-agent" ideas into one strong system.

- **Core:** LangGraph.js graph with explicit **state, routing, checkpoints, and resumability**. A supervisor/worker pattern only if it earns its keep — don't add agents for theater.
- **Senior touches (this is where the repo wins):**
  - **Human-in-the-loop approval** before any destructive/expensive tool call.
  - **Guardrails:** input validation, prompt-injection detection, tool-call allow-lists, output schema validation.
  - **Observability:** full trace of every node, token/cost per run, a replay of a failed run in the README.
  - **Failure handling:** retries, tool timeouts, graceful degradation, loop/step budget caps.
  - **Structured outputs** end-to-end via Zod schemas.
- **Deliverables:** deployed demo, LangGraph diagram, a "here's a trace of a real run" walkthrough, ADR on the orchestration pattern, blog post on HITL + guardrails.

### 🟪 Flagship 3 — MCP-native AI Coding/Dev Assistant
**Claim it proves:** *"I understand modern agent infrastructure (MCP + tool calling) deeply."*
**Difficulty:** ⭐⭐⭐⭐⭐ · **Build time:** ~3 weeks · **Highest ceiling, highest risk**

An assistant that understands a repo and can answer/act on it — built on **MCP** (the protocol Claude Code itself uses). You'll author an **MCP server** exposing repo tools (read, search, AST-aware symbol lookup, run tests) and an **MCP host/client** that drives an LLM agent over them.

- **Why this one:** MCP is the hottest current agent-infra skill, it's adjacent to the Claude Code you already use, and it fills the one gap your resume doesn't already cover (deep agent internals).
- **Senior touches:** tool sandboxing/permissions, AST parsing for real code understanding (not just grep), test-execution loop, streaming edits, cost caps.
- **⚠️ Risk valve:** if week 8 is tight, **swap this for a leaner "vertical AI product" (e.g., a customer-support/ops agent with CRM + refund tools + HITL)** — more product signal, less depth. Decide at the week-7 checkpoint, not before.
- **Deliverables:** deployed/CLI demo + video, MCP architecture diagram, ADR on MCP vs raw function-calling, blog post *"Building an MCP server from scratch in TypeScript."*

---

## 5. The shared platform kit (the connective tissue)

A small internal package reused across all three repos. This is what turns "3 repos" into "a coherent platform-thinking body of work."

- `@you/ai-kit` (or just a shared folder): model router, structured-output helpers (Zod), retry/backoff, token+cost meter, tracing wrapper, a reusable **eval runner**, and guardrail middleware.
- Publish it (npm or a public repo) with its own README. "I extracted the reusable AI infrastructure across my projects" is a strong sentence in an interview.

---

## 6. Timeline (full-time, phased)

| Week | Focus | Exit criteria |
|---|---|---|
| **0 (2–3 days)** | Foundations: LLM APIs, embeddings, tool calling, structured outputs. Scaffold `ai-kit`, model router, tracing, cost meter. | Can make a traced, cost-metered, schema-validated LLM call. |
| **1–2** | **Flagship 1 (RAG)** incl. the eval harness + benchmark table. | Deployed; benchmark chart in README; 2 ADRs. |
| **3–5** | **Flagship 2 (LangGraph agent)** incl. HITL, guardrails, observability. | Deployed; real run trace; failure-handling demo. |
| **6–8** | **Flagship 3 (MCP)** — or the risk-valve swap. | Deployed/demo + video; MCP diagram. |
| **9** | Polish: READMEs, diagrams, ADRs, GitHub profile, pin repos, screenshots. | Every repo hits §7 Definition of Done. |
| **10** | Content + reach: 3 blog posts, 3 demo videos, 1–2 OSS contributions, resume/LinkedIn rewrite. | Portfolio is *discoverable* and *narratable*. |

> Adjust ±: if RAG evals are going well, spend the extra time there (it's the highest-signal repo). Protect week 9–10 — an unpolished repo reads as unfinished, which reads as junior.

---

## 7. Definition of done (per repo — no exceptions)

- [ ] `README` with: one-line pitch, **architecture diagram**, quickstart, and a **results/benchmark** section with numbers.
- [ ] **Deployed** and reachable (link in README) — or a <2 min demo video if it can't be hosted.
- [ ] **Dockerized**, `.env.example`, one-command local run.
- [ ] **Evals** with a committed dataset and reproducible `npm run eval`.
- [ ] **Tests** for the non-LLM logic (retrieval, parsing, guardrails, routing).
- [ ] Observability: traces + a cost/token readout (screenshot ok).
- [ ] At least **1 ADR**.
- [ ] A short **blog post** linked from the README.

---

## 8. GitHub presentation

Profile README + **6 pinned repos**: the 3 flagships, `ai-kit`, an `ai-evals` (or the eval harness), and a `blog`/writeups repo.

Each flagship README opens with a diagram like:

```
        User
          │
          ▼
   Next.js frontend  ── streaming ──►  UI
          │
          ▼
   Node/TS API (ai-kit: router, guardrails, cost meter, tracing)
          │
          ▼
   LangGraph agent ──► tools (search, retrieval, exec)
          │
          ▼
   pgvector + Postgres FTS  ──► reranker
```

Hiring managers skim. Diagram + numbers + deployed link in the first screenful = interview.

---

## 9. Anti-patterns (things that scream "junior")

- ❌ A chatbot with no evals and no numbers.
- ❌ Six half-finished repos.
- ❌ "Multi-agent" with agents that add no value (theater).
- ❌ Only the happy path — no retries, no guardrails, no failure demo.
- ❌ No deployment ("works on my machine").
- ❌ Copy-pasted tutorial code with no ADR explaining *your* choices.
- ❌ Vendor lock-in with no abstraction (marrying one SDK).

---

## 10. Interview narrative (rehearse this)

> *"I built three AI systems on a free, provider-agnostic stack — Groq for generation, on-device embeddings — each measured, not just demoed. The RAG assistant: I lifted retrieval recall@1 from 93% to 100% by adding a cross-encoder reranker — I traced the one failing question, a SAML lookup, to a retrieval miss and fixed it. It also scores 100% refusal on out-of-doc questions, 97% faithfulness, and I hardened it against indirect prompt injection from 17% to 100% resistance. It's deployed on Render with a browser UI and bring-your-own-docs upload. The agent platform runs on LangGraph with human-in-the-loop approval for risky tools and guardrails, and I measure tool-selection accuracy and task success. The third is an MCP server I wrote from scratch over stdio, sandboxed, with deterministic codebase-QA evals. All three are unit-tested and typechecked in CI, and every non-obvious decision has an ADR."*
>
> *(Every number is reproducible: `npm run eval` / `eval:injection` / `eval:faithfulness`. Honest caveat I volunteer: the eval sets are small and single-domain, and the LLM judge is currently self-graded — scaling and an independent judge are the next work.)*

That paragraph is the entire goal of this plan. Every task above exists to make it true and provable — and now it *is* true and provable.

---

## 11. Learning-as-you-go (just-in-time, not up-front)

Learn each topic *when the project needs it*, not before:

- **Wk 0:** LLM API basics, embeddings, function/tool calling, structured outputs (Zod), streaming.
- **Wk 1–2:** chunking strategies, dense vs sparse vs hybrid retrieval, reranking, RAG evaluation (faithfulness/recall).
- **Wk 3–5:** LangGraph (state/routing/checkpoints), agent design patterns, guardrails, HITL, observability/tracing.
- **Wk 6–8:** MCP protocol + TS SDK, AST parsing, tool sandboxing.

---

### Next steps (pick one — I'll do it now)
1. **Scaffold Flagship 1** (repo skeleton, `ai-kit`, Docker, `.env.example`, a running traced LLM call).
2. **Turn this into a visual roadmap** you can share (published web page).
3. **Deep-dive the stack** — I verify current best choices (embeddings, reranker, LangGraph.js vs alternatives) with sources before you commit.
