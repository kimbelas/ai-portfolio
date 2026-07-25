# Walkthrough — how this RAG system works

A guided tour of the AI Knowledge Assistant, from first principles to the full
pipeline. Every concept maps to a runnable script and a real result.

## The core idea: two phases

An LLM is **stateless** — it has no memory of your documents. RAG works by
*finding* the relevant pieces at query time and *pasting them into the prompt*.

```
INDEX-TIME (once)                     QUERY-TIME (every question)
  knowledge/*.md                        question
     │ chunk                               │ embed
     ▼                                     ▼
  chunks                                query vector
     │ embed each once                     │ retrieve (semantic + keyword → RRF)
     ▼                                     ▼
  vectors → InMemoryVectorStore         top-k chunks
                                          │ build grounded prompt
                                          ▼
                                        LLM (Groq) → cited answer
```

Retrieval quality decides answer quality.

## The rung ladder (each = one concept)

| Rung | Concept | Script |
|------|---------|--------|
| 1 | One LLM call — messages, tokens, cost | `learn:01` |
| 2 | Structured output — constrain to JSON + validate | `learn:02` |
| 3 | Embeddings — text → vectors, cosine similarity | `learn:03` |
| 4 | Chunk + store — index once, query cheaply | `learn:04` |
| 5 | Retrieval — semantic vs hybrid (RRF) | `learn:05` |
| 6 | RAG loop — retrieve → ground → cite → "I don't know" | `learn:06` |
| 7 | Evals — recall@k + LLM-judged correctness | `learn:07` |
| 8 | Production — streaming, latency meter, guardrail | `learn:08` |

## Step case: one question, end to end

Question: **"How much does the Pro plan cost and what does it include?"**

1. **Embed** the question → a 384-dim vector (local, $0).
2. **Semantic rank** — cosine vs every stored chunk; the pricing chunk scores highest.
3. **Keyword rank** — term overlap ("pro", "plan", "cost") also favors pricing.
4. **Fuse (RRF)** — combine both rankings → top-k chunks.
5. **Build prompt** — numbered context passages + the grounding contract:
   *answer only from context, cite [n], else say "I don't know."*
6. **Generate** (Groq) → a cited answer, e.g. *"…$9 per month… [1]"*.
7. **Cost** — token usage printed; ~fractions of a cent at frontier rates, $0 on Groq.

## Step case: the refusal (the trust boundary)

Ask something not in the docs (*"What is the CEO's name?"*). Retrieval still
returns the closest chunks, but none contain the answer, so the model replies
**"I don't know based on the provided documents."** A naive chatbot would
invent a name. This anti-hallucination behavior is what makes it trustworthy.

## How it's measured (rung 7)

`npm run eval` runs a labeled dataset and reports:
- **retrieval recall@k** — did the right document get retrieved (semantic vs hybrid)?
- **answer correctness** — an LLM-as-judge grades each answer against a gold fact.

The value isn't any single number — it's the *instrument*. Change a dial (chunk
size, k, model, prompt, semantic↔hybrid) and rerun to see the number move.
That measure→change→measure loop is the core of AI engineering.

## Try it

```bash
npm run ask -- "Can Acme staff read my files, and is it SOC 2 certified?"
npm run eval
```

## Design decisions

See `docs/adr/` — in-memory vs pgvector (0001), provider-agnostic/Groq (0002),
hybrid RRF retrieval (0003).

## Known limitations / next

In-memory store (not persistent) → pgvector. No cross-encoder reranker yet.
Small corpus/eval → grow with real docs. No API/UI/deploy yet.
