/* PrepDeck — Resume Analysis System (Local Storage only) */
(function () {
  var HKEY = "prepdeck.resume.history";
  var LKEY = "prepdeck.resume.last";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("page-resume")) return;

  /* ---------------- role knowledge base ---------------- */
  var ROLES = {
    "Frontend Developer": {
      skills: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Redux", "Next.js", "Tailwind", "SASS", "Accessibility", "Responsive Design", "Testing Library", "Web Performance"],
      tools: ["Git", "Webpack", "Vite", "Figma", "Chrome DevTools", "Jest", "Storybook", "npm"],
      certs: ["Meta Front-End Developer", "freeCodeCamp Responsive Web Design", "Google Mobile Web Specialist"],
      projects: ["a production-style responsive SPA", "a design-system or component library", "an accessibility-audited web app", "a dashboard consuming a live REST API"],
      keywords: ["component", "state management", "responsive", "api integration", "ui", "accessibility", "performance", "cross-browser"]
    },
    "Backend Developer": {
      skills: ["Java", "Python", "Node.js", "Express", "Spring Boot", "REST API", "SQL", "MongoDB", "Redis", "Authentication", "System Design", "Microservices", "Unit Testing"],
      tools: ["Git", "Docker", "Postman", "Kubernetes", "Nginx", "Jenkins", "PostgreSQL", "Linux"],
      certs: ["AWS Certified Developer Associate", "Oracle Java Certification", "MongoDB Developer Associate"],
      projects: ["a REST API with authentication and role-based access", "a service with caching and rate limiting", "a database-heavy application with schema design", "a containerised deployment"],
      keywords: ["api", "database", "scalability", "authentication", "deployment", "latency", "microservice", "caching"]
    },
    "Full Stack Developer": {
      skills: ["JavaScript", "TypeScript", "React", "Node.js", "Express", "SQL", "MongoDB", "REST API", "HTML", "CSS", "Authentication", "Deployment", "System Design"],
      tools: ["Git", "Docker", "Postman", "Vite", "AWS", "Firebase", "CI/CD", "Figma"],
      certs: ["AWS Certified Cloud Practitioner", "Meta Full-Stack Developer", "MongoDB Developer Associate"],
      projects: ["an end-to-end product with auth, database and deployment", "a real-time app using websockets", "a payments or booking workflow", "a multi-role admin dashboard"],
      keywords: ["full stack", "end-to-end", "api", "database", "deployment", "authentication", "responsive", "users"]
    },
    "Data Analyst": {
      skills: ["SQL", "Python", "Pandas", "NumPy", "Excel", "Statistics", "Data Visualization", "Power BI", "Tableau", "Data Cleaning", "A/B Testing", "Reporting"],
      tools: ["Power BI", "Tableau", "Jupyter", "Google Analytics", "BigQuery", "Excel", "Looker", "Git"],
      certs: ["Google Data Analytics Certificate", "Microsoft Power BI Data Analyst PL-300", "IBM Data Analyst"],
      projects: ["an end-to-end dashboard on a real dataset", "an exploratory analysis with business recommendations", "a SQL reporting pipeline", "a forecasting or cohort analysis"],
      keywords: ["insight", "dashboard", "dataset", "query", "trend", "kpi", "visualization", "stakeholder"]
    },
    "Software Engineer": {
      skills: ["Data Structures", "Algorithms", "Java", "Python", "C++", "OOP", "SQL", "Operating Systems", "Computer Networks", "System Design", "Git", "Unit Testing"],
      tools: ["Git", "Docker", "Linux", "IntelliJ", "VS Code", "Jira", "CI/CD", "Postman"],
      certs: ["AWS Certified Cloud Practitioner", "Oracle Java Certification", "Google IT Automation with Python"],
      projects: ["a project demonstrating algorithmic depth", "a multi-module application with tests", "an open-source contribution", "a scalable backend or systems project"],
      keywords: ["algorithm", "optimized", "complexity", "design", "testing", "scalable", "debugging", "production"]
    },
    "UI/UX Designer": {
      skills: ["Figma", "Wireframing", "Prototyping", "User Research", "Usability Testing", "Design Systems", "Interaction Design", "Information Architecture", "Accessibility", "Visual Design"],
      tools: ["Figma", "Adobe XD", "Sketch", "Miro", "Framer", "Photoshop", "Illustrator", "Maze"],
      certs: ["Google UX Design Certificate", "NN/g UX Certification", "Interaction Design Foundation UX"],
      projects: ["an end-to-end case study with research and testing", "a design system with reusable components", "a mobile app redesign with before/after metrics", "an accessibility-focused redesign"],
      keywords: ["user", "research", "prototype", "usability", "wireframe", "iteration", "persona", "design system"]
    }
  };

  var ALL_SKILLS = (function () {
    var seen = {}, out = [];
    Object.keys(ROLES).forEach(function (r) {
      ROLES[r].skills.concat(ROLES[r].tools).forEach(function (s) {
        var k = s.toLowerCase();
        if (!seen[k]) { seen[k] = 1; out.push(s); }
      });
    });
    ["Kotlin", "Swift", "PHP", "Django", "Flask", "GraphQL", "Kafka", "Spark", "R", "Matplotlib", "Seaborn", "Scikit-learn", "TensorFlow", "Bootstrap", "jQuery", "Angular", "Vue", "MySQL", "Firebase", "Azure", "GCP"].forEach(function (s) {
      if (!seen[s.toLowerCase()]) { seen[s.toLowerCase()] = 1; out.push(s); }
    });
    return out;
  })();

  var STOP = "the and for with from that this your you our are was were has have will able into over under able role work team using used across within".split(" ");

  /* ---------------- storage ---------------- */
  function hist() { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch (e) { return []; } }
  function saveHist(h) { localStorage.setItem(HKEY, JSON.stringify(h.slice(-40))); }
  function lastReport() { try { return JSON.parse(localStorage.getItem(LKEY)); } catch (e) { return null; } }

  /* ---------------- text extraction ---------------- */
  function readPdf(file) {
    var pdfjs = window.pdfjsLib;
    if (!pdfjs) return Promise.reject(new Error("PDF reader failed to load."));
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    return file.arrayBuffer().then(function (buf) {
      return pdfjs.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var jobs = [];
      for (var i = 1; i <= doc.numPages; i++) jobs.push(doc.getPage(i).then(function (p) { return p.getTextContent(); }));
      return Promise.all(jobs).then(function (pages) {
        return pages.map(function (pc) {
          var line = "", out = [], lastY = null;
          pc.items.forEach(function (it) {
            var y = it.transform[5];
            if (lastY !== null && Math.abs(y - lastY) > 4) { out.push(line.trim()); line = ""; }
            line += it.str + " ";
            lastY = y;
          });
          out.push(line.trim());
          return out.join("\n");
        }).join("\n");
      });
    });
  }

  function readDocx(file) {
    if (!window.mammoth) return Promise.reject(new Error("DOCX reader failed to load."));
    return file.arrayBuffer().then(function (buf) {
      return window.mammoth.extractRawText({ arrayBuffer: buf });
    }).then(function (r) { return r.value; });
  }

  /* ---------------- parsing ---------------- */
  var SECTION_MAP = [
    ["education", /^(education|academic|academics|qualification|educational background)/i],
    ["skills", /^(technical skills|skills|core competencies|technologies|tech stack)/i],
    ["certifications", /^(certification|certifications|courses|licenses)/i],
    ["projects", /^(project|projects|academic projects|personal projects)/i],
    ["experience", /^(experience|work experience|professional experience|employment)/i],
    ["internships", /^(internship|internships|training)/i],
    ["achievements", /^(achievement|achievements|awards|accomplishments|honors|extra[- ]curricular)/i],
    ["summary", /^(summary|objective|profile|career objective|about)/i]
  ];

  function splitSections(text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.replace(/\s+/g, " ").trim(); });
    var out = { header: [] }, cur = "header";
    lines.forEach(function (l) {
      if (!l) return;
      var clean = l.replace(/[:•\-–—]+$/, "").trim();
      var hit = null;
      if (clean.length <= 42) {
        SECTION_MAP.forEach(function (s) { if (!hit && s[1].test(clean)) hit = s[0]; });
      }
      if (hit) { cur = hit; out[cur] = out[cur] || []; return; }
      (out[cur] = out[cur] || []).push(l);
    });
    return out;
  }

  function bullets(arr) {
    if (!arr) return [];
    return arr.map(function (l) { return l.replace(/^[•\-*·▪]\s*/, "").trim(); })
      .filter(function (l) { return l.length > 3; }).slice(0, 12);
  }

  function parseResume(text) {
    var sec = splitSections(text);
    var flat = text.replace(/\s+/g, " ");
    var email = (text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/) || [""])[0];
    var phone = "";
    (text.match(/(?:\+\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}/g) || []).some(function (m) {
      if (m.replace(/\D/g, "").length >= 10) { phone = m.trim(); return true; }
      return false;
    });
    var links = {
      linkedin: /linkedin\.com\/[\w\-/]+/i.test(flat),
      github: /github\.com\/[\w\-/]+/i.test(flat),
      portfolio: /(portfolio|vercel\.app|netlify\.app|\.dev\b)/i.test(flat)
    };

    var name = "";
    (sec.header || []).some(function (l) {
      var c = l.replace(/[^A-Za-z .'-]/g, "").trim();
      if (c.length >= 4 && c.length <= 40 && c.split(" ").length <= 4 && !/@|resume|curriculum/i.test(l) && /^[A-Z]/.test(c)) { name = c; return true; }
      return false;
    });

    var lower = flat.toLowerCase();
    var skills = ALL_SKILLS.filter(function (s) {
      var esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp("(^|[^a-z0-9+#.])" + esc.toLowerCase() + "([^a-z0-9+#.]|$)", "i").test(lower);
    });

    var projects = bullets(sec.projects).filter(function (l) { return l.length > 8; });
    return {
      name: name || "Not detected",
      email: email || "",
      phone: phone || "",
      links: links,
      summary: bullets(sec.summary).join(" "),
      education: bullets(sec.education),
      skills: skills,
      certifications: bullets(sec.certifications),
      projects: projects,
      experience: bullets(sec.experience),
      internships: bullets(sec.internships),
      achievements: bullets(sec.achievements),
      words: text.trim().split(/\s+/).length,
      bulletCount: (text.match(/^\s*[•\-*·▪]/gm) || []).length,
      numbers: (text.match(/\b\d+(\.\d+)?%?\b/g) || []).length,
      actionVerbs: ["built", "designed", "developed", "implemented", "optimized", "led", "automated", "improved", "reduced", "launched", "migrated", "analysed", "analyzed"]
        .filter(function (v) { return lower.indexOf(v) > -1; }),
      sections: sec,
      raw: text
    };
  }

  /* ---------------- scoring ---------------- */
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  function score(p, role) {
    var kb = ROLES[role];
    var needed = ["education", "skills", "projects", "experience", "certifications", "achievements"];
    var present = needed.filter(function (k) { return (p[k === "experience" ? "experience" : k] || []).length; });
    if (p.internships.length) present.push("internships");
    var structure = clamp(
      (p.education.length ? 18 : 0) + (p.skills.length ? 18 : 0) + (p.projects.length ? 18 : 0) +
      (p.experience.length || p.internships.length ? 16 : 0) + (p.certifications.length ? 10 : 0) +
      (p.achievements.length ? 8 : 0) + (p.summary ? 6 : 0) + (p.email && p.phone ? 6 : 0)
    );

    var kw = kb.keywords.filter(function (k) { return p.raw.toLowerCase().indexOf(k) > -1; });
    var keywords = clamp((kw.length / kb.keywords.length) * 70 + Math.min(p.numbers, 12) * 1.5 + Math.min(p.actionVerbs.length, 8) * 1.5);

    var have = p.skills.map(function (s) { return s.toLowerCase(); });
    var matchedSkills = kb.skills.filter(function (s) { return have.indexOf(s.toLowerCase()) > -1; });
    var matchedTools = kb.tools.filter(function (s) { return have.indexOf(s.toLowerCase()) > -1; });
    var relevance = clamp((matchedSkills.length / kb.skills.length) * 65 + (matchedTools.length / kb.tools.length) * 35);

    var wordFit = p.words >= 300 && p.words <= 900 ? 30 : p.words < 300 ? 12 : 20;
    var formatting = clamp(
      wordFit + (p.bulletCount >= 8 ? 22 : p.bulletCount >= 4 ? 14 : 6) +
      (p.email ? 10 : 0) + (p.phone ? 8 : 0) +
      (p.links.linkedin ? 8 : 0) + (p.links.github || p.links.portfolio ? 8 : 0) +
      (/\t|\|/.test(p.raw) ? 0 : 8) + (p.name !== "Not detected" ? 6 : 0)
    );

    var ats = clamp(structure * 0.25 + keywords * 0.28 + relevance * 0.32 + formatting * 0.15);
    var evidence = Math.min(p.numbers, 15) * 3 + p.projects.length * 6 + p.experience.length * 4 + p.internships.length * 5;
    var interview = clamp(relevance * 0.45 + Math.min(evidence, 55) * 0.55);
    var strength = clamp(ats * 0.6 + structure * 0.2 + interview * 0.2);
    var readiness = clamp(ats * 0.5 + interview * 0.3 + relevance * 0.2);

    return {
      ats: ats, structure: structure, keywords: keywords, relevance: relevance, formatting: formatting,
      interview: interview, strength: strength, readiness: readiness,
      matchedSkills: matchedSkills, matchedTools: matchedTools,
      missingSkills: kb.skills.filter(function (s) { return have.indexOf(s.toLowerCase()) < 0; }),
      missingTools: kb.tools.filter(function (s) { return have.indexOf(s.toLowerCase()) < 0; }),
      missingCerts: kb.certs.filter(function (c) {
        return p.certifications.join(" ").toLowerCase().indexOf(c.split(" ")[0].toLowerCase()) < 0;
      }),
      missingKeywords: kb.keywords.filter(function (k) { return p.raw.toLowerCase().indexOf(k) < 0; }),
      missingProjects: kb.projects.filter(function (pr) {
        var head = pr.split(" ").slice(1, 4).join(" ").toLowerCase();
        return p.projects.join(" ").toLowerCase().indexOf(head) < 0;
      })
    };
  }

  function band(n) {
    if (n >= 85) return { label: "Placement Ready", title: "Shortlist-ready profile" };
    if (n >= 70) return { label: "Competitive", title: "Competitive with focused edits" };
    if (n >= 50) return { label: "Developing", title: "Developing — key gaps remain" };
    return { label: "Beginner", title: "Early stage — rebuild core sections" };
  }

  function jdMatch(p, jd) {
    if (!jd || jd.trim().length < 40) return null;
    var tokens = {};
    jd.toLowerCase().replace(/[^a-z0-9+#. ]/g, " ").split(/\s+/).forEach(function (w) {
      if (w.length < 3 || STOP.indexOf(w) > -1) return;
      tokens[w] = (tokens[w] || 0) + 1;
    });
    var keys = Object.keys(tokens).sort(function (a, b) { return tokens[b] - tokens[a]; }).slice(0, 60);
    var text = p.raw.toLowerCase();
    var hitList = keys.filter(function (k) { return text.indexOf(k) > -1; });
    var missKeys = keys.filter(function (k) { return text.indexOf(k) < 0; });
    var jdSkills = ALL_SKILLS.filter(function (s) { return jd.toLowerCase().indexOf(s.toLowerCase()) > -1; });
    var have = p.skills.map(function (s) { return s.toLowerCase(); });
    return {
      pct: clamp((hitList.length / Math.max(keys.length, 1)) * 100),
      missingKeywords: missKeys.slice(0, 18),
      missingSkills: jdSkills.filter(function (s) { return have.indexOf(s.toLowerCase()) < 0; })
    };
  }

  /* ---------------- deterministic fallback insights ---------------- */
  function localReview(p, s, role, match) {
    var secFb = [];
    function add(section, ok, feedback, action) {
      secFb.push({ section: section, verdict: ok >= 2 ? "Strong" : ok === 1 ? "Adequate" : "Weak", feedback: feedback, action: action });
    }
    add("Contact & header", p.email && p.phone && (p.links.linkedin || p.links.github) ? 2 : p.email ? 1 : 0,
      "Detected " + (p.email || "no email") + ", " + (p.phone || "no phone") + ", LinkedIn " + (p.links.linkedin ? "present" : "missing") + ", GitHub " + (p.links.github ? "present" : "missing") + ".",
      p.links.github ? "Keep the GitHub link above the fold." : "Add a GitHub/portfolio URL next to your email — recruiters open it during screening.");
    add("Skills", s.relevance >= 70 ? 2 : s.relevance >= 45 ? 1 : 0,
      "Matched " + s.matchedSkills.length + "/" + ROLES[role].skills.length + " core " + role + " skills and " + s.matchedTools.length + "/" + ROLES[role].tools.length + " tools.",
      s.missingSkills.length ? "Add hands-on evidence for " + s.missingSkills.slice(0, 3).join(", ") + " — mention them inside project bullets, not just a list." : "Group skills by proficiency to signal depth.");
    add("Projects", p.projects.length >= 3 ? 2 : p.projects.length >= 1 ? 1 : 0,
      p.projects.length + " project entries detected with " + p.numbers + " quantified figures across the resume.",
      p.projects.length < 3 ? "Add " + (3 - p.projects.length) + " more project(s) — e.g. " + (s.missingProjects[0] || ROLES[role].projects[0]) + "." : "Convert each project bullet into outcome + metric + stack.");
    add("Experience & internships", p.experience.length + p.internships.length >= 2 ? 2 : p.experience.length + p.internships.length ? 1 : 0,
      p.experience.length + " work entries and " + p.internships.length + " internship entries found.",
      p.experience.length + p.internships.length ? "Lead every bullet with an action verb and a measurable result." : "Add an internship, freelance or open-source contribution with dates and scope.");
    add("Education", p.education.length ? 2 : 0,
      p.education.length ? "Education block present with " + p.education.length + " line(s)." : "No education section was detected by the parser.",
      p.education.length ? "Include CGPA/percentage and graduation year on one line." : "Add a clearly titled EDUCATION section — ATS parsers key on it.");
    add("Certifications", p.certifications.length >= 2 ? 2 : p.certifications.length ? 1 : 0,
      p.certifications.length + " certification(s) detected.",
      s.missingCerts.length ? "Target " + s.missingCerts[0] + " — it maps directly to " + role + " screening filters." : "Add issue dates and credential IDs.");
    add("Formatting & ATS safety", s.formatting >= 75 ? 2 : s.formatting >= 55 ? 1 : 0,
      p.words + " words, " + p.bulletCount + " bullet lines, " + p.actionVerbs.length + " distinct action verbs.",
      p.words > 900 ? "Trim to a single page — cut narrative paragraphs into bullets." : p.words < 300 ? "Expand to 400–700 words; sparse resumes fail keyword thresholds." : "Keep single-column layout and standard section titles.");

    var proj = p.projects.slice(0, 4).map(function (t) {
      var stack = ALL_SKILLS.filter(function (sk) { return t.toLowerCase().indexOf(sk.toLowerCase()) > -1; });
      var hasMetric = /\d/.test(t);
      return {
        project: t.slice(0, 90),
        complexity: stack.length >= 4 ? "High — multi-technology build" : stack.length >= 2 ? "Moderate — standard stack" : "Low — limited technical signal",
        industryValue: hasMetric ? "Strong: outcome is quantified" : "Moderate: no measurable impact stated",
        betterTitle: (stack[0] || role.split(" ")[0]) + "-based " + (hasMetric ? "Production" : "End-to-End") + " " + (role === "Data Analyst" ? "Analytics Solution" : "Application"),
        missingFeatures: [hasMetric ? "" : "A quantified outcome (users, latency, accuracy, time saved)", stack.length < 3 ? "Deployment / hosting detail" : "", /test/i.test(t) ? "" : "Automated tests"].filter(Boolean),
        enhancements: ["Name the stack explicitly: " + (stack.join(", ") || "add the technologies used"), "Add a live demo and repository link", "State your individual contribution if it was a team project"]
      };
    });

    return {
      recruiterSummary: "Screening " + p.name + " for " + role + ": ATS " + s.ats + "/100, skills relevance " + s.relevance +
        "%, " + p.projects.length + " projects and " + (p.experience.length + p.internships.length) + " experience entries. " +
        (s.ats >= 70 ? "This resume would clear most automated filters; depth of evidence is the differentiator now."
          : "It is likely to be filtered out before human review — the gaps below are the fastest wins."),
      strengths: [
        s.matchedSkills.length ? "Core stack coverage: " + s.matchedSkills.slice(0, 6).join(", ") : "",
        p.numbers >= 5 ? "Uses " + p.numbers + " quantified figures — good evidence habit" : "",
        p.links.github ? "GitHub profile linked for code verification" : "",
        p.certifications.length ? "Certifications listed: " + p.certifications.slice(0, 2).join("; ") : ""
      ].filter(Boolean),
      redFlags: [
        s.missingSkills.length > 5 ? "Missing " + s.missingSkills.length + " of the core " + role + " skills, including " + s.missingSkills.slice(0, 3).join(", ") : "",
        p.numbers < 3 ? "Almost no quantified impact — bullets read as responsibilities, not results" : "",
        !p.experience.length && !p.internships.length ? "No internship or work experience section detected" : "",
        p.words > 950 ? "Resume runs long at " + p.words + " words for a fresher profile" : ""
      ].filter(Boolean),
      sectionFeedback: secFb,
      projectFeedback: proj,
      skillSuggestions: s.missingSkills.slice(0, 4).map(function (sk) {
        return sk + " — add it by rebuilding one existing project with " + sk + " and stating the outcome.";
      }).concat(s.missingTools.slice(0, 3).map(function (t) { return t + " — list it under Tools and reference it in a project bullet."; })),
      interviewFocus: s.matchedSkills.slice(0, 4).map(function (sk) { return "Expect deep questions on " + sk + " from your listed projects."; })
        .concat(["Prepare a 90-second walkthrough of your strongest project including trade-offs."]),
      optimizationTips: [
        "Mirror the exact role title \"" + role + "\" in your summary line.",
        s.missingKeywords.length ? "Work these screening keywords into bullets: " + s.missingKeywords.slice(0, 5).join(", ") + "." : "Keyword coverage is strong — keep it natural.",
        "Use the pattern: Action verb + what you built + technology + measurable result.",
        "Save and submit as PDF with selectable text; avoid tables, columns and text boxes."
      ],
      jobMatchNotes: match ? [
        "Job description match: " + match.pct + "%.",
        match.missingSkills.length ? "Skills named in the JD but absent from your resume: " + match.missingSkills.join(", ") + "." : "All JD-named skills appear in your resume.",
        match.missingKeywords.length ? "Add these JD phrases where truthful: " + match.missingKeywords.slice(0, 8).join(", ") + "." : "Keyword alignment is strong."
      ] : ["Paste a job description to unlock job match analysis."]
    };
  }

  function mergeReview(base, ai) {
    if (!ai) return base;
    var out = {};
    Object.keys(base).forEach(function (k) {
      var v = ai[k];
      out[k] = (Array.isArray(v) && v.length) || (typeof v === "string" && v.trim()) ? v : base[k];
    });
    return out;
  }

  /* ---------------- rendering helpers ---------------- */
  function li(ul, items, empty) {
    ul.innerHTML = "";
    if (!items || !items.length) { ul.innerHTML = '<li class="empty">' + (empty || "Nothing detected.") + "</li>"; return; }
    items.forEach(function (t) { var el = document.createElement("li"); el.textContent = t; ul.appendChild(el); });
  }
  function chips(box, items, empty) {
    box.innerHTML = "";
    if (!items || !items.length) { box.innerHTML = '<span class="empty">' + (empty || "None") + "</span>"; return; }
    items.forEach(function (t) { var el = document.createElement("span"); el.className = "chip"; el.textContent = t; box.appendChild(el); });
  }

  var charts = {};
  function draw(id, cfg) {
    if (!window.Chart) return;
    var el = $(id); if (!el) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new window.Chart(el, cfg);
  }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  /* ---------------- state ---------------- */
  var current = null;   // { parsed, scores, role, match, review, file, date }
  var pending = null;   // { text, name, size, type }
  var busy = false;     // analysis in flight

  /* ---------------- report render ---------------- */
  function renderReport() {
    var r = current;
    $("cvEmpty").hidden = !!r;
    $("cvReport").hidden = !r;
    if (!r) return;
    var p = r.parsed, s = r.scores, b = band(r.scores.readiness);

    $("cvReportTitle").textContent = p.name + " · " + r.role;
    $("cvReportSub").textContent = r.fileName + " · analysed " + new Date(r.date).toLocaleString();
    $("cvAts").textContent = s.ats;
    $("cvRing").style.setProperty("--p", s.ats + "%");
    $("cvLevelBadge").textContent = b.label;
    $("cvLevelTitle").textContent = b.title;
    $("cvVerdict").textContent = r.review.recruiterSummary;

    var f = $("cvFactors"); f.innerHTML = "";
    [["Structure", s.structure], ["Keywords", s.keywords], ["Skills relevance", s.relevance], ["Formatting", s.formatting]]
      .forEach(function (x) {
        var el = document.createElement("li");
        el.innerHTML = "<span>" + x[0] + "</span><em><i style='width:" + x[1] + "%'></i></em><b>" + x[1] + "</b>";
        f.appendChild(el);
      });

    $("cvStructure").textContent = s.structure;
    $("cvKeywords").textContent = s.keywords;
    $("cvSkills").textContent = s.relevance;
    $("cvFormat").textContent = s.formatting;
    $("cvReadiness").textContent = s.readiness;
    $("cvReadinessSub").textContent = b.label;
    $("cvInterview").textContent = s.interview;
    $("cvStrength").textContent = s.strength;
    $("cvMatch").textContent = r.match ? r.match.pct + "%" : "—";
    $("cvMatchSub").textContent = r.match ? "vs pasted job description" : "paste a JD to score";

    draw("chCvRadar", {
      type: "radar",
      data: {
        labels: ["Structure", "Keywords", "Skills", "Formatting", "Interview", "Readiness"],
        datasets: [{
          label: "Score", data: [s.structure, s.keywords, s.relevance, s.formatting, s.interview, s.readiness],
          borderColor: css("--brand"), backgroundColor: "rgba(255,90,60,.18)", pointBackgroundColor: css("--brand")
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: css("--line") }, angleLines: { color: css("--line") }, pointLabels: { color: css("--muted") } } }, plugins: { legend: { display: false } } }
    });

    var kb = ROLES[r.role];
    draw("chCvSkills", {
      type: "bar",
      data: {
        labels: ["Core skills", "Tools", "Certifications", "Project types"],
        datasets: [{
          label: "% covered",
          data: [
            Math.round((s.matchedSkills.length / kb.skills.length) * 100),
            Math.round((s.matchedTools.length / kb.tools.length) * 100),
            Math.round(((kb.certs.length - s.missingCerts.length) / kb.certs.length) * 100),
            Math.round(((kb.projects.length - s.missingProjects.length) / kb.projects.length) * 100)
          ],
          backgroundColor: css("--brand-2"), borderRadius: 8
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: css("--line") }, ticks: { color: css("--muted") } }, x: { grid: { display: false }, ticks: { color: css("--muted") } } }, plugins: { legend: { display: false } } }
    });

    var id = $("cvIdentity"); id.innerHTML = "";
    [["Name", p.name], ["Email", p.email || "Not detected"], ["Phone", p.phone || "Not detected"],
     ["LinkedIn", p.links.linkedin ? "Present" : "Missing"], ["GitHub", p.links.github ? "Present" : "Missing"],
     ["Portfolio", p.links.portfolio ? "Present" : "Missing"], ["Length", p.words + " words"]]
      .forEach(function (x) {
        var el = document.createElement("li");
        el.innerHTML = "<span>" + x[0] + "</span><b>" + x[1] + "</b>";
        id.appendChild(el);
      });

    li($("cvEducation"), p.education, "No education section detected — add a titled EDUCATION block.");
    chips($("cvSkillChips"), p.skills, "No recognisable skills found.");
    $("cvSkillCount").textContent = p.skills.length + " found";
    li($("cvCerts"), p.certifications, "No certifications listed.");
    li($("cvWork"), p.experience, "No work experience detected.");
    li($("cvIntern"), p.internships, "No internships detected.");
    li($("cvProjects"), p.projects, "No projects detected.");
    li($("cvAchieve"), p.achievements, "No achievements listed.");

    $("cvGapRole").textContent = "target: " + r.role;
    chips($("cvGapSkills"), s.missingSkills, "No gaps — full core coverage.");
    chips($("cvGapTools"), s.missingTools, "All expected tools present.");
    chips($("cvGapCerts"), s.missingCerts, "Certification coverage is adequate.");
    li($("cvGapProjects"), s.missingProjects.map(function (x) { return "Missing: " + x + "."; }), "Project portfolio covers the expected range.");

    var pe = $("cvProjectEval"); pe.innerHTML = "";
    if (!r.review.projectFeedback.length) {
      pe.innerHTML = '<div class="card"><p class="empty">No projects were detected to evaluate.</p></div>';
    }
    r.review.projectFeedback.forEach(function (x) {
      var d = document.createElement("div");
      d.className = "rev";
      d.innerHTML = "<p>" + esc(x.project) + "</p>" +
        '<div class="ans"><span class="tag">' + esc(x.complexity) + '</span><span class="tag">' + esc(x.industryValue) + "</span></div>" +
        (x.betterTitle ? '<p class="exp"><b>Suggested title:</b> ' + esc(x.betterTitle) + "</p>" : "") +
        (x.missingFeatures.length ? '<p class="exp"><b>Missing:</b> ' + x.missingFeatures.map(esc).join("; ") + "</p>" : "") +
        (x.enhancements.length ? '<p class="exp"><b>Enhance:</b> ' + x.enhancements.map(esc).join("; ") + "</p>" : "");
      pe.appendChild(d);
    });

    chips($("cvJdKeywords"), r.match ? r.match.missingKeywords : [], "Paste a job description to compare.");
    li($("cvJdNotes"), r.review.jobMatchNotes, "No job match data.");

    $("cvRecruiterSummary").textContent = r.review.recruiterSummary;
    li($("cvStrengths"), r.review.strengths, "No standout strengths identified yet.");
    li($("cvRisks"), r.review.redFlags, "No blocking risks found.");
    li($("cvInterviewFocus"), r.review.interviewFocus);
    li($("cvSkillSuggest"), r.review.skillSuggestions);

    var sw = $("cvSections"); sw.innerHTML = "";
    r.review.sectionFeedback.forEach(function (x) {
      var d = document.createElement("div");
      d.className = "rev" + (x.verdict === "Weak" ? " bad" : "");
      d.innerHTML = "<p>" + esc(x.section) + ' <span class="tag">' + esc(x.verdict) + "</span></p>" +
        '<div class="ans">' + esc(x.feedback) + "</div>" +
        (x.action ? '<p class="exp"><b>Action:</b> ' + esc(x.action) + "</p>" : "");
      sw.appendChild(d);
    });
    li($("cvTips"), r.review.optimizationTips);
    renderRecruiter(r);
  }

  /* ---------------- recruiter intelligence ---------------- */
  function bars(ul, rows) {
    ul.innerHTML = "";
    rows.forEach(function (x) {
      var el = document.createElement("li");
      el.innerHTML = "<span>" + esc(x[0]) + "</span><em><i style='width:" + x[1] + "%'></i></em><b>" + x[1] + "</b>";
      ul.appendChild(el);
    });
  }
  function pillClass(v) {
    return v === "Strong" || v === "Eligible" ? "pill-ok" : v === "Positive" || v === "Borderline" ? "pill-mid" : "pill-bad";
  }

  function renderRecruiter(r) {
    if (!window.PrepDeckRecruiter || !$("riCompanies")) return;
    var intel = window.PrepDeckRecruiter.build(r.parsed, r.scores, r.role);
    r.intel = intel;

    var hr = intel.hr;
    $("riHrScore").textContent = hr.overall;
    var hv = $("riHrVerdict"); hv.textContent = hr.verdict; hv.className = "tag " + pillClass(hr.verdict);
    bars($("riHrFactors"), hr.scores);
    li($("riHrNotes"), hr.notes);
    li($("riHrQuestions"), hr.questions);

    var tc = intel.tech;
    $("riTechScore").textContent = tc.overall;
    $("riTechCall").textContent = tc.screenCall;
    var tv = $("riTechVerdict"); tv.textContent = tc.verdict; tv.className = "tag " + pillClass(tc.verdict);
    bars($("riTechFactors"), tc.scores);
    li($("riTechNotes"), tc.notes);
    li($("riTechProbes"), tc.probes);

    var rk = intel.rank;
    $("riRankScore").textContent = rk.composite;
    $("riRankPct").textContent = rk.percentile;
    $("riRankPos").textContent = "#" + rk.rank + " / " + rk.pool;
    $("riRankShort").textContent = rk.shortlist + "%";
    $("riRankBand").textContent = rk.band;
    bars($("riRankFactors"), rk.factors.map(function (f) { return [f[0] + " (" + f[2] + "% weight)", f[1]]; }));

    var el = intel.eligibility;
    $("riCoEligible").textContent = el.filter(function (c) { return c.status === "Eligible"; }).length;
    $("riCoBorder").textContent = el.filter(function (c) { return c.status === "Borderline"; }).length;
    $("riCoBlocked").textContent = el.filter(function (c) { return c.status === "Not Eligible Yet"; }).length;
    $("riCoBest").textContent = el.length ? el[0].name : "—";

    var box = $("riCompanies"); box.innerHTML = "";
    el.forEach(function (c) {
      var d = document.createElement("div");
      d.className = "cocard";
      d.innerHTML =
        "<header><h4>" + esc(c.name) + "</h4><span class='status " + pillClass(c.status) + "'>" + esc(c.status) + "</span></header>" +
        "<small>" + esc(c.tier) + " · " + esc(c.process) + "</small>" +
        "<div class='fitbar'><i style='width:" + c.fit + "%'></i></div>" +
        "<small>Profile fit <b>" + c.fit + "</b> vs typical bar " + c.cutoff + " · skill coverage " + c.skillPct + "%</small>" +
        "<small><b>Eligibility norm:</b> " + esc(c.cgpa) + "</small>" +
        "<p>" + esc(c.insight) + "</p>" +
        (c.missing.length ? "<small><b>Gaps:</b> " + c.missing.map(esc).join(", ") + "</small>" : "<small><b>Gaps:</b> none on the core stack</small>") +
        "<small><b>Preparation plan</b></small><ul>" + c.prep.slice(0, 4).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      box.appendChild(d);
    });
  }

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  /* ---------------- trends ---------------- */
  function renderTrends() {
    var h = hist();
    $("cvHistoryCount").textContent = h.length;
    $("cvTrRuns").textContent = h.length;
    $("cvTrBest").textContent = h.length ? Math.max.apply(null, h.map(function (x) { return x.ats; })) : 0;
    $("cvTrLatest").textContent = h.length ? h[h.length - 1].ats : 0;
    $("cvTrDelta").textContent = h.length > 1 ? (h[h.length - 1].ats - h[0].ats >= 0 ? "+" : "") + (h[h.length - 1].ats - h[0].ats) : "—";

    var labels = h.map(function (x, i) { return "#" + (i + 1); });
    draw("chCvTrend", {
      type: "line",
      data: { labels: labels, datasets: [{ label: "ATS", data: h.map(function (x) { return x.ats; }), borderColor: css("--brand"), backgroundColor: "rgba(255,90,60,.15)", fill: true, tension: .35 }] },
      options: lineOpts()
    });
    draw("chCvGrowth", {
      type: "line",
      data: { labels: labels, datasets: [{ label: "Skills detected", data: h.map(function (x) { return x.skills; }), borderColor: css("--brand-2"), backgroundColor: "rgba(15,118,110,.15)", fill: true, tension: .35 }] },
      options: lineOpts(false)
    });
    draw("chCvMatch", {
      type: "bar",
      data: { labels: labels, datasets: [{ label: "Job match %", data: h.map(function (x) { return x.match || 0; }), backgroundColor: css("--ok"), borderRadius: 8 }] },
      options: lineOpts()
    });

    var log = $("cvLog"); log.innerHTML = "";
    if (!h.length) { log.innerHTML = '<li class="empty">No analyses yet.</li>'; return; }
    h.slice().reverse().slice(0, 12).forEach(function (x) {
      var el = document.createElement("li");
      el.innerHTML = "<div><b>" + esc(x.role) + "</b><small>" + esc(x.fileName) + " · " + new Date(x.date).toLocaleDateString() + "</small></div><b>" + x.ats + "</b>";
      log.appendChild(el);
    });
  }
  function lineOpts(pctAxis) {
    var max = pctAxis === false ? undefined : 100;
    return {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: max, grid: { color: css("--line") }, ticks: { color: css("--muted") } }, x: { grid: { display: false }, ticks: { color: css("--muted") } } },
      plugins: { legend: { display: false } }
    };
  }

  /* ---------------- analysis flow ---------------- */
  function analyse() {
    var hintEl = $("cvHint");
    var button = $("cvAnalyse");
    if (!pending) {
      hintEl.textContent = "No resume uploaded — drag & drop a PDF/DOCX file or load the sample resume first.";
      hintEl.classList.add("err");
      $("cvDrop").classList.add("over");
      setTimeout(function () { $("cvDrop").classList.remove("over"); }, 1200);
      return;
    }
    if (busy) return;
    hintEl.classList.remove("err");
    var role = $("cvRole").value;
    var jd = $("cvJD").value;
    var hint = $("cvHint");
    var btn = $("cvAnalyse");
    busy = true;
    btn.disabled = true;
    btn.dataset.label = btn.dataset.label || btn.textContent;
    btn.textContent = "Analysing…";
    btn.classList.add("loading");
    hint.textContent = "Analysing resume against " + role + " benchmarks… this can take up to a minute.";

    var parsed, s, match, base;
    try {
      parsed = parseResume(pending.text);
      s = score(parsed, role);
      match = jdMatch(parsed, jd);
      base = localReview(parsed, s, role, match);
    } catch (e) {
      busy = false;
      btn.disabled = false;
      btn.classList.remove("loading");
      btn.textContent = btn.dataset.label;
      hint.classList.add("err");
      hint.textContent = "Could not analyse this resume: " + (e && e.message ? e.message : "unexpected error") + ".";
      return;
    }

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 60000);

    fetch("/api/public/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller ? controller.signal : undefined,
      body: JSON.stringify({
        text: pending.text, role: role, jobDescription: jd,
        scores: { ats: s.ats, structure: s.structure, keywords: s.keywords, relevance: s.relevance, formatting: s.formatting },
        missing: s.missingSkills.concat(s.missingTools).concat(s.missingCerts)
      })
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        clearTimeout(timer);
        try {
        var review = mergeReview(base, data && data.review);
        current = {
          parsed: parsed, scores: s, role: role, match: match, review: review,
          fileName: pending.name, date: Date.now()
        };
        try { localStorage.setItem(LKEY, JSON.stringify(current)); } catch (e) { /* quota */ }
        var h = hist();
        h.push({ date: current.date, role: role, fileName: pending.name, ats: s.ats, readiness: s.readiness, skills: parsed.skills.length, match: match ? match.pct : 0 });
        saveHist(h);

        hint.classList.remove("err");
        hint.textContent = data ? "Analysis complete — recruiter review generated." : "Analysis complete (offline scoring engine).";
        renderReport();
        renderTrends();
        switchPane("report");
        setTimeout(function () { hint.textContent = ""; }, 4000);
        } catch (e) {
          hint.classList.add("err");
          hint.textContent = "Analysis finished but the report failed to render: " + (e && e.message ? e.message : "unexpected error") + ".";
          if (window.console) console.error(e);
        }
        busy = false;
        btn.disabled = false;
        btn.classList.remove("loading");
        btn.textContent = btn.dataset.label;
      });
  }

  /* ---------------- reports ---------------- */
  function summaryText() {
    var r = current; if (!r) return "";
    var s = r.scores, p = r.parsed, L = [];
    L.push("PREPDECK — RESUME ANALYSIS REPORT");
    L.push("Candidate: " + p.name + "   |   Target role: " + r.role);
    L.push("File: " + r.fileName + "   |   Date: " + new Date(r.date).toLocaleString());
    L.push("");
    L.push("SCORES");
    L.push("ATS Score: " + s.ats + "/100   Structure: " + s.structure + "   Keywords: " + s.keywords);
    L.push("Skills relevance: " + s.relevance + "   Formatting: " + s.formatting);
    L.push("Placement readiness: " + s.readiness + " (" + band(s.readiness).label + ")   Interview readiness: " + s.interview + "   Resume strength: " + s.strength);
    if (r.match) L.push("Job description match: " + r.match.pct + "%");
    L.push("");
    L.push("RECRUITER SUMMARY");
    L.push(r.review.recruiterSummary);
    L.push("");
    L.push("STRENGTHS"); r.review.strengths.forEach(function (x) { L.push(" - " + x); });
    L.push(""); L.push("RISKS"); r.review.redFlags.forEach(function (x) { L.push(" - " + x); });
    L.push(""); L.push("SKILL GAPS (" + r.role + ")");
    L.push("Missing skills: " + (s.missingSkills.join(", ") || "none"));
    L.push("Missing tools: " + (s.missingTools.join(", ") || "none"));
    L.push("Missing certifications: " + (s.missingCerts.join(", ") || "none"));
    L.push(""); L.push("SECTION FEEDBACK");
    r.review.sectionFeedback.forEach(function (x) {
      L.push("[" + x.verdict + "] " + x.section); L.push("   " + x.feedback);
      if (x.action) L.push("   Action: " + x.action);
    });
    L.push(""); L.push("PROJECT EVALUATION");
    r.review.projectFeedback.forEach(function (x) {
      L.push("- " + x.project); L.push("   Complexity: " + x.complexity + " | Value: " + x.industryValue);
      if (x.betterTitle) L.push("   Suggested title: " + x.betterTitle);
      if (x.missingFeatures.length) L.push("   Missing: " + x.missingFeatures.join("; "));
      if (x.enhancements.length) L.push("   Enhance: " + x.enhancements.join("; "));
    });
    L.push(""); L.push("OPTIMIZATION TIPS");
    r.review.optimizationTips.forEach(function (x) { L.push(" - " + x); });

    var intel = r.intel || (window.PrepDeckRecruiter && window.PrepDeckRecruiter.build(r.parsed, r.scores, r.role));
    if (intel) {
      L.push(""); L.push("HR REVIEW SIMULATION");
      L.push("Score: " + intel.hr.overall + "/100 (" + intel.hr.verdict + ")");
      intel.hr.scores.forEach(function (x) { L.push("   " + x[0] + ": " + x[1]); });
      intel.hr.notes.forEach(function (x) { L.push(" - " + x); });
      L.push("Likely HR questions:");
      intel.hr.questions.forEach(function (x) { L.push("   * " + x); });

      L.push(""); L.push("TECHNICAL RECRUITER FEEDBACK");
      L.push("Score: " + intel.tech.overall + "/100 (" + intel.tech.verdict + ") — " + intel.tech.screenCall);
      intel.tech.scores.forEach(function (x) { L.push("   " + x[0] + ": " + x[1]); });
      intel.tech.notes.forEach(function (x) { L.push(" - " + x); });
      L.push("Expected probes:");
      intel.tech.probes.forEach(function (x) { L.push("   * " + x); });

      L.push(""); L.push("RESUME RANKING");
      L.push("Composite recruiter score: " + intel.rank.composite + "/100");
      L.push("Applicant percentile: " + intel.rank.percentile + " (" + intel.rank.band + ")");
      L.push("Estimated rank: #" + intel.rank.rank + " of " + intel.rank.pool + " applicants");
      L.push("Shortlist probability: " + intel.rank.shortlist + "%");

      L.push(""); L.push("COMPANY ELIGIBILITY ANALYSIS");
      intel.eligibility.forEach(function (c) {
        L.push("[" + c.status + "] " + c.name + " — fit " + c.fit + " / bar " + c.cutoff + " | skill coverage " + c.skillPct + "%");
        L.push("   Process: " + c.process);
        L.push("   Norm: " + c.cgpa);
        L.push("   " + c.insight);
        if (c.missing.length) L.push("   Gaps: " + c.missing.join(", "));
        c.prep.slice(0, 4).forEach(function (x) { L.push("   Prep: " + x); });
      });
    }
    return L.join("\n");
  }

  function downloadTxt() {
    if (!current) return;
    var blob = new Blob([summaryText()], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resume-analysis-" + new Date(current.date).toISOString().slice(0, 10) + ".txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadPdf() {
    if (!current) return;
    var ns = window.jspdf; if (!ns) return downloadTxt();
    var doc = new ns.jsPDF({ unit: "pt", format: "a4" });
    var W = 595, M = 46, y = 60;
    function text(str, size, bold, color) {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(color || "#12131a");
      doc.splitTextToSize(str, W - M * 2).forEach(function (line) {
        if (y > 780) { doc.addPage(); y = 60; }
        doc.text(line, M, y); y += size + 4;
      });
    }
    doc.setFillColor("#12131a"); doc.rect(0, 0, W, 40, "F");
    doc.setTextColor("#ffffff"); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("PrepDeck · Resume Analysis Report", M, 26);
    summaryText().split("\n").forEach(function (line) {
      if (!line.trim()) { y += 6; return; }
      var head = /^[A-Z][A-Z &()0-9-]+$/.test(line.trim());
      text(line, head ? 11 : 9.5, head, head ? "#ff5a3c" : "#12131a");
    });
    doc.save("resume-analysis-" + new Date(current.date).toISOString().slice(0, 10) + ".pdf");
  }

  /* ---------------- file handling ---------------- */
  function accept(file) {
    var hint = $("cvHint");
    var name = (file.name || "").toLowerCase();
    var isPdf = name.slice(-4) === ".pdf";
    var isDocx = name.slice(-5) === ".docx";
    if (!isPdf && !isDocx) { hint.textContent = "Unsupported file — upload a .pdf or .docx resume."; return; }
    if (file.size > 5 * 1024 * 1024) { hint.textContent = "File is larger than 5 MB."; return; }
    hint.textContent = "Reading " + file.name + "…";
    (isPdf ? readPdf(file) : readDocx(file))
      .then(function (text) {
        if (!text || text.replace(/\s/g, "").length < 120) throw new Error("Could not read enough text — the file may be a scanned image.");
        pending = { text: text, name: file.name, size: file.size };
        $("cvFileChip").hidden = false;
        $("cvFileName").textContent = file.name;
        $("cvFileMeta").textContent = Math.round(file.size / 1024) + " KB · " + text.trim().split(/\s+/).length + " words";
        $("cvPreviewCard").hidden = false;
        $("cvPreviewMeta").textContent = file.name;
        $("cvPreview").textContent = text.slice(0, 6000);
        $("cvAnalyse").disabled = false;
        hint.textContent = "Resume loaded — choose a target role and run the analysis.";
      })
      .catch(function (err) { hint.classList.add("err"); hint.textContent = err.message || "Could not read that file."; });
  }

  var SAMPLE = [
    "Ananya Sharma",
    "ananya.sharma@example.com | +91 98765 43210 | linkedin.com/in/ananyasharma | github.com/ananyasharma",
    "",
    "SUMMARY",
    "Final-year Computer Science student focused on full stack web development and scalable REST APIs.",
    "",
    "EDUCATION",
    "B.Tech Computer Science, Ravenshaw Institute of Technology, 2026 — CGPA 8.6/10",
    "Higher Secondary, DAV Public School, 2022 — 91%",
    "",
    "TECHNICAL SKILLS",
    "JavaScript, TypeScript, React, Node.js, Express, MongoDB, SQL, HTML, CSS, Tailwind, Git, Postman, Docker",
    "",
    "PROJECTS",
    "• CampusHire Portal — built a React and Node.js placement portal used by 400+ students, cut shortlisting time by 35%.",
    "• RouteWise — designed a REST API with JWT authentication and Redis caching, reduced average response time to 120ms.",
    "• DataPulse Dashboard — created an analytics dashboard with charting for 12 KPIs on a MongoDB dataset.",
    "",
    "INTERNSHIPS",
    "• Web Development Intern, Nexatech Solutions (Jun 2025 - Aug 2025) — shipped 6 production React components and fixed 40+ bugs.",
    "",
    "CERTIFICATIONS",
    "• Meta Front-End Developer Professional Certificate, 2025",
    "• AWS Certified Cloud Practitioner, 2024",
    "",
    "ACHIEVEMENTS",
    "• Finalist, Smart India Hackathon 2025 (top 1% of 900 teams).",
    "• Solved 450+ data structures and algorithms problems on LeetCode."
  ].join("\n");

  /* ---------------- panes ---------------- */
  function switchPane(name) {
    ["upload", "report", "trends"].forEach(function (p) {
      $("cvPane-" + p).hidden = p !== name;
    });
    document.querySelectorAll(".ctab").forEach(function (b) {
      b.classList.toggle("active", b.dataset.cvpane === name);
    });
    if (name === "trends") renderTrends();
  }

  /* ---------------- wiring ---------------- */
  var drop = $("cvDrop");
  drop.addEventListener("click", function () { $("cvFile").click(); });
  drop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("cvFile").click(); } });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
  });
  drop.addEventListener("drop", function (e) {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) accept(e.dataTransfer.files[0]);
  });
  $("cvFile").addEventListener("change", function (e) { if (e.target.files[0]) accept(e.target.files[0]); });
  $("cvClear").addEventListener("click", function () {
    pending = null; $("cvFile").value = "";
    $("cvFileChip").hidden = true; $("cvPreviewCard").hidden = true;
    $("cvHint").textContent = ""; $("cvHint").classList.remove("err");
  });
  $("cvSample").addEventListener("click", function () {
    pending = { text: SAMPLE, name: "sample-resume.txt", size: SAMPLE.length };
    $("cvFileChip").hidden = false;
    $("cvFileName").textContent = "Sample resume";
    $("cvFileMeta").textContent = SAMPLE.trim().split(/\s+/).length + " words";
    $("cvPreviewCard").hidden = false;
    $("cvPreviewMeta").textContent = "sample";
    $("cvPreview").textContent = SAMPLE;
    $("cvAnalyse").disabled = false;
    $("cvHint").textContent = "Sample resume loaded — run the analysis to see a full report.";
  });
  $("cvAnalyse").addEventListener("click", analyse);
  $("cvAnalyse").disabled = false;
  $("cvDownload").addEventListener("click", downloadPdf);
  $("cvDownloadTxt").addEventListener("click", downloadTxt);
  $("cvClearHistory").addEventListener("click", function () {
    if (!confirm("Clear all saved resume analyses?")) return;
    localStorage.removeItem(HKEY); localStorage.removeItem(LKEY);
    current = null; renderReport(); renderTrends();
  });
  document.querySelectorAll(".ctab").forEach(function (b) {
    b.addEventListener("click", function () { switchPane(b.dataset.cvpane); });
  });

  current = lastReport();
  renderReport();
  renderTrends();

  window.PrepDeckResume = {
    render: function () { renderReport(); renderTrends(); }
  };
})();
