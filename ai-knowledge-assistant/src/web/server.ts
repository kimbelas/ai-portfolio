/**
 * Web UI for the RAG assistant (zero extra web deps — Node's built-in http).
 *
 * Routes:
 *   GET  /            → the chat page
 *   GET  /manual      → a "secret" explainer of how the whole system works
 *   POST /api/upload  → {files:[{name, base64}]} → builds an ISOLATED knowledge
 *                       base from the uploaded PDF/MD/DOCX and returns a kbId
 *   POST /api/ask     → {question, kbId?} → grounded, cited answer. If kbId is
 *                       given, answers ONLY from that upload; else the built-in docs.
 *
 * Run with:  npm run web   (needs GROQ_API_KEY) → http://localhost:8787
 */

import "dotenv/config";
import { createServer, type IncomingMessage } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { buildKnowledgeBase } from "../lib/kb";
import { answerQuestion } from "../lib/rag";
import { chunkText } from "../lib/chunk";
import { embed } from "../lib/embeddings";
import { InMemoryVectorStore } from "../lib/vectorStore";
import { extractText } from "../lib/extract";
import { detectInjection } from "../lib/guardrails";
import { estimateCostUSD } from "../lib/llm";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "../../web");
const INDEX_HTML = readFileSync(resolve(WEB, "index.html"), "utf8");
const MANUAL_HTML = readFileSync(resolve(WEB, "manual.html"), "utf8");
const PORT = Number(process.env.PORT) || 8787;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // ~10 MB of base64 per upload request
const MAX_TEXT_CHARS = 400_000; // extracted-text budget per upload (protects the 512MB free tier)
const MAX_CHUNKS_PER_UPLOAD = 300; // cap embedding work + memory per upload

// The built-in Acme knowledge base (default when no upload is active).
const defaultStore = buildKnowledgeBase();
defaultStore.catch((e) => console.error("[startup] failed to build default KB:", e));

// Keep the single Node process alive on the free tier: log stray async errors
// rather than let them terminate the server (one crash = full outage).
process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e));

// Isolated per-upload knowledge bases. The client passes its kbId with each
// question, so one visitor's docs never leak into another's answers.
const uploads = new Map<string, { store: InMemoryVectorStore; names: string[] }>();
const MAX_UPLOADS = 25;

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((res, rej) => {
    let body = "";
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        rej(new Error("payload too large"));
        req.destroy();
      } else {
        body += c;
      }
    });
    req.on("end", () => res(body));
    req.on("error", rej);
  });
}

const server = createServer(async (req, res) => {
  const json = (code: number, obj: unknown) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  const html = (body: string) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  };

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) return html(INDEX_HTML);
  if (req.method === "GET" && req.url === "/manual") return html(MANUAL_HTML);

  if (req.method === "POST" && req.url === "/api/upload") {
    try {
      const { files } = JSON.parse(await readBody(req, MAX_UPLOAD_BYTES));
      if (!Array.isArray(files) || files.length === 0) return json(400, { error: "no files provided" });

      const store = new InMemoryVectorStore();
      const names: string[] = [];
      const injectionLabels = new Set<string>();
      let chunks = 0;
      let totalChars = 0;
      for (const f of files) {
        const buf = Buffer.from(String(f.base64 ?? ""), "base64");
        const text = await extractText(String(f.name ?? "file"), buf);
        totalChars += text.length;
        if (totalChars > MAX_TEXT_CHARS)
          return json(413, { error: "Uploaded documents are too large to index on the free tier (~400k characters max). Try a smaller file." });
        // Tripwire (not a filter): warn if the doc contains injection-like text.
        // It's still indexed — the real defense is the grounding prompt's
        // instruction hierarchy (lib/rag.ts), which treats context as data.
        for (const label of detectInjection(text).labels) injectionLabels.add(label);
        const source = String(f.name ?? "file").replace(/\.[^.]+$/, "");
        for (const c of chunkText(source, text)) {
          if (chunks >= MAX_CHUNKS_PER_UPLOAD)
            return json(413, { error: "That document produced too many chunks to index on the free tier. Try a smaller file." });
          store.add(c, await embed(c.text));
          chunks++;
        }
        names.push(String(f.name));
      }
      if (store.size() === 0) return json(400, { error: "no text could be extracted from those files" });

      const kbId = randomUUID();
      uploads.set(kbId, { store, names });
      // Evict oldest to bound memory on the free tier.
      if (uploads.size > MAX_UPLOADS) uploads.delete(uploads.keys().next().value as string);
      if (injectionLabels.size) console.warn("[upload] injection-like text flagged:", [...injectionLabels]);
      return json(200, { kbId, names, chunks, flagged: injectionLabels.size > 0, injectionLabels: [...injectionLabels] });
    } catch (e) {
      return json(400, { error: (e as Error).message });
    }
  }

  if (req.method === "POST" && req.url === "/api/ask") {
    try {
      const { question, kbId } = JSON.parse(await readBody(req, 1024 * 1024));
      if (!question || typeof question !== "string") return json(400, { error: "question required" });
      // If a kbId is given it MUST resolve to a live upload. Never fall back to
      // the built-in docs — that would silently answer from the wrong corpus
      // (e.g. after the free instance sleeps and the in-memory upload is gone).
      let store: InMemoryVectorStore;
      if (kbId) {
        const entry = uploads.get(kbId);
        if (!entry) return json(410, { error: "Your uploaded documents expired (the server may have restarted). Please upload the file again." });
        store = entry.store;
      } else {
        store = await defaultStore;
      }
      const { answer, sources, usage } = await answerQuestion(store, question, 4);
      const inTok = usage?.prompt_tokens ?? 0;
      const outTok = usage?.completion_tokens ?? 0;
      return json(200, {
        answer,
        sources: [...new Set(sources.map((s) => s.source))],
        // Real token counts ARE the cost meter; the $ is illustrative at frontier
        // rates — this runs on Groq's free tier, i.e. $0.
        tokens: { input: inTok, output: outTok, total: inTok + outTok },
        costEstimateUSD: Number(estimateCostUSD(usage).toFixed(6)),
      });
    } catch (e) {
      console.error("[/api/ask]", e);
      return json(500, { error: "internal error" });
    }
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(PORT, () => console.log(`RAG chat UI → http://localhost:${PORT}`));
