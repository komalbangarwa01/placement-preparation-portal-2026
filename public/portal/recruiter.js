/* PrepDeck — Recruiter Intelligence Engine
   HR Review Simulation · Technical Recruiter Feedback · Resume Ranking · Company Eligibility */
(function () {
  var COMPANIES = [
    {
      name: "TCS", tier: "Service", ats: 62, cgpa: "60% throughout (10th, 12th, UG), no active backlogs",
      process: "TCS NQT → Technical round → HR round",
      skills: ["SQL", "Java", "Python", "OOP", "Data Structures", "Git"],
      weights: { ats: .3, relevance: .2, fundamentals: .2, comms: .2, projects: .1 },
      prep: ["Clear TCS NQT sections: numerical ability, verbal, reasoning and programming logic.",
        "Revise DBMS, OS and networking theory — the technical round is theory heavy.",
        "Prepare a crisp explanation of one project plus 'why TCS' and relocation willingness."]
    },
    {
      name: "Infosys", tier: "Service", ats: 64, cgpa: "68%+ aggregate preferred, no standing arrears",
      process: "InfyTQ / HackWithInfy → Technical + HR round",
      skills: ["Java", "Python", "SQL", "Data Structures", "OOP", "REST API"],
      weights: { ats: .28, relevance: .22, fundamentals: .22, comms: .16, projects: .12 },
      prep: ["Practice InfyTQ style coding: arrays, strings and SQL queries under time pressure.",
        "Be able to code OOP concepts, not just define them.",
        "Show learning agility — certifications and self-taught stacks score well here."]
    },
    {
      name: "Wipro", tier: "Service", ats: 60, cgpa: "60%+ in 10th, 12th and UG",
      process: "Elite NTH aptitude → Written communication → Technical → HR",
      skills: ["Java", "Python", "SQL", "Data Structures", "Git", "Linux"],
      weights: { ats: .3, relevance: .18, fundamentals: .2, comms: .22, projects: .1 },
      prep: ["Aptitude and the written-English essay decide the first cut — practise both weekly.",
        "Keep one deployable project you can demo end to end.",
        "Prepare STAR answers on teamwork and meeting deadlines."]
    },
    {
      name: "Accenture", tier: "Service", ats: 65, cgpa: "65%+ aggregate, max 1 backlog",
      process: "Cognitive & technical assessment → Coding → Communication → HR",
      skills: ["SQL", "Cloud", "Automation", "Java", "Python", "Agile"],
      weights: { ats: .3, relevance: .22, fundamentals: .16, comms: .2, projects: .12 },
      prep: ["Add cloud (AWS/Azure) and automation exposure — Accenture screens for it explicitly.",
        "Prepare agile delivery vocabulary: sprint, backlog, stand-up, client demo.",
        "The communication assessment is scored — practise clear spoken summaries."]
    },
    {
      name: "Cognizant", tier: "Service", ats: 63, cgpa: "60%+ throughout, no active backlogs",
      process: "GenC assessment → Technical interview → HR",
      skills: ["SQL", "Java", "Python", "Data Structures", "REST API", "MongoDB"],
      weights: { ats: .28, relevance: .24, fundamentals: .2, comms: .16, projects: .12 },
      prep: ["SQL joins, subqueries and normalisation come up in almost every GenC technical round.",
        "Own your project end to end — they probe architecture decisions.",
        "Prepare ownership and adaptability examples for the behavioural round."]
    },
    {
      name: "Capgemini", tier: "Service", ats: 61, cgpa: "60%+ throughout, no backlogs",
      process: "Game-based aptitude → Pseudo-code test → Technical → HR",
      skills: ["Pseudo Code", "Java", "Python", "SQL", "OOP", "Git"],
      weights: { ats: .3, relevance: .18, fundamentals: .22, comms: .2, projects: .1 },
      prep: ["Practise pseudo-code MCQs — output prediction and loop tracing.",
        "Brush up English grammar and comprehension for the communication section.",
        "Frame one project around innovation or process improvement."]
    },
    {
      name: "Deloitte", tier: "Consulting", ats: 70, cgpa: "70%+ aggregate preferred",
      process: "Assessment → Case / situational round → Technical → Partner HR",
      skills: ["SQL", "Excel", "Data Visualization", "Java", "Python", "System Design"],
      weights: { ats: .26, relevance: .24, fundamentals: .16, comms: .22, projects: .12 },
      prep: ["Practise structured case answers — problem, options, trade-off, recommendation.",
        "Translate every project into business impact (cost, time, risk).",
        "Client-facing communication carries as much weight as technical depth."]
    },
    {
      name: "Amazon", tier: "Product", ats: 76, cgpa: "No strict cut-off; DSA bar is the filter",
      process: "Online assessment (DSA + workstyle) → 2–3 technical loops → Bar raiser",
      skills: ["Data Structures", "Algorithms", "System Design", "Java", "Python", "AWS"],
      weights: { ats: .18, relevance: .22, fundamentals: .34, comms: .1, projects: .16 },
      prep: ["Target 300+ quality DSA problems with focus on trees, graphs, heaps and DP.",
        "Prepare 6+ STAR stories mapped to Leadership Principles — Ownership, Dive Deep, Bias for Action.",
        "Be able to reason about time/space complexity out loud while coding."]
    },
    {
      name: "Microsoft", tier: "Product", ats: 78, cgpa: "No strict cut-off; strong CS fundamentals expected",
      process: "Online assessment → 2–3 technical rounds → As-appropriate round",
      skills: ["Data Structures", "Algorithms", "System Design", "C++", "OOP", "Operating Systems"],
      weights: { ats: .18, relevance: .2, fundamentals: .36, comms: .1, projects: .16 },
      prep: ["Depth over breadth: trees, graphs, recursion and DP with clean, edge-case-safe code.",
        "Revise OS, DBMS and networking — Microsoft interviewers probe fundamentals.",
        "Have one substantial project you can whiteboard the design for."]
    },
    {
      name: "Google", tier: "Product", ats: 80, cgpa: "No strict cut-off; very high DSA bar",
      process: "Online assessment → 3–4 technical interviews → Hiring committee",
      skills: ["Data Structures", "Algorithms", "System Design", "C++", "Python", "Complexity Analysis"],
      weights: { ats: .16, relevance: .18, fundamentals: .4, comms: .1, projects: .16 },
      prep: ["Solve hard-tier graph, DP and greedy problems; optimality and complexity are graded.",
        "Practise Googleyness questions and collaborative problem framing.",
        "Open-source contributions or research work meaningfully lift the profile."]
    }
  ];

  var DSA_HINTS = ["data structures", "algorithm", "leetcode", "codeforces", "hackerrank", "dynamic programming", "graph", "competitive programming", "codechef"];
  var COMM_HINTS = ["presented", "communication", "collaborat", "team", "mentor", "documented", "client", "stakeholder", "led"];
  var STABILITY_HINTS = ["internship", "intern", "trainee", "volunteer", "part-time", "freelance"];

  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
  function hits(text, arr) { return arr.filter(function (h) { return text.indexOf(h) > -1; }); }

  function signals(p, s) {
    var t = (p.raw || "").toLowerCase();
    var dsa = hits(t, DSA_HINTS);
    var comm = hits(t, COMM_HINTS);
    var stab = hits(t, STABILITY_HINTS);
    var cgpa = /(cgpa|gpa|percentage|\b\d{2}(\.\d+)?\s*%)/i.test(p.raw || "");
    return {
      fundamentals: clamp(dsa.length * 14 + (p.certifications.length ? 10 : 0) + s.relevance * 0.4 + Math.min(p.projects.length, 4) * 5),
      comms: clamp(comm.length * 9 + (p.summary ? 12 : 0) + Math.min(p.actionVerbs.length, 8) * 4 + (p.achievements.length ? 10 : 0)),
      evidence: clamp(Math.min(p.numbers, 14) * 5 + p.projects.length * 7),
      stability: clamp((p.experience.length + p.internships.length) * 26 + stab.length * 8 + (cgpa ? 10 : 0)),
      dsaHits: dsa, commHits: comm, hasCgpa: cgpa
    };
  }

  function verdictBand(n) {
    if (n >= 80) return "Strong";
    if (n >= 65) return "Positive";
    if (n >= 50) return "Borderline";
    return "Weak";
  }

  /* ---------- HR review simulation ---------- */
  function hrReview(p, s, sig, role) {
    var presentation = clamp(s.formatting * 0.5 + s.structure * 0.5);
    var clarity = clamp(sig.comms * 0.6 + (p.summary ? 25 : 0) + (p.words >= 300 && p.words <= 900 ? 15 : 0));
    var consistency = clamp(sig.stability * 0.6 + (sig.hasCgpa ? 20 : 0) + (p.education.length ? 20 : 0));
    var culture = clamp((p.achievements.length ? 30 : 5) + sig.commHits.length * 10 + (p.certifications.length ? 20 : 0) + 20);
    var overall = clamp(presentation * .25 + clarity * .3 + consistency * .25 + culture * .2);
    var notes = [];
    if (!p.summary) notes.push("No career objective or summary line — HR opens the screen call by asking you to introduce yourself, and the resume gives them nothing to anchor on.");
    if (!sig.hasCgpa) notes.push("No CGPA or percentage found. Most HR eligibility sheets are filled from the resume; missing academics can stall the file.");
    if (!p.experience.length && !p.internships.length) notes.push("No internship or work exposure listed — expect probing on how you handle real deadlines and teams.");
    if (p.achievements.length) notes.push("Achievements section gives HR a positive talking point: " + p.achievements[0].slice(0, 90) + ".");
    if (clarity < 55) notes.push("Bullets read as duties, not outcomes; HR reads this as low ownership.");
    notes.push("Presentation check: " + p.words + " words, " + p.bulletCount + " bullets, " + (p.links.linkedin ? "LinkedIn present" : "LinkedIn missing") + ".");
    var questions = [
      "Walk me through your resume in two minutes.",
      p.education.length ? "Why did you choose " + (role) + " over other options after your degree?" : "Tell me about your academic background.",
      sig.stability >= 50 ? "Tell me about a deadline you nearly missed and what you did." : "You have limited work exposure — how do you handle pressure and feedback?",
      "Where do you see yourself in three years, and how does this role fit that?",
      "Are you open to relocation, shift work and a service agreement?"
    ];
    return {
      scores: [["Presentation", presentation], ["Communication clarity", clarity], ["Profile consistency", consistency], ["Culture & attitude signals", culture]],
      overall: overall, verdict: verdictBand(overall), notes: notes, questions: questions
    };
  }

  /* ---------- technical recruiter feedback ---------- */
  function techReview(p, s, sig, role) {
    var stack = clamp(s.relevance);
    var depth = clamp(sig.evidence * 0.6 + Math.min(p.projects.length, 5) * 8);
    var fundamentals = sig.fundamentals;
    var delivery = clamp((p.links.github ? 30 : 0) + (/deploy|hosted|live|netlify|vercel|aws|docker/i.test(p.raw) ? 25 : 0) + (/test|jest|junit|pytest/i.test(p.raw) ? 20 : 0) + Math.min(p.actionVerbs.length, 6) * 4);
    var overall = clamp(stack * .3 + depth * .25 + fundamentals * .3 + delivery * .15);
    var notes = [];
    notes.push("Stack read for " + role + ": " + (s.matchedSkills.slice(0, 6).join(", ") || "no core stack matched") + ".");
    if (s.missingSkills.length) notes.push("Screening gap: no evidence of " + s.missingSkills.slice(0, 4).join(", ") + " — these appear in most " + role + " job descriptions.");
    notes.push(sig.dsaHits.length ? "DSA signal detected (" + sig.dsaHits.slice(0, 3).join(", ") + ") — enough to justify a coding round invite." : "No DSA / problem-solving signal on the resume. Product companies filter on this before reading projects.");
    notes.push(p.links.github ? "GitHub linked — expect the interviewer to open one repository and ask about commits." : "No repository link, so nothing is verifiable. Add GitHub with pinned projects.");
    notes.push(/deploy|hosted|live|netlify|vercel|aws|docker/i.test(p.raw) ? "Deployment evidence present — signals end-to-end ownership." : "Nothing is deployed or hosted; add one live link to prove shipping ability.");
    var probes = (s.matchedSkills.slice(0, 3).concat(s.matchedTools.slice(0, 2))).map(function (k) {
      return "Deep dive on " + k + ": design decision, alternative considered, and what broke in production.";
    });
    probes.push("Complexity walkthrough of your hardest algorithmic problem.");
    if (p.projects.length) probes.push("Architecture of \"" + p.projects[0].slice(0, 60) + "\" — data flow, failure handling and scale limits.");
    return {
      scores: [["Stack coverage", stack], ["Project depth", depth], ["CS fundamentals", fundamentals], ["Engineering practice", delivery]],
      overall: overall, verdict: verdictBand(overall), notes: notes, probes: probes,
      screenCall: overall >= 72 ? "Advance to technical round" : overall >= 55 ? "Advance with reservations — verify fundamentals in the screen" : "Hold — profile needs strengthening before a technical loop"
    };
  }

  /* ---------- resume ranking ---------- */
  function ranking(s, sig, hr, tech, pool) {
    var composite = clamp(s.ats * .3 + tech.overall * .28 + hr.overall * .17 + s.relevance * .15 + sig.evidence * .1);
    // Benchmarked against a campus applicant distribution (mean 58, sd 14).
    var z = (composite - 58) / 14;
    var pct = clamp(50 * (1 + erf(z / Math.SQRT2)));
    var band = pct >= 90 ? "Top 10% — priority shortlist"
      : pct >= 75 ? "Top 25% — strong shortlist candidate"
        : pct >= 50 ? "Middle 50% — competitive with edits"
          : pct >= 25 ? "Bottom 50% — likely filtered at screening"
            : "Bottom 25% — rebuild before applying";
    var applicants = pool || 1000;
    return {
      composite: composite, percentile: pct, band: band,
      rank: Math.max(1, Math.round(applicants * (1 - pct / 100))), pool: applicants,
      shortlist: clamp(pct * 0.75 + (s.ats >= 70 ? 12 : 0)),
      factors: [
        ["ATS compatibility", s.ats, 30], ["Technical evaluation", tech.overall, 28],
        ["HR evaluation", hr.overall, 17], ["Role relevance", s.relevance, 15], ["Quantified evidence", sig.evidence, 10]
      ]
    };
  }
  function erf(x) {
    var sign = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    // Abramowitz & Stegun 7.1.26
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return sign * y;
  }

  /* ---------- company eligibility ---------- */
  function eligibility(p, s, sig, hr, tech) {
    var have = (p.skills || []).map(function (x) { return x.toLowerCase(); });
    var text = (p.raw || "").toLowerCase();
    return COMPANIES.map(function (c) {
      var matched = c.skills.filter(function (k) { return have.indexOf(k.toLowerCase()) > -1 || text.indexOf(k.toLowerCase()) > -1; });
      var missing = c.skills.filter(function (k) { return matched.indexOf(k) < 0; });
      var skillPct = Math.round((matched.length / c.skills.length) * 100);
      var w = c.weights;
      var fit = clamp(s.ats * w.ats + skillPct * w.relevance + sig.fundamentals * w.fundamentals + hr.scores[1][1] * w.comms + sig.evidence * w.projects);
      var status = fit >= c.ats + 8 ? "Eligible" : fit >= c.ats - 8 ? "Borderline" : "Not Eligible Yet";
      var gap = Math.max(0, c.ats - fit);
      return {
        name: c.name, tier: c.tier, process: c.process, cgpa: c.cgpa,
        fit: fit, cutoff: c.ats, status: status, skillPct: skillPct,
        matched: matched, missing: missing,
        insight: status === "Eligible"
          ? "Profile clears the typical " + c.name + " screening bar (" + fit + " vs " + c.ats + "). Focus now shifts to interview performance in: " + c.process + "."
          : status === "Borderline"
            ? "You are " + gap + " points under the usual " + c.name + " bar. Closing " + (missing.slice(0, 2).join(" and ") || "the evidence gap") + " typically moves a borderline profile above the line."
            : "Current profile fit is " + fit + " against a " + c.ats + " benchmark. " + c.name + " screening would filter this before the interview stage.",
        prep: c.prep.concat(missing.length ? ["Add demonstrable work in " + missing.slice(0, 3).join(", ") + " before the " + c.name + " drive."] : [])
      };
    }).sort(function (a, b) { return b.fit - a.fit; });
  }

  window.PrepDeckRecruiter = {
    companies: COMPANIES,
    build: function (p, s, role) {
      var sig = signals(p, s);
      var hr = hrReview(p, s, sig, role);
      var tech = techReview(p, s, sig, role);
      var rank = ranking(s, sig, hr, tech);
      var elig = eligibility(p, s, sig, hr, tech);
      return { signals: sig, hr: hr, tech: tech, rank: rank, eligibility: elig };
    }
  };
})();
