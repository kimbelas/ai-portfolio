/**
 * MCP server (stdio) exposing dev tools over the codebase in sample-repo/.
 * Spawned as a child process by the client — it speaks JSON-RPC over stdin/stdout.
 *
 * CRITICAL: never write to stdout (console.log) — stdout is the JSON-RPC channel.
 * All logging goes to stderr via console.error.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listFiles, readRepoFile, searchText } from "./lib/dev-tools";

const server = new McpServer({ name: "taskflow-dev-tools", version: "1.0.0" });

server.registerTool(
  "list_files",
  { title: "List files", description: "List every file in the codebase (repo-relative paths)." },
  async () => ({ content: [{ type: "text", text: listFiles().join("\n") }] }),
);

server.registerTool(
  "read_file",
  {
    title: "Read file",
    description: "Read the full contents of a file by its repo-relative path.",
    inputSchema: { path: z.string().describe("Repo-relative path, e.g. src/auth.ts") },
  },
  async ({ path }) => {
    try {
      return { content: [{ type: "text", text: readRepoFile(path) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

server.registerTool(
  "search_code",
  {
    title: "Search code",
    description: "Case-insensitive substring search across the codebase; returns file:line matches.",
    inputSchema: { query: z.string().describe("Text to find, e.g. 'login' or 'TODO'") },
  },
  async ({ query }) => {
    const hits = searchText(query);
    const text = hits.length ? hits.map((h) => `${h.file}:${h.line}: ${h.text}`).join("\n") : "(no matches)";
    return { content: [{ type: "text", text }] };
  },
);

async function main() {
  await server.connect(new StdioServerTransport());
  console.error("[taskflow-dev-tools] MCP server running on stdio");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
