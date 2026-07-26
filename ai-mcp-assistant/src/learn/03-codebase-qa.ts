/**
 * RUNG M4 — The product: codebase Q&A over MCP.
 *
 * Several real dev questions answered by the agent using the MCP dev tools,
 * with file:line citations. This is what an MCP-native dev assistant does.
 *
 * Run with:  npm run learn:03   (needs GROQ_API_KEY)
 */

import { connect } from "../lib/mcp";
import { askCodebase } from "../lib/agent";

async function main() {
  const client = await connect();
  const questions = [
    "How are tasks created and completed? Point to the file.",
    "Find all TODO and FIXME comments and summarize what they say.",
    "Does the app persist data, or is it in-memory only?",
  ];
  for (const q of questions) {
    console.log(`\n=== Q: ${q} ===`);
    console.log(await askCodebase(client, q));
  }
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
