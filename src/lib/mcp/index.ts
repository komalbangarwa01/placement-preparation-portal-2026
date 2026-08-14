import { defineMcp } from "@lovable.dev/mcp-js";
import generateAptitudeQuestions from "./tools/generate-aptitude-questions";
import generateStudyPlan from "./tools/generate-study-plan";
import getCompanyTrack from "./tools/get-company-track";
import reviewResume from "./tools/review-resume";

export default defineMcp({
  name: "placement-pal",
  title: "Placement Pal",
  version: "0.1.0",
  instructions:
    "Tools for Placement Pal, a campus placement preparation portal. Generate aptitude and reasoning practice " +
    "questions, review a resume for a target role, build an individualised study plan, and look up company-specific " +
    "preparation tracks. Candidate progress itself lives in the browser and is not exposed here.",
  tools: [generateAptitudeQuestions, reviewResume, generateStudyPlan, getCompanyTrack],
});