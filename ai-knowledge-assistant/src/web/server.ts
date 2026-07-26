/**
 * A tiny web UI for the RAG assistant — zero extra dependencies (Node's
 * built-in http). Serves a single-page chat and a POST /api/ask endpoint that
 * runs the reranked, grounded, cited pipeline.
 *
 * Run with:  npm run web   (needs GROQ_API_KEY) -> http://localhost:8787
 */

import "dotenv/config";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildKnowledgeBase } from "../lib/kb";
import { answerQuestion } from "../lib/rag";

const HERE = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(resolve(HERE, "../../web/index.html"), "utf8");
const PORT = Number(process.env.PORT) || 8787;

// Build the knowledge base once at startup; reuse across requests.
const storePromise = buildKnowledgeBase();

const server = createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }

  if (req.method === "POST" && req.url === "/api/ask") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const { question } = JSON.parse(body || "{}");
        if (!question || typeof question !== "string") {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "question required" }));
          return;
        }
        const store = await storePromise;
        const { answer, sources } = await answerQuestion(store, question, 4);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ answer, sources: [...new Set(sources.map((s) => s.source))] }));
      } catch (e) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: (e as Error).message }));
      }
    });
    return;
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(PORT, () => {
  console.log(`RAG chat UI → http://localhost:${PORT}`);
});
