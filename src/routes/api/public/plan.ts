import { createFileRoute } from "@tanstack/react-router";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
function list(v: unknown, max = 10): string[] {
  return Array.isArray(v)
    ? v.filter((x) => typeof x === "string" && (x as string).trim()).map((x) => (x as string).trim()).slice(0, max)
    : [];
}
function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function pick(v: unknown, allowed: string[]): string {
  const s = String(v ?? "");
  return allowed.includes(s) ? s : allowed[0];
}

type RawTask = Record<string, unknown>;

const PRIORITIES = ["High", "Medium", "Low"];
const TASK_TYPES = ["Practice", "Revision", "Mock Test", "Concept", "Interview", "Resume"];

export const Route = createFileRoute("/api/public/plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Planner service is not configured." }, { status: 500 });
        }

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const signals = JSON.stringify(body.signals ?? {}).slice(0, 9000);
        const goals = JSON.stringify(body.goals ?? {}).slice(0, 2000);
        const hours = Math.max(1, Math.min(14, Number(body.hours) || 3));

        const system =
          "You are a placement training head at an engineering college who designs individualised preparation " +
          "programmes. You reply with valid JSON only.";
        const user =
          `Candidate performance signals (computed from their own practice data):\n${signals}\n\n` +
          `Candidate goals: ${goals}\nAvailable study time: ${hours} hours per day.\n\n` +
          `Design a realistic, individualised placement preparation programme. Use the actual weak topics, ` +
          `accuracy figures and score gaps in the signals — never give generic advice. Total minutes across ` +
          `dailyTasks must fit within ${hours * 60} minutes. Sequence work so weak areas get the most minutes, ` +
          `strong areas get short maintenance revision, and a mock test lands on the right cadence for the ` +
          `candidate's readiness level.\n` +
          `Return strict JSON shaped as: {` +
          `"headline":string,"rationale":string,` +
          `"dailyTasks":[{"title":string,"type":"Practice"|"Revision"|"Mock Test"|"Concept"|"Interview"|"Resume",` +
          `"topic":string,"minutes":number,"priority":"High"|"Medium"|"Low","target":string,"why":string}],` +
          `"weekly":{"theme":string,"goals":[string],"milestones":[{"topic":string,"milestone":string,"benchmark":string}],` +
          `"skillTargets":[string]},` +
          `"monthly":{"objective":string,"phases":[{"week":string,"focus":string,"outcome":string}],` +
          `"milestones":[string],"interviewTimeline":[string]},` +
          `"gaps":{"weakAreas":[string],"missingSkills":[string],"knowledgeGaps":[string],` +
          `"highPriority":[string],"mediumPriority":[string],"revision":[string]},` +
          `"recommendations":{"nextTopics":[string],"mockTests":[string],"reasoningCategories":[string],"aptitudeChapters":[string]},` +
          `"adaptation":[string],"insights":[string]}`;

        let res: Response;
        try {
          res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
          return Response.json({ error: "Could not reach the planner service." }, { status: 502 });
        }
        if (res.status === 429) {
          return Response.json({ error: "Plan generation limit reached. Try again shortly." }, { status: 429 });
        }
        if (res.status === 402) {
          return Response.json({ error: "Credits exhausted. Add credits to continue." }, { status: 402 });
        }
        if (!res.ok) {
          return Response.json({ error: "Plan generation failed." }, { status: 502 });
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "");
        } catch {
          return Response.json({ error: "Planner returned malformed output." }, { status: 502 });
        }

        const rawTasks = Array.isArray(parsed.dailyTasks) ? (parsed.dailyTasks as RawTask[]) : [];
        const dailyTasks = rawTasks
          .map((t) => ({
            title: str(t.title),
            type: pick(t.type, TASK_TYPES),
            topic: str(t.topic, "General"),
            minutes: Math.max(10, Math.min(240, Math.round(Number(t.minutes) || 30))),
            priority: pick(t.priority, PRIORITIES),
            target: str(t.target),
            why: str(t.why),
          }))
          .filter((t) => t.title)
          .slice(0, 10);

        const weeklyRaw = (parsed.weekly ?? {}) as Record<string, unknown>;
        const monthlyRaw = (parsed.monthly ?? {}) as Record<string, unknown>;
        const gapsRaw = (parsed.gaps ?? {}) as Record<string, unknown>;
        const recRaw = (parsed.recommendations ?? {}) as Record<string, unknown>;

        const milestones = (Array.isArray(weeklyRaw.milestones) ? (weeklyRaw.milestones as RawTask[]) : [])
          .map((m) => ({
            topic: str(m.topic, "Topic"),
            milestone: str(m.milestone),
            benchmark: str(m.benchmark),
          }))
          .filter((m) => m.milestone)
          .slice(0, 8);

        const phases = (Array.isArray(monthlyRaw.phases) ? (monthlyRaw.phases as RawTask[]) : [])
          .map((p) => ({ week: str(p.week, "Week"), focus: str(p.focus), outcome: str(p.outcome) }))
          .filter((p) => p.focus)
          .slice(0, 6);

        return Response.json({
          headline: str(parsed.headline, "Personalised preparation plan"),
          rationale: str(parsed.rationale),
          dailyTasks,
          weekly: {
            theme: str(weeklyRaw.theme, "Weekly focus"),
            goals: list(weeklyRaw.goals, 8),
            milestones,
            skillTargets: list(weeklyRaw.skillTargets, 8),
          },
          monthly: {
            objective: str(monthlyRaw.objective),
            phases,
            milestones: list(monthlyRaw.milestones, 8),
            interviewTimeline: list(monthlyRaw.interviewTimeline, 8),
          },
          gaps: {
            weakAreas: list(gapsRaw.weakAreas, 8),
            missingSkills: list(gapsRaw.missingSkills, 10),
            knowledgeGaps: list(gapsRaw.knowledgeGaps, 8),
            highPriority: list(gapsRaw.highPriority, 8),
            mediumPriority: list(gapsRaw.mediumPriority, 8),
            revision: list(gapsRaw.revision, 8),
          },
          recommendations: {
            nextTopics: list(recRaw.nextTopics, 8),
            mockTests: list(recRaw.mockTests, 6),
            reasoningCategories: list(recRaw.reasoningCategories, 8),
            aptitudeChapters: list(recRaw.aptitudeChapters, 8),
          },
          adaptation: list(parsed.adaptation, 8),
          insights: list(parsed.insights, 8),
          confidence: num(parsed.confidence, 75),
        });
      },
    },
  },
});
