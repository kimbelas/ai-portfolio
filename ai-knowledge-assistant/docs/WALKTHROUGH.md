# Walkthrough — how this RAG system works

A guided tour of the AI Knowledge Assistant, from first principles to the full
pipeline. Every concept maps to a runnable script and a real result.

## The core idea: two phases

An LLM is **stateless** — it has no memory of your documents. RAG works by
*finding* the relevant pieces at query time and *pasting them into the prompt*.

```
INDEX-TIME (once)                     QUERY-TIME (every question)
  knowledge/*.md                        question
     │ chunk (structure-aware)             │ embed
     ▼                                     ▼
  chunks                                query vector
     │ embed each once                     │ retrieve: semantic + keyword → RRF
     ▼                                     │           → cross-encoder rerank
  vectors → vector store                 top-k chunks
  (in-memory, or pgvector — rung 11)      │ build grounded prompt
                                          ▼
                                        LLM (Groq) → cited answer, or "I don't know"
```

Retrieval quality decides answer quality.

## The rung ladder (each = one concept)

| Rung | Concept | Script |
|------|---------|--------|
| 1 | One LLM call — messages, tokens, cost | `learn:01` |
| 2 | Structured output — constrain to JSON + validate | `learn:02` |
| 3 | Embeddings — text → vectors, cosine similarity | `learn:03` |
| 4 | Chunk + store — index once, query cheaply | `learn:04` |
| 5 | Retrieval — semantic → hybrid (RRF) → cross-encoder rerank | `learn:05` |
| 6 | RAG loop — retrieve → ground → cite → "I don't know" | `learn:06` |
| 7 | Evals — recall@k + LLM-judged correctness | `learn:07` |
| 8 | Production — streaming, latency meter, guardrail | `learn:08` |
| 9 | Adversarial — indirect prompt-injection defense + resistance eval | `learn:09` |
| 10 | Faithfulness — per-claim groundedness (RAGAS-style) | `learn:10` |
| 11 | Persistence — graduate the store to Postgres + pgvector | `learn:11` |

## Step case: one question, end to end

Question: **"How much does the Pro plan cost and what does it include?"**

1. **Embed** the question → a 384-dim vector (local, $0).
2. **Semantic rank** — cosine vs every stored chunk; the pricing chunk scores highly.
3. **Keyword rank** — term overlap ("pro", "plan", "cost") also favors pricing.
4. **Fuse (RRF)** — combine both rankings into one candidate list.
5. **Rerank** — a cross-encoder re-scores each *(question, chunk)* pair together and keeps the top-k (this is what rescues a chunk a bi-encoder buries — see ADR-0004).
6. **Build prompt** — numbered context passages + the grounding contract:
   *answer only from context, cite [n], else say "I don't know"* (plus an
   instruction hierarchy that treats the passages as untrusted data — ADR-0005).
7. **Generate** (Groq) → a cited answer, e.g. *"…$9 per month… [1]"*.

## Step case: the refusal (the trust boundary)

Ask something not in the docs (*"What is the CEO's name?"*). Retrieval still
returns the closest chunks, but none contain the answer, so the model replies
**"I don't know based on the provided documents."** A naive chatbot would
invent a name. This anti-hallucination behavior is what makes it trustworthy —
and it's measured (refusal accuracy 100% on out-of-doc questions).

## How it's measured

The eval harness is the point — five metrics, each catching a different failure
(real numbers + honest caveats in [`docs/blog/measuring-rag-quality.md`](blog/measuring-rag-quality.md)):

| command | metric | result |
|---|---|---|
| `npm run eval` | retrieval recall@k | 93% → **100%** with rerank |
| `npm run eval` | answer correctness (LLM-judge) | 93% → **100%** with rerank |
| `npm run eval` | refusal accuracy (out-of-doc) | **100% (5/5)** |
| `npm run eval:injection` | prompt-injection resistance | 17% → **100%** hardened |
| `npm run eval:faithfulness` | per-claim groundedness | **97%** |

The value isn't any single number — it's the *instrument*. Change a dial (chunk
size, k, model, prompt, semantic↔hybrid↔rerank) and rerun to watch the number
move. That measure→change→measure loop is the core of AI engineering. *(Honest
limits: small single-domain eval sets, single runs, and the LLM judge is the
same model grading itself — the writeup says so plainly.)*

## Try it

```bash
npm run web                    # browser chat UI (or the live demo, see README)
npm run ask -- "Can Acme staff read my files, and is it SOC 2 certified?"
npm run eval                   # recall@k + correctness + refusal
npm run eval:injection         # prompt-injection resistance
npm run eval:faithfulness      # per-claim groundedness
npm run learn:11               # graduate the store to pgvector (embedded, no Docker)
```

## Design decisions

See `docs/adr/` — in-memory vs pgvector (0001), provider-agnostic/Groq (0002),
hybrid RRF retrieval (0003), cross-encoder reranker (0004), prompt-injection
defense (0005), pgvector persistence (0006).

## Known limitations / next

The pipeline is deployed (Render), has a browser UI + bring-your-own-docs upload,
and a `pgvector` store exists and is tested — but pgvector is **not yet the
default backend** (the retrieval pipeline is synchronous; making it default needs
an async-store refactor + a hosted Postgres). The eval sets are small and
single-domain, and the LLM judge is self-graded — the next work is scaling and
diversifying the evals and adding an independent judge.
