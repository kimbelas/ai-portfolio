/**
 * RUNG M1+M2 — The MCP server + a client that discovers and calls its tools.
 *
 * The client spawns the server as a child process and speaks JSON-RPC over
 * stdio. We list the server's tools (discovery) and call two of them directly
 * (no LLM yet) to see the raw protocol working.
 *
 * Run with:  npm run learn:01   (no API key needed — pure MCP)
 */

import { connect, textOf } from "../lib/mcp";

async function main() {
  const client = await connect();

  const { tools } = await client.listTools();
  console.log("Discovered MCP tools:");
  for (const t of tools) console.log(`  - ${t.name}: ${t.description}`);

  console.log("\ncallTool list_files →");
  console.log(textOf(await client.callTool({ name: "list_files", arguments: {} })));

  console.log("\ncallTool search_code({ query: 'login' }) →");
  console.log(textOf(await client.callTool({ name: "search_code", arguments: { query: "login" } })));

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
