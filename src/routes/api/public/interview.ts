import { createFileRoute } from "@tanstack/react-router";

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Software Engineer",
  "Data Analyst",
  "UI/UX Designer",
  "QA Engineer",
];
const TYPES = ["HR", "Technical", "Behavioral", "Situational", "Mixed"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Placement Ready"];
const COMPANIES = ["General", "TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "Capgemini", "Deloitte"];

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
function list(v: unknown, max = 8): string[] {
  return Array.isArray(v)
    ? v
        .filter((x) => typeof x === "string" && (x as string).trim())
        .map((x) => (x as string).trim())
        .slice(0, max)
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

const COMPANY_PATTERNS: Record<string, string> = {
  TCS: "TCS NQT / Ninja-Digital style: strong fundamentals, coding basics, DBMS/OS/CN theory, project explanation, willingness to relocate and service-agreement questions.",
  Infosys: "Infosys HackWithInfy / SP-DSE style: problem solving with clean logic, OOP and DBMS depth, communication assessment, scenario questions on learning agility.",
  Wipro: "Wipro Elite NTH style: aptitude-driven reasoning, basic coding, written communication, situational questions about teamwork and deadlines.",
  Accenture: "Accenture style: cloud/automation awareness, agile delivery scenarios, client-communication situational questions, technical breadth over depth.",
  Cognizant: "Cognizant GenC style: project depth, SQL and data handling, behavioral questions on ownership and adaptability.",
  Capgemini: "Capgemini style: pseudo-code logic, game-based aptitude follow-ups, English communication, questions on innovation mindset.",
  Deloitte: "Deloitte style: consulting-flavoured case and situational questions, client-first thinking, structured STAR answers, technical depth with business impact.",
};

async function callGateway(apiKey: string, system: string, user: string) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
}

type Turn = { question?: unknown; answer?: unknown; overall?: unknown };

export const Route = createFileRoute("/api/public/interview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Interview service is not configured." }, { status: 500 });
        }

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const action = pick(body.action, ["question", "evaluate", "report"]);
        const role = pick(body.role, ROLES);
        const type = pick(body.type, TYPES);
        const level = pick(body.level, LEVELS);
        const company = pick(body.company, COMPANIES);
        const companyNote =
          company !== "General"
            ? `Match the interview pattern of ${company}. ${COMPANY_PATTERNS[company] ?? ""}`
            : "This is a generic campus placement panel.";

        const panel =
          `You are conducting a realistic ${type} interview for a ${role} position at ${level} candidate level. ` +
          companyNote;

        let system = "You are a senior technical recruiter. Reply with valid JSON only.";
        let user = "";

        if (action === "question") {
          const history = Array.isArray(body.history) ? (body.history as Turn[]).slice(-8) : [];
          const index = num(body.index, 0);
          const total = Math.max(3, Math.min(20, num(body.total, 8)));
          const transcript = history
            .map(
              (t, i) =>
                `Q${i + 1}: ${str(t.question).slice(0, 400)}\nCandidate: ${str(t.answer, "(no answer)").slice(0, 700)}` +
                (typeof t.overall === "number" ? `\nScored: ${t.overall}/100` : ""),
            )
            .join("\n\n");
          user =
            `${panel}\nThis is question ${index + 1} of ${total}.\n` +
            (transcript ? `Conversation so far:\n${transcript}\n\n` : "This is the opening question.\n") +
            `Ask ONE next question exactly as the interviewer would speak it. Adapt to the candidate's previous answers: ` +
            `probe deeper with a follow-up when an answer was vague, shallow or scored below 60; move to a new area ` +
            `when an answer was strong. Never repeat a question already asked. Keep it conversational and realistic, ` +
            `not a quiz item. Return JSON: {"question":string,"focus":string,"isFollowUp":boolean,"hint":string}`;
        } else if (action === "evaluate") {
          const question = str(body.question).slice(0, 1200);
          const answer = str(body.answer).slice(0, 4000);
          if (!question) return Response.json({ error: "Missing question." }, { status: 400 });
          user =
            `${panel}\nQuestion asked: """${question}"""\nCandidate answer: """${answer || "(no answer given)"}"""\n\n` +
            `Evaluate like a real interviewer filling an assessment sheet. Be strict and specific: reference what the ` +
            `candidate actually said. Score 0-100 for each dimension. Return JSON: ` +
            `{"technical":number,"problemSolving":number,"communication":number,"confidence":number,"clarity":number,` +
            `"overall":number,"feedback":string,"improvements":[string],"idealAnswer":string}`;
        } else {
          const transcript = Array.isArray(body.transcript) ? (body.transcript as Turn[]).slice(0, 20) : [];
          const text = transcript
            .map(
              (t, i) =>
                `Q${i + 1}: ${str(t.question).slice(0, 400)}\nAnswer: ${str(t.answer, "(no answer)").slice(0, 800)}` +
                (typeof t.overall === "number" ? `\nTurn score: ${t.overall}` : ""),
            )
            .join("\n\n");
          user =
            `${panel}\nFull interview transcript:\n${text}\n\n` +
            `Write the recruiter's post-interview evaluation. Be evidence-based and reference the candidate's own words ` +
            `where relevant. Return JSON: {"overall":number,"technical":number,"communication":number,"confidence":number,` +
            `"recommendation":"Not Ready"|"Needs Improvement"|"Interview Ready"|"Strong Candidate","summary":string,` +
            `"strengths":[string],"improvements":[string],"reviseTopics":[string],"skillsToImprove":[string],` +
            `"strategy":[string],"resources":[string]}`;
          system = "You are a senior hiring manager writing an internal candidate evaluation. Reply with valid JSON only.";
        }

        let res: Response;
        try {
          res = await callGateway(apiKey, system, user);
        } catch {
          return Response.json({ error: "Could not reach the interview service." }, { status: 502 });
        }
        if (res.status === 429) {
          return Response.json({ error: "Interview limit reached. Try again shortly." }, { status: 429 });
        }
        if (res.status === 402) {
          return Response.json({ error: "Credits exhausted. Add credits to continue." }, { status: 402 });
        }
        if (!res.ok) {
          return Response.json({ error: "Interview request failed." }, { status: 502 });
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "");
        } catch {
          return Response.json({ error: "Interview service returned malformed output." }, { status: 502 });
        }

        if (action === "question") {
          const question = str(parsed.question);
          if (!question) return Response.json({ error: "No question returned." }, { status: 502 });
          return Response.json({
            question,
            focus: str(parsed.focus, type),
            isFollowUp: parsed.isFollowUp === true,
            hint: str(parsed.hint),
          });
        }

        if (action === "evaluate") {
          const dims = {
            technical: num(parsed.technical, 50),
            problemSolving: num(parsed.problemSolving, 50),
            communication: num(parsed.communication, 50),
            confidence: num(parsed.confidence, 50),
            clarity: num(parsed.clarity, 50),
          };
          const avg = Math.round(
            (dims.technical + dims.problemSolving + dims.communication + dims.confidence + dims.clarity) / 5,
          );
          return Response.json({
            ...dims,
            overall: num(parsed.overall, avg),
            feedback: str(parsed.feedback, "No feedback returned."),
            improvements: list(parsed.improvements, 5),
            idealAnswer: str(parsed.idealAnswer),
          });
        }

        const rec = pick(parsed.recommendation, [
          "Needs Improvement",
          "Not Ready",
          "Interview Ready",
          "Strong Candidate",
        ]);
        return Response.json({
          overall: num(parsed.overall, 50),
          technical: num(parsed.technical, 50),
          communication: num(parsed.communication, 50),
          confidence: num(parsed.confidence, 50),
          recommendation: rec,
          summary: str(parsed.summary, "No summary returned."),
          strengths: list(parsed.strengths, 8),
          improvements: list(parsed.improvements, 8),
          reviseTopics: list(parsed.reviseTopics, 8),
          skillsToImprove: list(parsed.skillsToImprove, 8),
          strategy: list(parsed.strategy, 8),
          resources: list(parsed.resources, 8),
        });
      },
    },
  },
});
