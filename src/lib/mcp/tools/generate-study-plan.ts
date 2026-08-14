import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generateJson } from "../gateway";

export default defineTool({
  name: "generate_study_plan",
  title: "Generate a study plan",
  description:
    "Build an individualised daily, weekly and monthly placement preparation plan from a candidate's weak areas, scores and available study hours.",
  inputSchema: {
    weakAreas: z.array(z.string()).describe("Topics the candidate struggles with."),
    strongAreas: z.array(z.string()).optional().describe("Topics the candidate is already good at."),
    averageAccuracy: z.number().optional().describe("Overall practice accuracy percentage, 0-100."),
    hoursPerDay: z.number().describe("Study hours available per day (1-14)."),
    targetCompany: z.string().optional().describe("Target company or role, if any."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ weakAreas, strongAreas, averageAccuracy, hoursPerDay, targetCompany }) => {
    const hours = Math.max(1, Math.min(14, Math.round(hoursPerDay || 3)));
    const parsed = await generateJson(
      "You are a placement training head at an engineering college who designs individualised preparation programmes. You reply with valid JSON only.",
      `Candidate signals: ${JSON.stringify({ weakAreas, strongAreas, averageAccuracy, targetCompany }).slice(0, 6000)}\n` +
        `Available study time: ${hours} hours per day (${hours * 60} minutes total across dailyTasks).\n\n` +
        `Design a realistic programme that gives weak areas the most minutes and strong areas short maintenance ` +
        `revision, with mock tests at a sensible cadence. Never give generic advice. Return strict JSON: ` +
        `{"headline":string,"rationale":string,"dailyTasks":[{"title":string,"type":string,"topic":string,` +
        `"minutes":number,"priority":string,"why":string}],"weekly":{"theme":string,"goals":[string]},` +
        `"monthly":{"objective":string,"phases":[{"week":string,"focus":string,"outcome":string}]},` +
        `"recommendations":[string]}`,
    );

    return {
      content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }],
      structuredContent: { plan: parsed, hoursPerDay: hours },
    };
  },
});