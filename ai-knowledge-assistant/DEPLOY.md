# Deploy for free — Render

Hugging Face's **Docker** Spaces now require billing (only Gradio/Streamlit/Static are free). This app is a **Node server with on-device models**, so the simplest **free, no-rewrite** host is **Render** — it deploys straight from your GitHub repo (works with a private repo, no file-copying).

> **What you get:** a public URL like `https://acme-knowledge-assistant.onrender.com` running the chat UI. First load ~1 min (models download once); free instances sleep after ~15 min idle and wake on the next visit.

---

## Option A — Blueprint (recommended, one file)

The repo already contains `render.yaml`, so Render can set everything up automatically.

1. Sign up at **https://render.com** using **GitHub** (authorize access to your repositories, including private ones).
2. Dashboard → **New +** → **Blueprint**.
3. Select the **`ai-portfolio`** repository. Render reads `render.yaml` and shows a web service named `acme-knowledge-assistant`.
4. It will prompt for the **`GROQ_API_KEY`** value → paste your Groq key (from https://console.groq.com/keys).
5. Click **Apply**. Render builds (`npm install`) and starts it. When it's live, open the `…onrender.com` URL shown at the top.

## Option B — Manual (dashboard clicks, no Blueprint)

1. render.com → **New +** → **Web Service** → connect the **`ai-portfolio`** repo.
2. **Root Directory:** `ai-knowledge-assistant`
3. **Language / Runtime:** **Node**
4. **Build Command:** `npm install`
5. **Start Command:** `npm run web`
6. **Instance Type:** **Free**
7. **Environment** → **Add Environment Variable:** `GROQ_API_KEY` = your Groq key.
8. **Create Web Service** → wait for the build → open the URL.

The server automatically uses the port Render provides — nothing to configure.

---

## Note on Hugging Face (if you'd rather host there)

HF free tiers are **Gradio / Streamlit / Static (Python)** only. To deploy on HF for free, I'd **rewrite this as a Gradio (Python) Space** (sentence-transformers for embeddings + reranking, Groq for generation). More work, but it keeps you on HF and adds Python to the portfolio — just say the word.

## Troubleshooting

- **Build fails / red status:** open Render's **Logs**, copy the error — usually a quick `render.yaml` or dependency fix.
- **App loads but every answer errors:** the `GROQ_API_KEY` env var is missing or wrong. Fix it in Render → **Environment**, then it redeploys.
- **Out of memory** (free tier is 512 MB): tell me and I'll switch the embedding model to a smaller quantized build (`EMBED_DTYPE=q8`) to cut RAM.
- **It went to sleep:** free instances sleep when idle; the next visit wakes it (~30–60s). Normal for a free demo — a paid instance or a keep-warm ping removes it.
