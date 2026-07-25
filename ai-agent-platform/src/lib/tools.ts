import type OpenAI from "openai";

/**
 * The agent's tools. Each is (1) a real function we execute and (2) a schema
 * the model sees so it knows when/how to call it.
 */

// --- Tool implementations ---

export function calculator(expression: string): string {
  // GUARDRAIL: never eval raw model output. Whitelist arithmetic characters
  // only, THEN evaluate. This is a real injection-defense boundary.
  if (!/^[0-9+\-*/(). ]+$/.test(expression)) {
    return `Error: invalid expression "${expression}" (arithmetic only)`;
  }
  try {
    const result = Function(`"use strict"; return (${expression});`)();
    return String(result);
  } catch {
    return `Error: could not evaluate "${expression}"`;
  }
}

const PLAN_PRICES: Record<string, number> = { free: 0, pro: 9, business: 25 };
export function getPlanPrice(plan: string): string {
  const price = PLAN_PRICES[plan.toLowerCase()];
  return price === undefined
    ? `Error: unknown plan "${plan}" (valid: free, pro, business)`
    : `${price} USD per month`;
}

// --- Schemas the model sees ---

export const TOOL_SCHEMAS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calculator",
      description: "Evaluate a basic arithmetic expression, e.g. '9 * 24'.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "An arithmetic expression" },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_plan_price",
      description: "Get the monthly USD price of a subscription plan.",
      parameters: {
        type: "object",
        properties: {
          plan: { type: "string", description: "Plan name: free, pro, or business" },
        },
        required: ["plan"],
      },
    },
  },
];

// --- Dispatcher: tool name -> execution ---

export function runTool(name: string, args: any): string {
  switch (name) {
    case "calculator":
      return calculator(args.expression);
    case "get_plan_price":
      return getPlanPrice(args.plan);
    default:
      return `Error: unknown tool "${name}"`;
  }
}
