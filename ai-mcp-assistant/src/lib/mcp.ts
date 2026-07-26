import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url)); // src/lib
const PROJECT = resolve(HERE, "../.."); // project root
const SERVER = resolve(HERE, "../server.ts"); // src/server.ts

/**
 * Spawn the MCP server as a child process and connect a client to it over
 * stdio. cwd is pinned to the project root so the child's `tsx` resolves from
 * this package's node_modules regardless of where we run from.
 */
export async function connect(): Promise<Client> {
  const transport = new StdioClientTransport({
    command: process.execPath, // the node binary
    args: ["--import", "tsx", SERVER], // run the TS server via tsx's loader
    cwd: PROJECT,
  });
  const client = new Client({ name: "mcp-host", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

/** Read all text out of an MCP tool result's content blocks. */
export function textOf(result: any): string {
  return (result?.content ?? [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
}
