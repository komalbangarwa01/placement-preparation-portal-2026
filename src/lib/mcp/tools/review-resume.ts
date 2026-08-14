import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generateJson } from "../gateway";

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Software Engineer",
  "UI/UX Designer",
] as const;

export default defineTool({
  name: "review_resume",
  title: "Review a resume",
  description:
    "Run a recruiter-grade review of resume text for a target campus placement role: strengths, red flags, section feedback and improvement actions.",
  inputSchema: {
    text: z.string().describe("Plain resume text to review."),
    role: z.enum(ROLES).describe("Target role for the review."),
    jobDescription: z.string().optional().describe("Optional target job description to match against."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ text, role, jobDescription }) => {
    const resume = String(text ?? "").slice(0, 14000);
    if (resume.trim().length < 120) throw new ToolError("Resume text is too short to review.");
    const jd = String(jobDescription ?? "").slice(0, 4000);

    const parsed = await generateJson(
      "You are a senior technical recruiter and ATS specialist. You always answer with valid JSON only.",
      `Review this candidate resume for the role of ${role}.\n` +
        (jd ? `Target job description:\n"""${jd}"""\n` : "") +
        `Resume text:\n"""${resume}"""\n\n` +
        `Give specific, evidence-based feedback that references real content from the resume. Every action must ` +
        `be applicable in under 10 minutes. Return strict JSON: {"atsScore":number,"recruiterSummary":string,` +
        `"strengths":[string],"redFlags":[string],"sectionFeedback":[{"section":string,"verdict":string,` +
        `"feedback":string,"action":string}],"skillSuggestions":[string],"interviewFocus":[string]}`,
    );

    return {
      content: [{ type: "text", text: JSON.stringify({ role, review: parsed }, null, 2) }],
      structuredContent: { role, review: parsed },
    };
  },
});