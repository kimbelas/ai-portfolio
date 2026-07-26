# AI MCP Assistant

**Flagship 3 of a senior AI engineer portfolio.** A dev assistant built on the **Model Context Protocol (MCP)** — an MCP **server** that exposes codebase tools over stdio (JSON-RPC), and an MCP **client/host** that discovers those tools and lets an LLM (Groq) use them to answer questions about a codebase, with `file:line` citations.

> Built from first principles: understand the protocol (server ↔ client over stdio), then bridge MCP tools into an LLM tool-calling loop.

## The ladder

| Rung | Concept | Script |
|------|---------|--------|
| M1 | MCP server + client over stdio — discover & call tools (no LLM) | `src/server.ts` + `src/learn/01-client-basics.ts` |
| M2 | LLM over MCP — Groq drives the server's tools | `src/learn/02-llm-over-mcp.ts` |
| M3 | Codebase Q&A — cited answers over a sample repo | `src/learn/03-codebase-qa.ts` |
| — | Usable CLI | `src/cli/ask.ts` (`npm run ask -- "…"`) |

## Architecture

```
  your question
       │
       ▼
  client/host (src/lib/agent.ts)  ──spawns──►  MCP server (src/server.ts, stdio)
       │  Groq function-calling loop                │  tools over the codebase:
       │  MCP tool schemas → OpenAI tools           │   • list_files
       │  tool_call → client.callTool               │   • read_file   (sandboxed)
       ▼                                            │   • search_code
  grounded answer w/ file:line citations   ◄────────┘   (src/lib/dev-tools.ts → sample-repo/)
```

The server exposes tools any MCP client could use; the host can drive any MCP server. That interoperability is the point of MCP.

## Stack

TypeScript · `@modelcontextprotocol/sdk` 1.29 (stdio transport) · Groq `openai/gpt-oss-120b` (OpenAI-compatible tool calling) · zod-validated tools. **Tool-reliability note:** open models on Groq occasionally emit malformed tool-call JSON (`tool_use_failed`); the host retries (see `docs/adr/0001-*`).

## Run

```bash
npm install
cp .env.example .env   # add GROQ_API_KEY (free: https://console.groq.com/keys)
npm run learn:01       # MCP protocol: discover + call tools (no key needed)
npm run learn:02       # LLM drives the MCP tools
npm run learn:03       # codebase Q&A with citations
npm run ask -- "Where are API keys validated, and what's the risk?"
```
