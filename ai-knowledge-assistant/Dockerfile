# Flagship 1 RAG web UI — Hugging Face Spaces (Docker SDK).
FROM node:20-slim

# onnxruntime-node (used by @huggingface/transformers for local embeddings +
# reranker) needs libgomp at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces run the container as uid 1000; give that user a writable HOME so the
# model cache can be written on first request.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

# Install deps first for better layer caching. We run TypeScript directly with
# tsx (a devDependency), so do NOT set NODE_ENV=production.
COPY --chown=user package.json ./
RUN npm install

# Copy the app. node_modules/.env/.cache are excluded via .dockerignore.
COPY --chown=user . .

# HF Spaces routes external traffic to app_port (declared in README frontmatter).
ENV PORT=7860
EXPOSE 7860

CMD ["npm", "run", "web"]
