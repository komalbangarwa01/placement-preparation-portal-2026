import { createFileRoute } from "@tanstack/react-router";

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Software Engineer",
  "UI/UX Designer",
];

type Review = {
  recruiterSummary: string;
  strengths: string[];
  redFlags: string[];
  sectionFeedback: Array<{ section: string; verdict: string; feedback: string; action: string }>;
  projectFeedback: Array<{
    project: string;
    complexity: string;
    industryValue: string;
    betterTitle: string;
    missingFeatures: string[];
    enhancements: string[];
  }>;
  skillSuggestions: string[];
  interviewFocus: string[];
  optimizationTips: string[];
  jobMatchNotes: string[];
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
function list(v: unknown, max = 8): string[] {
  return Array.isArray(v)
    ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim()).slice(0, max)
    : [];
}

export const Route = createFileRoute("/api/public/resume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Review service is not configured." }, { status: 500 });
        }

        let body: {
          text?: string;
          role?: string;
          jobDescription?: string;
          scores?: Record<string, number>;
          missing?: string[];
        } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const text = String(body.text ?? "").slice(0, 14000);
        if (text.length < 120) {
          return Response.json({ error: "Resume text is too short to review." }, { status: 400 });
        }
        const role = ROLES.includes(String(body.role)) ? String(body.role) : ROLES[0];
        const jd = String(body.jobDescription ?? "").slice(0, 4000);
        const scores = body.scores && typeof body.scores === "object" ? body.scores : {};
        const missing = list(body.missing, 30);

        const prompt =
          `You are a senior campus-placement recruiter reviewing a candidate resume for the role of ${role}.\n` +
          `Computed ATS metrics: ${JSON.stringify(scores)}.\n` +
          (missing.length ? `Gap analysis flagged these missing items: ${missing.join(", ")}.\n` : "") +
          (jd ? `Target job description:\n"""${jd}"""\n` : "") +
          `Resume text:\n"""${text}"""\n\n` +
          `Write specific, evidence-based recruiter feedback. Quote or reference actual content from the resume ` +
          `(real project names, tools, numbers). Never give generic advice such as "add more keywords" without ` +
          `naming the exact keyword, section and rewritten phrasing. Every action must be something the candidate ` +
          `can apply in under 10 minutes.\n` +
          `Return strict JSON only shaped as: {"recruiterSummary":string,` +
          `"strengths":[string],"redFlags":[string],` +
          `"sectionFeedback":[{"section":string,"verdict":"Strong"|"Adequate"|"Weak","feedback":string,"action":string}],` +
          `"projectFeedback":[{"project":string,"complexity":string,"industryValue":string,"betterTitle":string,` +
          `"missingFeatures":[string],"enhancements":[string]}],` +
          `"skillSuggestions":[string],"interviewFocus":[string],"optimizationTips":[string],"jobMatchNotes":[string]}`;

        let res: Response;
        try {
          res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: "openai/gpt-5.5",
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    "You are a senior technical recruiter and ATS specialist. You always answer with valid JSON only.",
                },
                { role: "user", content: prompt },
              ],
            }),
          });
        } catch {
          return Response.json({ error: "Could not reach the review service." }, { status: 502 });
        }

        if (res.status === 429) {
          return Response.json({ error: "Review limit reached. Try again shortly." }, { status: 429 });
        }
        if (res.status === 402) {
          return Response.json(
            { error: "Review credits exhausted. Add credits to continue." },
            { status: 402 },
          );
        }
        if (!res.ok) {
          return Response.json({ error: "Review request failed." }, { status: 502 });
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "");
        } catch {
          return Response.json({ error: "Review service returned malformed output." }, { status: 502 });
        }

        const sections = Array.isArray(parsed.sectionFeedback) ? parsed.sectionFeedback : [];
        const projects = Array.isArray(parsed.projectFeedback) ? parsed.projectFeedback : [];

        const review: Review = {
          recruiterSummary: str(parsed.recruiterSummary, "No summary returned."),
          strengths: list(parsed.strengths),
          redFlags: list(parsed.redFlags),
          sectionFeedback: sections
            .map((s) => {
              const v = s as Record<string, unknown>;
              return {
                section: str(v.section, "Section"),
                verdict: str(v.verdict, "Adequate"),
                feedback: str(v.feedback),
                action: str(v.action),
              };
            })
            .filter((s) => s.feedback)
            .slice(0, 12),
          projectFeedback: projects
            .map((p) => {
              const v = p as Record<string, unknown>;
              return {
                project: str(v.project, "Project"),
                complexity: str(v.complexity, "—"),
                industryValue: str(v.industryValue, "—"),
                betterTitle: str(v.betterTitle),
                missingFeatures: list(v.missingFeatures, 6),
                enhancements: list(v.enhancements, 6),
              };
            })
            .slice(0, 6),
          skillSuggestions: list(parsed.skillSuggestions, 10),
          interviewFocus: list(parsed.interviewFocus, 8),
          optimizationTips: list(parsed.optimizationTips, 10),
          jobMatchNotes: list(parsed.jobMatchNotes, 8),
        };

        return Response.json({ role, review });
      },
    },
  },
});
