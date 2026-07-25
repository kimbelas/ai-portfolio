import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { calculator as calc, getPlanPrice as price } from "./tools";

// LangChain tool wrappers — the model sees the name/description/schema; the
// zod schema validates the model's arguments before our code runs.

export const calculatorTool = tool(async ({ expression }) => calc(expression), {
  name: "calculator",
  description: "Evaluate a basic arithmetic expression, e.g. '9 * 24'.",
  schema: z.object({ expression: z.string().describe("An arithmetic expression") }),
});

export const planPriceTool = tool(async ({ plan }) => price(plan), {
  name: "get_plan_price",
  description: "Get the monthly USD price of a subscription plan (free, pro, business).",
  schema: z.object({ plan: z.string().describe("Plan name: free, pro, or business") }),
});

// A "risky" tool — a real-world side effect. This is what human-in-the-loop
// approval gates. (Mocked; returns a confirmation string.)
export const sendEmailTool = tool(
  async ({ to, subject }) => `Email sent to ${to} with subject "${subject}".`,
  {
    name: "send_email",
    description: "Send an email to a recipient. Use when the user asks to email or notify someone.",
    schema: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body text"),
    }),
  },
);

export const TOOLS = [calculatorTool, planPriceTool, sendEmailTool];
export const TOOLS_BY_NAME: Record<string, (typeof TOOLS)[number]> = Object.fromEntries(
  TOOLS.map((t) => [t.name, t]),
);
export const RISKY_TOOLS: ReadonlySet<string> = new Set(["send_email"]);
export const ALLOWED_TOOLS: ReadonlySet<string> = new Set(TOOLS.map((t) => t.name));
