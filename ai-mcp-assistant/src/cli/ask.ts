/**
 * A usable CLI: ask a question about the sample codebase, answered by the LLM
 * using the MCP dev tools.
 *
 *   npm run ask -- "Where are API keys validated?"
 */

import { connect } from "../lib/mcp";
import { askCodebase } from "../lib/agent";

async function main() {
  const q = process.argv.slice(2).join(" ").trim();
  if (!q) {
    console.error('Usage: npm run ask -- "your question about the codebase"');
    process.exit(1);
  }
  const client = await connect();
  console.log(await askCodebase(client, q, { verbose: true }));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
