import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generateJson } from "../gateway";

const CATEGORIES = [
  "Logical Reasoning",
  "Verbal Reasoning",
  "Quantitative Aptitude",
  "Data Interpretation",
  "Puzzles & Seating Arrangement",
  "Coding-Decoding",
  "Blood Relations",
  "Series & Patterns",
] as const;

export default defineTool({
  name: "generate_aptitude_questions",
  title: "Generate aptitude questions",
  description:
    "Generate fresh multiple-choice campus placement aptitude or reasoning questions with answers and step-by-step explanations.",
  inputSchema: {
    category: z.enum(CATEGORIES).describe("Question category."),
    difficulty: z.enum(["Easy", "Medium", "Hard"]).describe("Difficulty level."),
    count: z.number().int().describe("How many questions to generate (1-10)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ category, difficulty, count }) => {
    const n = Math.max(1, Math.min(10, Math.round(count || 5)));
    const seed = Math.random().toString(36).slice(2, 10);
    const parsed = await generateJson(
      "You are an expert placement-exam question setter. You always answer with valid JSON only.",
      `Create ${n} brand-new ${difficulty} difficulty multiple-choice ${category} questions for a campus ` +
        `placement aptitude test. Uniqueness seed: ${seed} — vary names, numbers and scenarios every time. ` +
        `Each question needs exactly 4 distinct options, one correct answer and a 2-4 sentence explanation. ` +
        `Return strict JSON: {"questions":[{"question":string,"options":[string,string,string,string],` +
        `"answerIndex":number,"explanation":string}]}`,
    );

    const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
      .filter((q): q is { question: string; options: string[]; answerIndex: number; explanation: string } => {
        const v = q as { question?: unknown; options?: unknown; answerIndex?: unknown };
        return (
          typeof v?.question === "string" &&
          Array.isArray(v.options) &&
          v.options.length === 4 &&
          typeof v.answerIndex === "number"
        );
      })
      .slice(0, n);

    return {
      content: [{ type: "text", text: JSON.stringify({ category, difficulty, questions }, null, 2) }],
      structuredContent: { category, difficulty, questions },
    };
  },
});