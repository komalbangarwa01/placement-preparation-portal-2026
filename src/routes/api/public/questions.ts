import { createFileRoute } from "@tanstack/react-router";

const LEVELS = ["Easy", "Medium", "Hard"] as const;
const CATEGORIES = [
  "Logical Reasoning",
  "Verbal Reasoning",
  "Quantitative Aptitude",
  "Data Interpretation",
  "Puzzles & Seating Arrangement",
  "Coding-Decoding",
  "Blood Relations",
  "Series & Patterns",
];

type Question = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

function isValid(q: unknown): q is Question {
  const v = q as Question;
  return (
    !!v &&
    typeof v.question === "string" &&
    Array.isArray(v.options) &&
    v.options.length === 4 &&
    v.options.every((o) => typeof o === "string") &&
    typeof v.answerIndex === "number" &&
    v.answerIndex >= 0 &&
    v.answerIndex <= 3 &&
    typeof v.explanation === "string"
  );
}

export const Route = createFileRoute("/api/public/questions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "AI is not configured." }, { status: 500 });
        }

        let body: { category?: string; difficulty?: string; count?: number } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const category = CATEGORIES.includes(String(body.category))
          ? String(body.category)
          : CATEGORIES[0];
        const difficulty = (LEVELS as readonly string[]).includes(String(body.difficulty))
          ? String(body.difficulty)
          : "Easy";
        const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);

        const seed = Math.random().toString(36).slice(2, 10);
        const prompt =
          `Create ${count} brand-new ${difficulty} difficulty multiple-choice ${category} questions ` +
          `for a campus placement aptitude test. Uniqueness seed: ${seed} — do not reuse common textbook wording; ` +
          `vary names, numbers and scenarios every time.\n` +
          `Difficulty guide: Easy = single-step, Medium = two-step reasoning, Hard = multi-step or tricky traps.\n` +
          `Each question must have exactly 4 distinct options, exactly one correct answer, and a detailed ` +
          `step-by-step explanation (2-4 sentences) of why the answer is correct.\n` +
          `Return strict JSON only, shaped as: ` +
          `{"questions":[{"question":string,"options":[string,string,string,string],"answerIndex":number,"explanation":string}]}`;

        let res: Response;
        try {
          res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "openai/gpt-5.5",
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    "You are an expert placement-exam question setter. You always answer with valid JSON only.",
                },
                { role: "user", content: prompt },
              ],
            }),
          });
        } catch {
          return Response.json({ error: "Could not reach the AI service." }, { status: 502 });
        }

        if (res.status === 429) {
          return Response.json(
            { error: "AI rate limit reached. Please try again in a moment." },
            { status: 429 },
          );
        }
        if (res.status === 402) {
          return Response.json(
            { error: "AI credits exhausted. Add credits to keep generating questions." },
            { status: 402 },
          );
        }
        if (!res.ok) {
          const detail = await res.text();
          return Response.json(
            { error: "AI request failed.", detail: detail.slice(0, 500) },
            { status: 502 },
          );
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content ?? "";

        let parsed: { questions?: unknown };
        try {
          parsed = JSON.parse(content);
        } catch {
          return Response.json({ error: "AI returned malformed output." }, { status: 502 });
        }

        const questions = Array.isArray(parsed.questions)
          ? parsed.questions.filter(isValid).slice(0, count)
          : [];

        if (!questions.length) {
          return Response.json({ error: "AI returned no usable questions." }, { status: 502 });
        }

        return Response.json({ category, difficulty, questions });
      },
    },
  },
});