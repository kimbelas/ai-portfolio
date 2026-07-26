# Deploy to Hugging Face Spaces (free) — step by step

This deploys the RAG web UI as a **Docker Space** on Hugging Face's free CPU tier.
No prior HF experience needed — follow these in order. Everything you push lives
in a separate git repo that HF hosts (the "Space").

> **What you get:** a public URL like `https://huggingface.co/spaces/<you>/acme-knowledge-assistant`
> running the chat UI. First load takes ~1 minute (cold start + one-time model download); it's instant after that until the Space sleeps from inactivity.

---

## 1. Create a Hugging Face account + access token

1. Sign up at **https://huggingface.co/join** (free).
2. Create a **write** token: **https://huggingface.co/settings/tokens** → **New token** → Type: **Write** → create it → **copy it** (you'll paste it as your git password later). Treat it like a password.

## 2. Create the Space

1. Go to **https://huggingface.co/new-space**.
2. **Owner:** you · **Space name:** `acme-knowledge-assistant`
3. **License:** optional (e.g. MIT).
4. **Select the Space SDK:** **Docker** → template **Blank**.
5. **Hardware:** **CPU basic · 2 vCPU · 16 GB · FREE**.
6. **Visibility:** **Public** (so it's linkable on your résumé).
7. Click **Create Space**. You now have an (empty) git repo at
   `https://huggingface.co/spaces/<you>/acme-knowledge-assistant`.

## 3. Add your Groq API key as a secret

In the new Space: **Settings** → **Variables and secrets** → **New secret**:
- **Name:** `GROQ_API_KEY`
- **Value:** your Groq key (from https://console.groq.com/keys)

(Secrets are injected as environment variables at runtime — never commit the key.)

## 4. Push the app to the Space

Run these in **PowerShell**. Replace `<you>` with your HF username.

```powershell
# a) Clone the empty Space repo somewhere OUTSIDE the portfolio folder
cd C:\Users\belas\Documents
git clone https://huggingface.co/spaces/<you>/acme-knowledge-assistant hf-space

# b) Copy the app into it (excludes node_modules, .env, .git, .cache)
robocopy "C:\Users\belas\Documents\development\ai-portfolio\ai-knowledge-assistant" "C:\Users\belas\Documents\hf-space" /E /XD node_modules .git .cache /XF .env

# c) Commit + push
cd C:\Users\belas\Documents\hf-space
git add -A
git commit -m "Deploy Acme Knowledge Assistant"
git push
```

When `git push` asks for credentials:
- **Username:** your Hugging Face username
- **Password:** paste the **write token** from step 1 (not your account password)

## 5. Watch it build

On the Space page, open the **Logs** tab. HF builds the `Dockerfile`
(`npm install`, ~2–4 min), then starts the server. When you see
`RAG chat UI → http://localhost:7860`, switch to the **App** tab.

First question takes ~1 minute (the embedding + reranker models download once).
After that it's fast. Try: *"Is Acme HIPAA compliant?"* or *"What is the API rate limit?"*

---

## Updating later

Re-copy and push again:

```powershell
robocopy "C:\Users\belas\Documents\development\ai-portfolio\ai-knowledge-assistant" "C:\Users\belas\Documents\hf-space" /E /XD node_modules .git .cache /XF .env
cd C:\Users\belas\Documents\hf-space
git add -A; git commit -m "update"; git push
```

## Troubleshooting

- **Build fails / red status:** open **Logs**, copy the error — most issues are a
  missing system lib or a Node version quirk; easy to patch in the `Dockerfile`.
- **App loads but every answer errors:** the `GROQ_API_KEY` secret is missing or
  wrong (step 3). Re-check it, then **Settings → Factory reboot**.
- **"Application startup timeout":** the model download on first boot was slow —
  reboot the Space; it caches after the first successful start.
- **It went to sleep:** free Spaces sleep after inactivity; the next visit wakes
  it (~1 min). That's normal for a free demo.
- **Out of memory:** shouldn't happen on the 16 GB free tier; if it does, we can
  switch the embedding model to a quantized build.
