/* PrepDeck — Career Intelligence: company tracks + career success dashboard (Local Storage only) */
(function () {
  "use strict";
  var CKEY = "prepdeck.career";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("page-career")) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function round(n) { return Math.round(n || 0); }
  function read(key, fb) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; } catch (e) { return fb; }
  }
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  /* ---------------- company tracks ---------------- */
  var TRACKS = [
    {
      id: "tcs", name: "TCS", tag: "NQT · Ninja & Digital",
      cutoffs: { aptitude: 60, technical: 55, interview: 60, resume: 65 },
      pattern: "TCS NQT: Numerical Ability, Verbal Ability, Reasoning Ability, plus Programming Logic and a Hands-on Coding section. Sectional timing with no back-navigation, so pace per section decides the score.",
      skills: ["Quantitative Aptitude (speed maths)", "Verbal Ability & email writing", "Logical Reasoning", "Programming Logic (pseudocode)", "C / Java / Python fundamentals", "DBMS basics", "Star pattern & string coding problems"],
      strategy: [
        "Clear sectional cut-offs first — TCS eliminates on sections, not just total score.",
        "Drill numerical ability daily for 45 minutes with a 60-second per question cap.",
        "Practise the email writing task with the given keyword list until it is under 8 minutes.",
        "Solve 2 coding questions daily in one language; TCS values a correct compiling solution over elegance.",
        "Revise pseudocode MCQs — output prediction and loop tracing dominate this section."
      ],
      mocks: [
        "Week 1: 2 sectional mocks (Numerical + Reasoning), 30 questions each",
        "Week 2: 2 full NQT-pattern mocks with sectional timers",
        "Week 3: 1 full mock + 10 coding problems on arrays, strings and patterns",
        "Week 4: 2 full mocks under exam conditions, target 75%+ in every section"
      ],
      interview: [
        "Round 1 — Technical: project deep-dive, one core subject (DBMS/OS), and code walkthrough.",
        "Round 2 — Managerial: situational judgement, relocation and shift flexibility, team conflict scenarios.",
        "Round 3 — HR: self-introduction, service-agreement awareness, long-term goals with TCS.",
        "Prepare a 2-minute introduction and 3 STAR stories on teamwork, deadline pressure and learning a new tool."
      ]
    },
    {
      id: "infosys", name: "Infosys", tag: "InfyTQ · System Engineer",
      cutoffs: { aptitude: 65, technical: 60, interview: 62, resume: 65 },
      pattern: "Infosys assessment: Mathematical Ability, Logical Reasoning, Verbal Ability and Pseudocode, followed by Puzzle Solving in the higher package tracks. Questions are lengthier and reasoning-heavy.",
      skills: ["Advanced puzzles & seating arrangement", "Data Interpretation", "Pseudocode reading", "Python or Java (InfyTQ certification)", "SQL queries and joins", "OOP concepts", "Basic Data Structures"],
      strategy: [
        "Puzzles carry the highest weight per question — solve 5 puzzles daily from seating, blood relation and floor-based sets.",
        "Take the InfyTQ certification path; certified candidates enter a faster interview pipeline.",
        "Practise SQL joins and aggregate queries — Infosys technical rounds ask them verbally.",
        "Build depth in one language rather than surface knowledge in three.",
        "Time management matters more than volume; reasoning sets need 3-4 minutes each."
      ],
      mocks: [
        "Week 1: Reasoning-heavy mock (puzzles + arrangements), 25 questions",
        "Week 2: Full Infosys-pattern mock with pseudocode section",
        "Week 3: SQL + OOP viva-style self-test, then 1 full mock",
        "Week 4: 2 full mocks plus one InfyTQ practice attempt"
      ],
      interview: [
        "Round 1 — Technical: language fundamentals, SQL query writing, OOP with examples from your project.",
        "Round 2 — HR / Managerial: adaptability, willingness to learn new stacks, location preference.",
        "Expect 'explain your project as if to a non-technical manager' — rehearse it out loud.",
        "Keep one strong project ready with architecture, database schema and your exact contribution."
      ]
    },
    {
      id: "wipro", name: "Wipro", tag: "Elite NLTH · Turbo",
      cutoffs: { aptitude: 58, technical: 55, interview: 58, resume: 60 },
      pattern: "Wipro Elite NLTH: Aptitude (Quant, Logical, Verbal), Written Communication essay, and two coding questions. The essay is scored on grammar, structure and word count.",
      skills: ["Quantitative Aptitude", "Logical Reasoning", "Written communication (essay)", "Coding in C/C++/Java/Python", "Arrays & string manipulation", "Basic OS & networking", "Cloud fundamentals (for Turbo track)"],
      strategy: [
        "Do not neglect the written essay — many eliminations happen there, not in aptitude.",
        "Write one 250-word essay every alternate day on a technology or social topic and self-check grammar.",
        "Coding section allows only two questions; accuracy beats speed, so dry-run before submitting.",
        "Revise percentages, profit-loss, time-and-work — Wipro repeats these families heavily.",
        "For the Turbo track, add basic cloud and DSA problem solving to the daily block."
      ],
      mocks: [
        "Week 1: Aptitude mock (30 questions) + 1 essay under 20 minutes",
        "Week 2: Full NLTH-pattern mock including the essay section",
        "Week 3: 2 coding sets (arrays, strings) + 1 aptitude mock",
        "Week 4: 2 full mocks; target essay score by peer or self-rubric review"
      ],
      interview: [
        "Round 1 — Technical: coding logic explanation, core subject basics, project questions.",
        "Round 2 — HR: bond and relocation questions, strengths and weaknesses with real examples.",
        "Be ready to explain the code you submitted in the online round line by line.",
        "Prepare a crisp answer on why Wipro and what you know about their service lines."
      ]
    },
    {
      id: "accenture", name: "Accenture", tag: "Associate SE",
      cutoffs: { aptitude: 62, technical: 55, interview: 65, resume: 68 },
      pattern: "Accenture assessment: Cognitive (Verbal, Analytical, Quantitative), Technical (Common Applications, MS Office, Pseudocode, Networking, Cloud, Security), Coding, and a Communication Assessment.",
      skills: ["Verbal ability & reading comprehension", "Analytical reasoning", "Pseudocode", "Networking & security basics", "Cloud fundamentals", "MS Office / common applications", "Spoken communication clarity"],
      strategy: [
        "The technical MCQ section is broad but shallow — revise networking, cloud, security and MS Office one-liners.",
        "Verbal ability weighs heavily; do 2 reading comprehension passages daily.",
        "The communication assessment scores pronunciation and fluency, so practise speaking aloud daily.",
        "Pseudocode questions follow the same loop-tracing patterns; drill 10 daily.",
        "Accenture screens strongly on profile consistency — keep marks, gaps and dates clean on the resume."
      ],
      mocks: [
        "Week 1: Cognitive mock (verbal + analytical), 40 questions",
        "Week 2: Technical MCQ mock covering networking, cloud and security",
        "Week 3: Full-pattern mock + recorded 3-minute spoken answer review",
        "Week 4: 2 full mocks and a communication assessment rehearsal"
      ],
      interview: [
        "Round 1 — Technical: pseudocode logic, one core subject, project explanation.",
        "Round 2 — HR: client-facing scenarios, flexibility, why consulting.",
        "Accenture values articulate communication over deep algorithms — rehearse structured spoken answers.",
        "Prepare examples showing client orientation, ownership and adaptability."
      ]
    },
    {
      id: "deloitte", name: "Deloitte", tag: "Analyst · Consulting & Tech",
      cutoffs: { aptitude: 70, technical: 65, interview: 70, resume: 75 },
      pattern: "Deloitte hiring: online assessment (quant, logical, verbal), a game-based or situational judgement test, a technical round and a case or behavioural interview. The bar on communication and business reasoning is high.",
      skills: ["Advanced quantitative aptitude", "Data interpretation & case analysis", "Situational judgement", "SQL & Excel analysis", "One programming language with DSA", "Business communication", "Consulting-style structured thinking"],
      strategy: [
        "Practise case-style reasoning: break a business problem into 3 structured buckets before answering.",
        "Data interpretation sets appear in both the test and the case round — do 2 sets daily.",
        "Sharpen SQL and Excel; analyst roles test them practically.",
        "Situational judgement rewards ethical, client-first, escalate-appropriately answers.",
        "Deloitte screens resumes hardest — target an ATS score above 80 with quantified impact bullets."
      ],
      mocks: [
        "Week 1: Quant + DI mock (35 questions) at high difficulty",
        "Week 2: Situational judgement set + full aptitude mock",
        "Week 3: One guesstimate/case practice with a peer + SQL practical test",
        "Week 4: 2 full mocks plus a recorded behavioural interview round"
      ],
      interview: [
        "Round 1 — Technical / Analyst: SQL, Excel, one language, project analytics depth.",
        "Round 2 — Case or guesstimate: structure the problem aloud, state assumptions, quantify.",
        "Round 3 — Behavioural / Partner: leadership, ethics, ambiguity handling with STAR stories.",
        "Prepare 5 STAR stories: leadership, failure, conflict, client impact and initiative."
      ]
    }
  ];

  /* ---------------- signals ---------------- */
  function signals() {
    var tests = read("prepdeck.attempts", []) || [];
    var R = read("prepdeck.reasoning", {}) || {};
    var rAttempts = R.attempts || [], rDays = R.days || {};
    var interviews = read("prepdeck.interviews", []) || [];
    var cv = read("prepdeck.resume.last", null);

    var pcts = tests.map(function (a) { return (a.score / a.total) * 100; });
    var avgScore = pcts.length ? pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length : 0;

    var total = rAttempts.length;
    var correct = rAttempts.filter(function (a) { return a.correct; }).length;
    var acc = total ? (correct / total) * 100 : 0;
    var secs = rAttempts.reduce(function (t, a) { return t + (a.seconds || 0); }, 0);
    var avgSeconds = total ? round(secs / total) : 0;

    var byCat = {};
    rAttempts.forEach(function (a) {
      var k = a.category || "General";
      var s = byCat[k] || (byCat[k] = { n: 0, c: 0 });
      s.n++; if (a.correct) s.c++;
    });
    var cats = Object.keys(byCat).map(function (k) {
      return { topic: k, n: byCat[k].n, acc: round((byCat[k].c / byCat[k].n) * 100) };
    }).sort(function (a, b) { return a.acc - b.acc; });

    var ivScores = interviews.map(function (i) { return Number(i.overall || (i.report && i.report.overall) || 0); })
      .filter(function (n) { return n > 0; });
    var ivAvg = ivScores.length ? round(ivScores.reduce(function (a, b) { return a + b; }, 0) / ivScores.length) : 0;

    var cvAts = cv && cv.scores ? round(cv.scores.overall || cv.scores.ats || 0) : (cv && cv.ats ? round(cv.ats) : 0);
    var missing = (cv && (cv.missing || cv.missingSkills)) || [];

    var activeDays = 0, i, d;
    for (i = 0; i < 14; i++) { d = new Date(); d.setDate(d.getDate() - i); if (rDays[dayKey(d.getTime())]) activeDays++; }
    var consistency = round((activeDays / 14) * 100);

    var streak = 0;
    for (i = 0; i < 60; i++) { d = new Date(); d.setDate(d.getDate() - i); if (rDays[dayKey(d.getTime())]) streak++; else if (i > 0) break; }

    var aptitude = round(avgScore * 0.6 + acc * 0.4);
    var technical = round(acc * 0.5 + (tests.length ? avgScore * 0.3 : 0) + clamp(total / 5, 0, 20));
    var interview = ivAvg;
    var resume = cvAts;
    var readiness = round(aptitude * 0.3 + technical * 0.25 + interview * 0.25 + resume * 0.2);

    return {
      tests: tests.length, avgScore: round(avgScore), reasoningAttempts: total, accuracy: round(acc),
      avgSeconds: avgSeconds, categories: cats, interviews: ivScores.length, interviewAvg: ivAvg,
      resumeAts: cvAts, missingSkills: missing.slice(0, 12), consistency: consistency, streak: streak,
      scores: { aptitude: aptitude, technical: clamp(technical, 0, 100), interview: interview, resume: resume, readiness: readiness },
      weak: cats.filter(function (c) { return c.acc < 65; }).slice(0, 5).map(function (c) { return c.topic; }),
      strong: cats.filter(function (c) { return c.acc >= 75; }).slice(0, 4).map(function (c) { return c.topic; })
    };
  }

  /* ---------------- scoring ---------------- */
  function fitFor(track, sig) {
    var s = sig.scores, c = track.cutoffs;
    function ratio(v, cut) { return clamp(v / cut, 0, 1.15); }
    var parts = [
      { label: "Aptitude", value: s.aptitude, cut: c.aptitude, w: 0.3 },
      { label: "Technical", value: s.technical, cut: c.technical, w: 0.25 },
      { label: "Interview", value: s.interview, cut: c.interview, w: 0.25 },
      { label: "Resume", value: s.resume, cut: c.resume, w: 0.2 }
    ];
    var fit = round(parts.reduce(function (t, p) { return t + ratio(p.value, p.cut) * p.w * 100; }, 0));
    fit = clamp(fit, 0, 100);
    var status = fit >= 85 ? "Ready to apply" : fit >= 65 ? "Close — targeted work needed" : fit >= 45 ? "Developing" : "Not eligible yet";
    var gapsList = parts.filter(function (p) { return p.value < p.cut; })
      .map(function (p) { return p.label + " at " + p.value + " vs " + p.cut + " benchmark (" + (p.cut - p.value) + " point gap)"; });
    return { fit: fit, status: status, parts: parts, gaps: gapsList };
  }

  function probability(sig) {
    var s = sig.scores;
    var base = s.readiness * 0.62 + sig.consistency * 0.12 +
      clamp(sig.reasoningAttempts / 6, 0, 14) + clamp(sig.interviews * 4, 0, 12);
    return clamp(round(base), 0, 97);
  }
  function skillIndex(sig) {
    var s = sig.scores;
    var coverage = clamp(sig.categories.length * 8, 0, 40);
    var depth = clamp(round(sig.accuracy * 0.4), 0, 40);
    var breadthPenalty = clamp(sig.missingSkills.length * 2, 0, 15);
    return clamp(round(coverage + depth + s.technical * 0.2 - breadthPenalty), 0, 100);
  }
  function interviewPredictor(sig) {
    var s = sig.scores;
    if (!sig.interviews) return clamp(round(s.technical * 0.4 + s.aptitude * 0.3 + s.resume * 0.1), 0, 70);
    var speed = clamp(round((45 / Math.max(8, sig.avgSeconds)) * 100), 0, 100);
    return clamp(round(s.interview * 0.5 + s.technical * 0.2 + speed * 0.1 + s.resume * 0.1 + clamp(sig.interviews * 3, 0, 10)), 0, 97);
  }
  function band(v) { return v >= 85 ? "Placement Ready" : v >= 65 ? "Advanced" : v >= 40 ? "Intermediate" : "Beginner"; }

  function roadmap(sig, best) {
    var out = [];
    var weak = sig.weak[0] || "Quantitative Aptitude";
    if (sig.scores.aptitude < 65) out.push({ phase: "Phase 1 · Weeks 1-2", focus: "Aptitude floor", detail: "Raise " + weak + " and quant speed to 65+. 40 timed questions daily, error log after every session." });
    else out.push({ phase: "Phase 1 · Weeks 1-2", focus: "Aptitude maintenance", detail: "Hold " + sig.scores.aptitude + " with 20 mixed questions daily and shift hours to weaker pillars." });
    if (sig.scores.technical < 65) out.push({ phase: "Phase 2 · Weeks 3-4", focus: "Technical depth", detail: "Cover DSA basics, DBMS and OOP; attempt 2 coding problems daily and revise " + (sig.weak[1] || "reasoning categories") + "." });
    else out.push({ phase: "Phase 2 · Weeks 3-4", focus: "Technical polish", detail: "Move to medium-hard problems and be able to explain complexity aloud." });
    if (sig.scores.resume < 75) out.push({ phase: "Phase 3 · Week 5", focus: "Profile readiness", detail: "Lift ATS to 80+: quantify every bullet, add " + (sig.missingSkills.slice(0, 3).join(", ") || "role-specific keywords") + "." });
    else out.push({ phase: "Phase 3 · Week 5", focus: "Profile tailoring", detail: "Create one resume variant per target company using their job description keywords." });
    out.push({
      phase: "Phase 4 · Weeks 6-8", focus: "Company simulation",
      detail: "Run " + best.name + "-pattern mocks weekly and 2 interview rounds per week until the interview predictor crosses 75."
    });
    return out;
  }

  /* ---------------- store ---------------- */
  var store = (function () {
    var s = read(CKEY, {}) || {};
    return { track: s.track || "tcs", saved: s.saved || {} };
  })();
  function saveStore() { try { localStorage.setItem(CKEY, JSON.stringify(store)); } catch (e) { /* quota */ } }

  /* ---------------- render ---------------- */
  var radar = null;

  function renderDashboard(sig, fits) {
    var prob = probability(sig), idx = skillIndex(sig), pred = interviewPredictor(sig);
    $("crRing").style.setProperty("--p", prob);
    $("crProb").textContent = prob;
    $("crBand").textContent = band(prob) + " · placement probability " + prob + "%";
    $("crBandNote").textContent = sig.tests || sig.reasoningAttempts
      ? "Computed from " + sig.tests + " aptitude test(s), " + sig.reasoningAttempts + " reasoning attempts, " +
        sig.interviews + " interview round(s) and an ATS score of " + (sig.resumeAts || "not measured") + "."
      : "No activity recorded yet. Complete a test, a reasoning session and a resume analysis to unlock accurate predictions.";

    var cards = [
      ["Placement probability", prob + "%", band(prob)],
      ["Skill readiness index", idx + "/100", sig.categories.length + " categories covered"],
      ["Interview success predictor", pred + "%", sig.interviews ? sig.interviews + " rounds analysed" : "Estimated — no rounds yet"],
      ["Aptitude readiness", sig.scores.aptitude + "/100", band(sig.scores.aptitude)],
      ["Technical readiness", sig.scores.technical + "/100", band(sig.scores.technical)],
      ["Profile strength", sig.scores.resume + "/100", sig.resumeAts ? "ATS measured" : "Run a resume analysis"]
    ];
    $("crMetrics").innerHTML = cards.map(function (c) {
      return '<article class="stat"><span>' + esc(c[0]) + "</span><strong>" + esc(c[1]) + "</strong><small>" + esc(c[2]) + "</small></article>";
    }).join("");

    var best = fits.slice().sort(function (a, b) { return b.fit - a.fit; })[0];
    $("crRoadmap").innerHTML = roadmap(sig, best.track).map(function (p) {
      return '<article class="card sub"><span class="pill">' + esc(p.phase) + "</span><b>" + esc(p.focus) + "</b><small>" + esc(p.detail) + "</small></article>";
    }).join("");

    var cv = $("crRadar");
    if (cv && window.Chart) {
      if (radar) radar.destroy();
      radar = new window.Chart(cv, {
        type: "radar",
        data: {
          labels: fits.map(function (f) { return f.track.name; }),
          datasets: [{
            label: "Company fit %", data: fits.map(function (f) { return f.fit; }),
            backgroundColor: "rgba(255,90,60,.22)", borderColor: "#ff5a3c", pointBackgroundColor: "#ff5a3c"
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 25 } } }
        }
      });
    }
  }

  function renderTrackList(fits) {
    $("crTracks").innerHTML = fits.map(function (f) {
      var cls = f.fit >= 85 ? "pill-ok" : f.fit >= 65 ? "pill-mid" : "pill-bad";
      return '<button class="cr-track' + (store.track === f.track.id ? " on" : "") + '" data-track="' + f.track.id + '">' +
        "<b>" + esc(f.track.name) + "</b><small>" + esc(f.track.tag) + "</small>" +
        '<div class="bar slim"><i style="width:' + f.fit + '%"></i></div>' +
        '<span class="pill ' + cls + '">' + f.fit + "% fit</span></button>";
    }).join("");
    $("crTracks").querySelectorAll("[data-track]").forEach(function (b) {
      b.addEventListener("click", function () { store.track = b.dataset.track; saveStore(); render(); });
    });
  }

  function bullets(items) {
    return '<ul class="sp-mini">' + (items || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }
  function chips(items, cls) {
    if (!items || !items.length) return '<p class="muted">Nothing flagged.</p>';
    return '<div class="chips">' + items.map(function (x) {
      return '<span class="chip' + (cls ? " " + cls : "") + '">' + esc(x) + "</span>";
    }).join("") + "</div>";
  }

  function renderTrack(sig, fits) {
    var f = fits.filter(function (x) { return x.track.id === store.track; })[0] || fits[0];
    var t = f.track;
    $("crTrackTitle").textContent = t.name + " preparation track";
    $("crTrackTag").textContent = t.tag + " · " + t.pattern;
    $("crTrackFit").textContent = f.fit + "% fit · " + f.status;
    $("crTrackFit").className = "pill " + (f.fit >= 85 ? "pill-ok" : f.fit >= 65 ? "pill-mid" : "pill-bad");

    $("crBenchmarks").innerHTML = f.parts.map(function (p) {
      var ok = p.value >= p.cut;
      return '<div class="cr-bench"><small>' + esc(p.label) + "</small>" +
        '<div class="bar slim"><i style="width:' + clamp(round((p.value / p.cut) * 100), 0, 100) + '%"></i></div>' +
        "<b>" + p.value + " / " + p.cut + "</b>" +
        '<span class="pill ' + (ok ? "pill-ok" : "pill-bad") + '">' + (ok ? "Meets bar" : "Below bar") + "</span></div>";
    }).join("");

    var focus = sig.weak.length ? sig.weak.slice(0, 3) : ["Quantitative Aptitude", "Logical Reasoning"];
    $("crTrackBody").innerHTML =
      "<div class='sp-grid2'>" +
      "<div><h4>Required skills</h4>" + chips(t.skills, "hot") + "</div>" +
      "<div><h4>Your gaps for " + esc(t.name) + "</h4>" +
        (f.gaps.length ? bullets(f.gaps) : '<p class="muted">You clear every published benchmark for this track.</p>') +
      "</div></div>" +
      "<div class='sp-grid2'>" +
      "<div><h4>Preparation strategy</h4>" + bullets(t.strategy.concat([
        "Personalised: give " + focus[0] + " the first block of every study day until it clears the " + t.cutoffs.aptitude + " benchmark."
      ])) + "</div>" +
      "<div><h4>Mock test plan</h4>" + bullets(t.mocks) + "</div>" +
      "</div>" +
      "<h4>Interview preparation roadmap</h4>" + bullets(t.interview.concat([
        sig.interviews ? "Your interview average is " + sig.interviewAvg + "/100 — run " +
          Math.max(1, Math.ceil((t.cutoffs.interview - sig.interviewAvg) / 6)) + " more practice round(s) before applying."
          : "No interview rounds recorded — complete at least 3 in the Interview Practice module before the " + t.name + " drive."
      ]));
  }

  function report(sig, fits) {
    var prob = probability(sig), idx = skillIndex(sig), pred = interviewPredictor(sig);
    var L = ["PrepDeck — CAREER SUCCESS REPORT", new Date().toLocaleString(), "",
      "CAREER SUCCESS DASHBOARD",
      "  Placement probability: " + prob + "% (" + band(prob) + ")",
      "  Skill readiness index: " + idx + "/100",
      "  Interview success predictor: " + pred + "%",
      "  Aptitude " + sig.scores.aptitude + " | Technical " + sig.scores.technical +
        " | Interview " + sig.scores.interview + " | Resume " + sig.scores.resume, "",
      "COMPANY ELIGIBILITY"];
    fits.slice().sort(function (a, b) { return b.fit - a.fit; }).forEach(function (f) {
      L.push("  " + f.track.name + " — " + f.fit + "% fit · " + f.status);
      f.gaps.forEach(function (g) { L.push("      gap: " + g); });
    });
    var best = fits.slice().sort(function (a, b) { return b.fit - a.fit; })[0];
    L.push("", best.track.name.toUpperCase() + " TRACK — REQUIRED SKILLS");
    best.track.skills.forEach(function (s) { L.push("  - " + s); });
    L.push("", "PREPARATION STRATEGY");
    best.track.strategy.forEach(function (s) { L.push("  - " + s); });
    L.push("", "MOCK TEST PLAN");
    best.track.mocks.forEach(function (s) { L.push("  - " + s); });
    L.push("", "INTERVIEW PREPARATION ROADMAP");
    best.track.interview.forEach(function (s) { L.push("  - " + s); });
    L.push("", "PERSONALISED IMPROVEMENT ROADMAP");
    roadmap(sig, best.track).forEach(function (p) { L.push("  " + p.phase + " — " + p.focus + ": " + p.detail); });
    return L.join("\n");
  }

  function render() {
    var sig = signals();
    var fits = TRACKS.map(function (t) {
      var f = fitFor(t, sig); f.track = t; return f;
    });
    renderDashboard(sig, fits);
    renderTrackList(fits);
    renderTrack(sig, fits);
    store.saved = { updated: Date.now(), probability: probability(sig), index: skillIndex(sig), predictor: interviewPredictor(sig) };
    saveStore();
  }

  $("crDownload").addEventListener("click", function () {
    var sig = signals();
    var fits = TRACKS.map(function (t) { var f = fitFor(t, sig); f.track = t; return f; });
    var blob = new Blob([report(sig, fits)], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prepdeck-career-report.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("crRefresh").addEventListener("click", render);

  window.PrepDeckCareer = { render: render };
  render();
})();
