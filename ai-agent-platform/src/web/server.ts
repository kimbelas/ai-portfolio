/**
 * HTTP server for the agent (Flagship 2) — deploys the LangGraph agent as a
 * service, with **human-in-the-loop approval over HTTP**.
 *
 * Routes:
 *   GET  /                 → a minimal agent UI
 *   GET  /health           → { ok: true }
 *   POST /api/agent        → { message, threadId? } → runs the agent. If it wants
 *                            a risky tool (send_email) it PAUSES and returns
 *                            { status: "needs_approval", threadId, request }.
 *   POST /api/agent/resume → { threadId, approved } → resume the paused run.
 *
 * HITL state uses the graph's in-process MemorySaver keyed by thread_id, so the
 * approve→resume round-trip works within a live instance. A DURABLE saver
 * (SQLite/Postgres) so a paused run survives a restart is the production upgrade
 * — deferred here to keep the free-tier deploy free of native deps (see README).
 *
 * Run:  npm run web   (needs GROQ_API_KEY) → http://localhost:8788
 */

import "dotenv/config";
import { createServer, type IncomingMessage } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Command } from "@langchain/langgraph";
import { createAgent } from "../lib/graph";
import { estimateCostUSD } from "../lib/llm";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "../../web");
const INDEX = readFileSync(resolve(WEB, "index.html"), "utf8");
const PORT = Number(process.env.PORT) || 8788;

// One shared agent; its MemorySaver persists thread state across requests so the
// HITL approve→resume round-trip resumes the same run.
const agent = createAgent();

process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e));

function readBody(req: IncomingMessage, limit = 256 * 1024): Promise<string> {
  return new Promise((res, rej) => {
    let b = "", n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > limit) { rej(new Error("payload too large")); req.destroy(); } else b += c;
    });
    req.on("end", () => res(b));
    req.on("error", rej);
  });
}

const finalText = (msgs: any[]) => {
  const c = msgs.at(-1)?.content;
  return typeof c === "string" ? c : JSON.stringify(c ?? "");
};
const toolCallsOf = (msgs: any[]) =>
  msgs.flatMap((m) => (m.tool_calls ?? []).map((t: any) => ({ name: t.name, args: t.args })));
function tokensOf(msgs: any[]) {
  let input = 0, output = 0;
  for (const m of msgs) {
    const u = m.usage_metadata;
    if (u) { input += u.input_tokens ?? 0; output += u.output_tokens ?? 0; }
  }
  return { input, output, total: input + output };
}

function respond(json: (c: number, o: unknown) => void, out: any, threadId: string) {
  const interrupts = out?.__interrupt__;
  if (interrupts?.length) {
    const v = interrupts[0]?.value ?? interrupts[0];
    return json(200, { status: "needs_approval", threadId, request: { tool: v?.tool, args: v?.args } });
  }
  const msgs = out?.messages ?? [];
  const tokens = tokensOf(msgs);
  return json(200, {
    status: "done",
    threadId,
    answer: finalText(msgs),
    toolCalls: toolCallsOf(msgs),
    tokens,
    costEstimateUSD: Number(estimateCostUSD({ prompt_tokens: tokens.input, completion_tokens: tokens.output }).toFixed(6)),
  });
}

const server = createServer(async (req, res) => {
  const json = (code: number, obj: unknown) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(INDEX);
    }
    if (req.method === "GET" && req.url === "/health") return json(200, { ok: true });

    if (req.method === "POST" && req.url === "/api/agent") {
      const { message, threadId } = JSON.parse(await readBody(req));
      if (!message || typeof message !== "string") return json(400, { error: "message required" });
      const tid = threadId || randomUUID();
      const out = await agent.invoke(
        { messages: [{ role: "user", content: message }] },
        { configurable: { thread_id: tid }, recursionLimit: 12 },
      );
      return respond(json, out, tid);
    }

    if (req.method === "POST" && req.url === "/api/agent/resume") {
      const { threadId, approved } = JSON.parse(await readBody(req));
      if (!threadId) return json(400, { error: "threadId required" });
      const out = await agent.invoke(
        new Command({ resume: { approved: approved === true } }),
        { configurable: { thread_id: threadId }, recursionLimit: 12 },
      );
      return respond(json, out, threadId);
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  } catch (e) {
    console.error("[server]", e);
    json(500, { error: "internal error" });
  }
});

server.listen(PORT, () => console.log(`Agent server → http://localhost:${PORT}`));
