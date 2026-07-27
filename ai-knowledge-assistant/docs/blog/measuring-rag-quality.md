# Measuring RAG quality: 93% → 100% recall with a reranker (and proving it won't hallucinate)

Anyone can wire up a RAG chatbot in an afternoon: embed some docs, do a
cosine-similarity search, stuff the top chunks into a prompt. It demos well.
The question a senior engineer has to answer is the next one: **is it actually
correct, and how do you know?**

This is a writeup of how I turned "it seems to work" into numbers for
[Flagship 1](../../README.md) of my portfolio — the retrieval changes I made,
the number they moved, the one failure that survived, and the honest caveats.
Everything here is reproducible with `npm run eval`.

---

## Why measure at all

A RAG system has two ways to be wrong, and they look identical in a demo:

1. **It retrieves the wrong passages** → the answer is confidently wrong.
2. **It answers things the docs don't cover** → it hallucinates from the
   model's general knowledge instead of saying "I don't know."

You cannot see either failure by asking it three questions you already know the
answer to. You see them by scoring it against a labeled set — the same way you'd
never ship a classifier without a test set.

So the first real artifact isn't the retriever. It's the **eval harness**:
[`src/learn/07-evals.ts`](../../src/learn/07-evals.ts).

## The setup: a deliberately hard corpus

The corpus is 15 support docs (~37 chunks) for a fictional product, "Acme." I
made it **hard on purpose**: it contains near-duplicate and distractor docs —
`security` vs `encryption` vs `compliance`, `plans` vs `billing` vs
`enterprise`. That's where naive semantic search breaks: the question "Does Acme
support SAML?" is *semantically close* to a dozen chunks about security that
never mention SAML.

The labeled dataset is 15 questions, each with:

- `goldSources` — which doc(s) count as a correct retrieval, and
- `goldFact` — the fact a correct answer must state.

Plus 5 **negative** questions that are deliberately *not* in the corpus.

## Three metrics, each catching a different failure

**1. Retrieval recall@k** (deterministic, no LLM). Did an acceptable source
appear in the top-k? This isolates the retriever from the generator — if recall
is bad, no amount of prompt engineering saves you.

**2. Answer correctness** (LLM-as-judge). A separate model grades the final
answer PASS/FAIL against the gold fact. This catches the case where retrieval
was fine but the model still garbled the answer.

**3. Refusal accuracy** (the part most demos skip). Over the 5 out-of-doc
questions, does it correctly decline? The strongest case here is
*"What is the capital of France?"* — the model **knows** the answer from
pre-training. A grounded RAG system must refuse anyway, because the answer isn't
in the provided documents. This metric is the whole trust proposition: it's what
lets a client point the tool at their own contract and believe the citations.

## Results

Running `npm run eval` against the hard corpus:

| retrieval             | recall@1 | recall@3 |
| --------------------- | -------- | -------- |
| semantic              | 93%      | 93%      |
| hybrid (RRF)          | 93%      | 93%      |
| **hybrid + rerank**   | **100%** | **100%** |

| answer quality                         | score          |
| -------------------------------------- | -------------- |
| answer correctness — hybrid            | 93% (14/15)    |
| answer correctness — **hybrid+rerank** | **100% (15/15)** |
| refusal accuracy (out-of-doc)          | **100% (5/5)** |

## The failure that survived — and how I fixed it

At the hybrid stage, one question failed end-to-end: **"Does Acme support SAML
single sign-on?"**

I traced it instead of guessing. The retrieval trace showed the top-k was full
of high-similarity `security` and `two-factor` chunks — all *about*
authentication, none mentioning SAML. The one chunk that actually answered the
question (in `enterprise.md`) ranked #4, just outside the k=3 window. So the
generator did exactly the right thing with what it was given: it **refused**,
because SAML genuinely wasn't in its context. A correct behavior driven by a
retrieval miss.

The fix wasn't a bigger k (that dilutes the prompt and invites other errors).
It was a **cross-encoder reranker**: hybrid search casts a wide net (top-15),
then `Xenova/ms-marco-MiniLM-L-6-v2` re-scores each *(question, chunk)* pair
*together* — which a bi-encoder embedding, computed independently per chunk,
can't do. The `enterprise` chunk jumped to the top, and both recall@1 and
answer correctness went to 100%. That's [ADR-0004](../adr/0004-cross-encoder-reranker.md).

## Honest caveats

Numbers without caveats are marketing, so:

- **The LLM judge is noisy.** On an earlier run it false-*failed* a correct
  "payment methods" answer that listed the methods in a different order than the
  gold fact. I trust the *trend* (hybrid+rerank beats hybrid) more than any
  single percentage point. A stricter rubric or a second judge would tighten this.
- **The corpus is small** (15 docs, 15+5 questions). These are directional
  results on one domain, not a leaderboard claim. The harness is built to grow —
  more docs and questions is the obvious next step.
- **Single run.** Retrieval recall is deterministic; the LLM-judged and
  generated numbers can vary slightly run-to-run. I report a representative run.
- **100% is a ceiling artifact.** On a bigger, harder set it will drop — and
  that's fine. The point of the harness is to *see* it drop and know why.

## Reproduce it

```bash
cd ai-knowledge-assistant
npm install
export GROQ_API_KEY=...        # any OpenAI-compatible provider works
npm run eval
```

Embeddings and the reranker run **on-device** via Transformers.js — no data
leaves the machine for retrieval; only the final generation call hits the LLM.

## What this actually demonstrates

The retriever is commodity. What isn't: choosing metrics that map to real
failure modes, building a labeled set hard enough to expose them, tracing a
failure to its true cause instead of patching symptoms, making a *measured*
architectural change, and being honest about the noise floor. That's the loop —
and it's the difference between a RAG demo and a RAG system you'd let a paying
customer point at their own documents.

Live demo: <https://acme-knowledge-assistant.onrender.com/> ·
Code: <https://github.com/kimbelas/ai-portfolio>
