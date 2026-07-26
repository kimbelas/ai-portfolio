# ADR 0001 — MCP over stdio, and open-model tool-call reliability

**Status:** Accepted

## Context

Flagship 3 exposes codebase tools (list/read/search) to an LLM. We could hard-wire
function calling into one app, but the portfolio goal is to demonstrate **MCP** —
the emerging standard for connecting LLMs to tools/data — so the tools are
reusable by *any* MCP client and the host can consume *any* MCP server.

## Decision

- An **MCP server** (`@modelcontextprotocol/sdk`, stdio transport) exposes
  `list_files` / `read_file` / `search_code` over the sample repo. Tool logic is
  sandboxed to the repo dir (`lib/dev-tools.ts`, path-traversal guarded).
- An **MCP client/host** spawns the server as a child process (pinned `cwd` so its
  `tsx` resolves), discovers tools via `listTools()`, converts each MCP JSON-Schema
  `inputSchema` into an OpenAI/Groq function tool, runs the agent loop, and maps
  `tool_call → client.callTool`.
- Model: **`openai/gpt-oss-120b`** on Groq, with a **retry on `tool_use_failed`**.

## Consequences

- ✅ Interoperable: the server works with Claude Desktop / any MCP host; the host
  can attach any MCP server. Clean server/host separation.
- ✅ Grounded answers with `file:line` citations.
- ⚠️ **stdio rule:** the server must log to **stderr only** — stdout carries the
  JSON-RPC stream and any stray byte corrupts it.
- ⚠️ **Tool-JSON reliability:** open models on Groq intermittently emit malformed
  tool-call arguments (`400 tool_use_failed`). It's stochastic, so the host
  re-rolls the completion up to 4×. `gpt-oss-120b` is more reliable per-attempt
  than `20b` here. (`.js` import suffixes are mandatory with this SDK.)

## Alternatives considered

- **Bespoke function calling** (no MCP): simpler, but not interoperable — throws
  away the whole point of the flagship.
- **HTTP/SSE transport** instead of stdio: better for remote/multi-client servers;
  stdio is simpler for a local dev-tools server and is the common case.
