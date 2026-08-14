import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

const TRACKS = {
  TCS: {
    cutoffs: { aptitude: 65, coding: 60, communication: 70 },
    focus: ["Quantitative Aptitude", "Verbal Ability", "Reasoning Ability", "Coding (C/Java basics)"],
    strategy: [
      "Week 1-2: NQT-style aptitude drills, 40 questions daily under timer.",
      "Week 3: Verbal ability and email writing practice.",
      "Week 4: Two full NQT mocks plus HR question rehearsal.",
    ],
    interview: ["Project deep-dive", "OOP and DBMS fundamentals", "Situational HR questions"],
  },
  Infosys: {
    cutoffs: { aptitude: 70, coding: 65, communication: 70 },
    focus: ["Logical Reasoning", "Puzzles", "Pseudocode", "DBMS & OS basics"],
    strategy: [
      "Week 1-2: Puzzles and mathematical reasoning sets.",
      "Week 3: Pseudocode and hands-on coding rounds.",
      "Week 4: Full-length InfyTQ style mocks.",
    ],
    interview: ["Data structures", "SQL queries", "Willingness to relocate / HR fit"],
  },
  Wipro: {
    cutoffs: { aptitude: 60, coding: 55, communication: 68 },
    focus: ["Aptitude", "Essay writing", "Basic coding", "Communication"],
    strategy: [
      "Week 1-2: Aptitude fundamentals and speed maths.",
      "Week 3: Written communication essays.",
      "Week 4: Coding practice on arrays and strings.",
    ],
    interview: ["Resume walk-through", "Basic programming", "Behavioural questions"],
  },
  Accenture: {
    cutoffs: { aptitude: 68, coding: 62, communication: 75 },
    focus: ["Cognitive ability", "Technical MCQs", "Coding", "Communication assessment"],
    strategy: [
      "Week 1-2: Cognitive and technical MCQ practice.",
      "Week 3: Coding rounds in one preferred language.",
      "Week 4: Communication assessment simulation.",
    ],
    interview: ["Cloud and technology awareness", "Project explanation", "HR fitment"],
  },
  Deloitte: {
    cutoffs: { aptitude: 72, coding: 68, communication: 78 },
    focus: ["Advanced aptitude", "Case-style reasoning", "Technical depth", "Business communication"],
    strategy: [
      "Week 1-2: Advanced aptitude and data interpretation.",
      "Week 3: Case-style problem solving and consulting scenarios.",
      "Week 4: Technical plus behavioural mock interviews.",
    ],
    interview: ["Case discussion", "Technology stack depth", "Client-facing scenarios"],
  },
} as const;

export default defineTool({
  name: "get_company_prep_track",
  title: "Get company preparation track",
  description:
    "Return the preparation track for a top recruiter: score cutoffs, focus areas, a four-week strategy and interview roadmap.",
  inputSchema: {
    company: z.enum(["TCS", "Infosys", "Wipro", "Accenture", "Deloitte"]).describe("Recruiting company."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ company }) => {
    const track = TRACKS[company];
    if (!track) throw new ToolError(`No preparation track available for ${company}.`);
    return {
      content: [{ type: "text", text: JSON.stringify({ company, ...track }, null, 2) }],
      structuredContent: { company, ...track },
    };
  },
});