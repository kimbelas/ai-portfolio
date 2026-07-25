/**
 * RUNG 2 — Structured output (typed, validated JSON).
 *
 * The model returns TEXT. Software needs DATA. Two moves:
 *   1. Constrain the model to emit JSON  (response_format).
 *   2. Validate that JSON against a schema (zod) at the boundary.
 * Never trust model output blindly — validating is the senior habit.
 *
 * Run with:  npm run learn:02
 */

import "dotenv/config";
import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// The shape we WANT — one source of truth, defined in code. zod gives us both
// a runtime validator AND a static TypeScript type (via z.infer) from one line.
const DocMetadata = z.object({
  title: z.string(),
  summary: z.string(),
  topics: z.array(z.string()),
  mentions_pricing: z.boolean(),
});
type DocMetadata = z.infer<typeof DocMetadata>;

// A stand-in for a document we'd later chunk and index.
const DOCUMENT = `
Acme Cloud Backup — Overview
Acme Cloud Backup encrypts and stores your files off-site every hour.
The Free plan includes 5 GB. The Pro plan is $9/month for 1 TB and adds
file versioning and priority support. All plans use AES-256 encryption and
run on Windows, macOS, and Linux.
`;

async function main() {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    // json_object mode constrains the model to emit *syntactically valid* JSON.
    // (It does NOT guarantee the SHAPE matches our schema — that's zod's job.)
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract metadata from documents. Respond with ONLY a JSON object " +
          'of the form: { "title": string, "summary": string (<= 30 words), ' +
          '"topics": string[], "mentions_pricing": boolean }.',
      },
      { role: "user", content: DOCUMENT },
    ],
  });

  const raw = response.choices[0].message.content ?? "";

  // Two DISTINCT failure modes, handled separately:
  //  (a) not valid JSON at all       -> JSON.parse throws (json_object mode makes this rare)
  //  (b) valid JSON, but wrong shape  -> zod .safeParse catches it
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error("Model did not return valid JSON:\n", raw);
    process.exit(1);
  }

  const parsed = DocMetadata.safeParse(json);
  if (!parsed.success) {
    // In production this is where you'd retry, repair, or fall back — not crash.
    console.error("JSON did not match schema:", parsed.error.issues);
    process.exit(1);
  }

  const meta: DocMetadata = parsed.data; // fully typed from here on
  console.log("Validated, typed metadata:");
  console.log(meta);
  console.log("\ntopics is a real array:", Array.isArray(meta.topics), "->", meta.topics);
  console.log("mentions_pricing is a real boolean:", meta.mentions_pricing);
}

main().catch((err) => {
  console.error("Request failed:", err);
  process.exit(1);
});
