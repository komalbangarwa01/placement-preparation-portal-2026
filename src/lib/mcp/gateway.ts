import { ToolError } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function apiKey(): string {
  const key = (globalThis as RuntimeGlobals).process?.env?.["LOVABLE_API_KEY"]?.trim();
  if (!key) throw new ToolError("The generation service is not configured.");
  return key;
}

/** Calls the Lovable AI Gateway and returns parsed JSON content. */
export async function generateJson(system: string, user: string): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch {
    throw new ToolError("Could not reach the generation service.");
  }
  if (res.status === 429) throw new ToolError("Rate limit reached. Try again shortly.");
  if (res.status === 402) throw new ToolError("Credits exhausted. Add credits to continue.");
  if (!res.ok) throw new ToolError("The generation request failed.");

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  try {
    return JSON.parse(data.choices?.[0]?.message?.content ?? "") as Record<string, unknown>;
  } catch {
    throw new ToolError("The generation service returned malformed output.");
  }
}