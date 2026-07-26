/**
 * RUNG M3 — An LLM driving MCP tools.
 *
 * The MCP tools are discovered from the server, converted to Groq function
 * tools, and handed to the model. The model plans, calls the MCP tools (run by
 * the client), and answers — the full loop across the protocol boundary.
 *
 * Run with:  npm run learn:02   (needs GROQ_API_KEY)
 */

import { connect } from "../lib/mcp";
import { askCodebase } from "../lib/agent";

async function main() {
  const client = await connect();
  const q = "Where is authentication handled, and what security concern is noted in that file?";
  console.log("Q:", q, "\n(tool calls:)");
  const answer = await askCodebase(client, q, { verbose: true });
  console.log("\nA:", answer);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
