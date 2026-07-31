/* PrepDeck — Intelligent Study Planning System (Local Storage only) */
(function () {
  "use strict";
  var PKEY = "prepdeck.planner";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("page-plan")) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function round(n) { return Math.round(n || 0); }
  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function todayKey() { return dayKey(Date.now()); }
  function read(key, fb) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; } catch (e) { return fb; }
  }

  /* ---------------- store ---------------- */
  var DEFAULT_GOALS = {
    company: "", role: "Software Engineer", date: "", hours: 3, weekGoal: 150, dayGoal: 25
  };
  function loadStore() {
    var s = read(PKEY, {}) || {};
    return {
      goals: Object.assign({}, DEFAULT_GOALS, s.goals || {}),
      plan: s.plan || null,
      planDate: s.planDate || "",
      planSource: s.planSource || "",
      progress: s.progress || {},   /* dayKey -> { taskIndex: true } */
      minutes: s.minutes || {},     /* dayKey -> minutes studied */
      history: s.history || []      /* [{date, readiness, completion}] */
    };
  }
  function saveStore() { try { localStorage.setItem(PKEY, JSON.stringify(store)); } catch (e) { /* quota */ } }
  var store = loadStore();

  /* ---------------- signal aggregation ---------------- */
  function signals() {
    var tests = read("prepdeck.attempts", []) || [];
    var R = read("prepdeck.reasoning", {}) || {};
    var rAttempts = R.attempts || [], rDays = R.days || {}, bookmarks = R.bookmarks || [];
    var interviews = read("prepdeck.interviews", []) || [];
    var cv = read("prepdeck.resume.last", null);

    /* aptitude / test performance */
    var pcts = tests.map(function (a) { return (a.score / a.total) * 100; });
    var avgScore = pcts.length ? pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length : 0;
    var byTopic = {};
    tests.forEach(function (a) {
      (byTopic[a.topic] = byTopic[a.topic] || []).push((a.score / a.total) * 100);
    });
    var testTopics = Object.keys(byTopic).map(function (t) {
      var v = byTopic[t];
      return { topic: t, avg: round(v.reduce(function (a, b) { return a + b; }, 0) / v.length), n: v.length };
    }).sort(function (a, b) { return a.avg - b.avg; });

    /* reasoning */
    var total = rAttempts.length;
    var correct = rAttempts.filter(function (a) { return a.correct; }).length;
    var acc = total ? (correct / total) * 100 : 0;
    var secs = rAttempts.reduce(function (t, a) { return t + (a.seconds || 0); }, 0);
    var avgTime = total ? secs / total : 0;
    var byCat = {};
    rAttempts.forEach(function (a) {
      var k = a.category || "General";
      var s = byCat[k] || (byCat[k] = { n: 0, c: 0, secs: 0 });
      s.n++; if (a.correct) s.c++; s.secs += a.seconds || 0;
    });
    var cats = Object.keys(byCat).map(function (k) {
      return { topic: k, n: byCat[k].n, acc: round((byCat[k].c / byCat[k].n) * 100), avg: round(byCat[k].secs / byCat[k].n) };
    }).sort(function (a, b) { return a.acc - b.acc; });

    /* consistency + streak */
    var i, d, activeDays = 0;
    for (i = 0; i < 14; i++) { d = new Date(); d.setDate(d.getDate() - i); if (rDays[dayKey(d.getTime())] || store.minutes[dayKey(d.getTime())]) activeDays++; }
    var consistency = round((activeDays / 14) * 100);
    var streak = 0; d = new Date();
    if (!rDays[dayKey(d.getTime())] && !store.minutes[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
    while (rDays[dayKey(d.getTime())] || store.minutes[dayKey(d.getTime())]) { streak++; d.setDate(d.getDate() - 1); }

    /* learning speed: recent 20 vs previous 20 accuracy delta */
    var recent = rAttempts.slice(-20), prev = rAttempts.slice(-40, -20);
    function pa(l) { return l.length ? (l.filter(function (a) { return a.correct; }).length / l.length) * 100 : 0; }
    var trend = (recent.length >= 5 && prev.length >= 5) ? round(pa(recent) - pa(prev)) : null;

    /* interviews */
    var ivN = interviews.length;
    var ivAvg = ivN ? round(interviews.reduce(function (s2, x) { return s2 + (x.report ? x.report.overall : 0); }, 0) / ivN) : 0;
    var ivTech = ivN ? round(interviews.reduce(function (s2, x) { return s2 + (x.report ? x.report.technical || 0 : 0); }, 0) / ivN) : 0;
    var ivComm = ivN ? round(interviews.reduce(function (s2, x) { return s2 + (x.report ? x.report.communication || 0 : 0); }, 0) / ivN) : 0;

    /* resume */
    var cvScores = cv && cv.scores ? cv.scores : null;
    var cvAts = cvScores ? round(cvScores.ats) : 0;
    var missingSkills = cvScores ? (cvScores.missingSkills || []).slice(0, 10) : [];

    /* readiness scores */
    var aptitude = round(clamp(avgScore * 0.6 + acc * 0.4, 0, 100));
    var technical = round(clamp(
      (testTopics.length ? avgScore : acc) * 0.45 + (ivTech || acc) * 0.3 + (cvAts || 40) * 0.25, 0, 100));
    var interview = ivN ? round(clamp(ivAvg * 0.7 + ivComm * 0.3, 0, 100)) : 0;
    var resume = cvAts;
    var engagement = round(consistency * 0.6 + clamp((total / 200) * 100, 0, 100) * 0.4);
    var readiness = round(clamp(
      aptitude * 0.30 + technical * 0.25 + (interview || aptitude * 0.6) * 0.20 +
      (resume || 35) * 0.10 + engagement * 0.15, 0, 100));
    var band = readiness >= 85 ? "Placement Ready" : readiness >= 65 ? "Advanced" : readiness >= 40 ? "Intermediate" : "Beginner";

    /* weekly minutes */
    var weekMinutes = 0, weekQuestions = 0;
    for (i = 0; i < 7; i++) {
      d = new Date(); d.setDate(d.getDate() - i);
      weekMinutes += store.minutes[dayKey(d.getTime())] || 0;
      weekQuestions += rDays[dayKey(d.getTime())] || 0;
    }

    return {
      tests: tests.length, avgScore: round(avgScore), testTopics: testTopics,
      reasoningAttempts: total, accuracy: round(acc), avgSeconds: round(avgTime), categories: cats,
      bookmarks: bookmarks.length, consistency: consistency, streak: streak, trend: trend,
      interviews: ivN, interviewAvg: ivAvg, interviewTech: ivTech, interviewComm: ivComm,
      resumeAts: cvAts, resumeRole: cv ? cv.role : "", missingSkills: missingSkills,
      scores: { aptitude: aptitude, technical: technical, interview: interview, resume: resume, readiness: readiness },
      band: band, weekMinutes: weekMinutes, weekQuestions: weekQuestions,
      weak: cats.filter(function (c) { return c.acc < 65; }).slice(0, 5).map(function (c) { return c.topic; })
        .concat(testTopics.filter(function (t) { return t.avg < 65; }).slice(0, 3).map(function (t) { return t.topic; })),
      strong: cats.filter(function (c) { return c.acc >= 75; }).slice(0, 4).map(function (c) { return c.topic; })
        .concat(testTopics.filter(function (t) { return t.avg >= 75; }).slice(0, 3).map(function (t) { return t.topic; }))
    };
  }

  /* ---------------- deterministic plan builder (offline engine) ---------------- */
  function localPlan(sig, goals) {
    var mins = Math.round(goals.hours * 60);
    var weak = sig.weak.length ? sig.weak : ["Logical Reasoning", "Quantitative Aptitude", "Data Structures"];
    var strong = sig.strong.length ? sig.strong : ["General revision"];
    var allCats = (window.ReasoningBank && window.ReasoningBank.CATEGORIES) || [];
    var untouched = allCats.filter(function (c) {
      return !sig.categories.some(function (x) { return x.topic === c; });
    });
    var company = goals.company || "your target companies";
    var tasks = [];
    function add(title, type, topic, share, priority, target, why) {
      tasks.push({
        title: title, type: type, topic: topic, minutes: Math.max(15, Math.round(mins * share)),
        priority: priority, target: target, why: why
      });
    }
    add("Deep practice — " + weak[0], "Practice", weak[0], 0.28, "High",
      "30 questions at ≥70% accuracy",
      sig.categories[0] ? "Lowest accuracy area in your practice history (" + sig.categories[0].acc + "% accuracy)." : "No practice history yet — this is the standard starting block for placement aptitude.");
    add("Concept rebuild — " + (weak[1] || weak[0]), "Concept", weak[1] || weak[0], 0.18, "High",
      "Write your own 1-page method sheet",
      "Errors here look conceptual rather than careless, so revise the method before drilling volume.");
    add("Timed drill — speed under pressure", "Practice", weak[2] || weak[0], 0.16, "Medium",
      "20 questions under " + Math.max(35, 60 - Math.round(sig.accuracy / 4)) + "s each",
      (sig.avgSeconds ? "Your average solve time is " + sig.avgSeconds + "s; placement papers demand faster recall." : "Speed work from day one keeps pace with real placement papers."));
    add("Spaced revision — " + strong[0], "Revision", strong[0], 0.12, "Low",
      "15 mixed questions, no notes",
      "Maintenance pass so a strong area does not decay while you fix weak ones.");
    if (sig.interviews < 3 || sig.interviewAvg < 70) {
      add("Interview practice round", "Interview", "Communication", 0.14, sig.interviews ? "Medium" : "High",
        "One full round with structured STAR answers",
        sig.interviews ? "Interview average is " + sig.interviewAvg + "/100 — communication needs reps." :
          "No interview rounds recorded yet; start the speaking habit early.");
    } else {
      add("Mock aptitude test", "Mock Test", "Mixed", 0.14, "Medium", "Full-length paper, target " + Math.min(90, sig.avgScore + 8) + "%",
        "Interview scores are healthy — shift load to full-length test stamina.");
    }
    if (sig.resumeAts < 75) {
      add("Resume improvement block", "Resume", "Profile", 0.12, sig.resumeAts ? "Medium" : "High",
        "Rewrite 3 bullets with metrics",
        "ATS score is " + (sig.resumeAts || "not measured") + " — shortlisting depends on it before any test.");
    } else {
      add("Revision of incorrect questions", "Revision", "Error log", 0.12, "Medium",
        "Clear 20 previously wrong questions",
        "Re-attempting errors is the highest-yield hour in your week.");
    }

    var readiness = sig.scores.readiness;
    var weekly = {
      theme: readiness < 40 ? "Build fundamentals and a daily habit"
        : readiness < 65 ? "Convert practice volume into accuracy"
          : readiness < 85 ? "Simulate real placement conditions" : "Hold peak form and polish delivery",
      goals: [
        "Complete " + goals.weekGoal + " practice questions across at least 5 days",
        "Raise " + weak[0] + " accuracy by 8 percentage points",
        "Attempt " + (readiness < 50 ? 1 : 2) + " full-length mock test(s)",
        "Log " + Math.round(goals.hours * 6) + " study hours this week",
        sig.interviews < 4 ? "Complete 2 interview practice rounds" : "Review one interview transcript and rewrite weak answers"
      ],
      milestones: weak.slice(0, 4).map(function (t, i) {
        var cat = sig.categories.filter(function (c) { return c.topic === t; })[0];
        return {
          topic: t,
          milestone: (i === 0 ? "Master " : "Stabilise ") + t + " with " + (40 - i * 8) + " fresh questions",
          benchmark: "Target accuracy " + Math.min(90, (cat ? cat.acc : 55) + 12) + "% at ≤" + Math.max(40, 70 - i * 5) + "s per question"
        };
      }),
      skillTargets: [
        "Pattern recognition speed in " + weak[0],
        "Structured verbal answers using situation → action → result",
        sig.missingSkills.length ? "Hands-on evidence for " + sig.missingSkills.slice(0, 3).join(", ") : "Deeper project detail on your resume",
        untouched.length ? "First exposure to " + untouched.slice(0, 2).join(" and ") : "Cross-category mixed practice"
      ]
    };

    var monthly = {
      objective: "Move from " + sig.band + " to " + (readiness < 40 ? "Intermediate" : readiness < 65 ? "Advanced" : "Placement Ready") +
        " readiness for " + company + " by covering weak areas first, then full-process simulation.",
      phases: [
        { week: "Week 1", focus: "Fundamentals in " + weak.slice(0, 2).join(" and "), outcome: "Method sheets written, accuracy above 60% in both" },
        { week: "Week 2", focus: "Volume practice plus timed drills across all categories", outcome: goals.weekGoal + "+ questions completed, solve time down 20%" },
        { week: "Week 3", focus: "Full-length mocks and error-log revision", outcome: "Two mocks attempted with a documented error review" },
        { week: "Week 4", focus: "Interview rounds, resume finalisation and company pattern practice", outcome: "Interview score above 70 and ATS score above 80" }
      ],
      milestones: [
        "Placement readiness score above " + Math.min(95, readiness + 15),
        "Every reasoning category attempted at least once",
        "Resume cleared for " + company + " screening filters",
        "At least 4 recorded interview rounds with rising scores"
      ],
      interviewTimeline: [
        "Days 1-7: HR and self-introduction rounds, refine your two-minute pitch",
        "Days 8-14: Technical rounds on core subjects and your strongest project",
        "Days 15-21: Company-pattern rounds for " + company,
        "Days 22-30: Full mock panels with report review after each"
      ]
    };

    var gaps = {
      weakAreas: sig.categories.filter(function (c) { return c.acc < 65; }).slice(0, 6)
        .map(function (c) { return c.topic + " — " + c.acc + "% accuracy over " + c.n + " questions"; }),
      missingSkills: sig.missingSkills.length ? sig.missingSkills : ["Run a resume analysis to detect missing role skills"],
      knowledgeGaps: untouched.length ? untouched.slice(0, 6).map(function (c) { return c + " — never attempted"; })
        : ["All categories attempted; gaps are now depth rather than coverage"],
      highPriority: weak.slice(0, 3),
      mediumPriority: sig.categories.filter(function (c) { return c.acc >= 65 && c.acc < 78; }).slice(0, 4).map(function (c) { return c.topic; }),
      revision: strong.slice(0, 4)
    };

    var recommendations = {
      nextTopics: weak.slice(0, 4),
      mockTests: [
        (readiness < 50 ? "Easy" : readiness < 75 ? "Medium" : "Hard") + " level aptitude test — 30 questions",
        "Mixed reasoning practice — all categories",
        company !== "your target companies" ? company + " pattern mock" : "Company pattern mock (pick a target first)"
      ],
      reasoningCategories: sig.categories.slice(0, 4).map(function (c) { return c.topic + " (" + c.acc + "%)"; }),
      aptitudeChapters: sig.testTopics.slice(0, 4).map(function (t) { return t.topic + " (" + t.avg + "%)"; })
    };

    var adaptation = [];
    adaptation.push(sig.trend == null ? "Not enough history yet to measure learning speed — the plan will adapt after 40 practice questions."
      : sig.trend >= 5 ? "Accuracy improved " + sig.trend + " points recently, so difficulty has been stepped up."
        : sig.trend <= -5 ? "Accuracy dropped " + Math.abs(sig.trend) + " points, so revision minutes were increased over new material."
          : "Performance is stable — the plan keeps a balanced practice-to-revision ratio.");
    adaptation.push("Consistency is " + sig.consistency + "% over 14 days" +
      (sig.consistency < 50 ? ", so tasks were shortened to make daily completion realistic." : ", so daily load was kept at full length."));
    adaptation.push(sig.avgSeconds > 60 ? "Average solve time of " + sig.avgSeconds + "s triggered an extra timed drill block."
      : "Solve speed is competitive; minutes were redirected to accuracy work.");
    adaptation.push(sig.streak >= 3 ? "A " + sig.streak + "-day streak is active — momentum tasks were added to protect it."
      : "Streak has broken; the plan starts with the shortest task to make restarting easy.");

    return {
      headline: weekly.theme + " · " + goals.hours + "h per day",
      rationale: "Built from " + sig.reasoningAttempts + " reasoning attempts, " + sig.tests + " logged tests, " +
        sig.interviews + " interview rounds and " + (sig.resumeAts ? "an ATS score of " + sig.resumeAts : "no resume analysis yet") + ".",
      dailyTasks: tasks, weekly: weekly, monthly: monthly, gaps: gaps,
      recommendations: recommendations, adaptation: adaptation,
      insights: [
        "Readiness " + readiness + "/100 (" + sig.band + ") — " + (100 - readiness) + " points from a perfect profile.",
        "Strongest signal: " + (strong[0] || "not established yet") + ". Weakest: " + weak[0] + ".",
        "This week you logged " + Math.round(sig.weekMinutes / 60 * 10) / 10 + " study hours and " + sig.weekQuestions + " questions."
      ]
    };
  }

  /* ---------------- generation ---------------- */
  function status(msg, warn) {
    var h = $("spStatus");
    h.style.color = warn ? "var(--warn)" : "var(--muted)";
    h.textContent = msg || "";
  }

  function generate() {
    var btn = $("spGenerate");
    var sig = signals();
    var goals = store.goals;
    btn.disabled = true; btn.classList.add("loading");
    status("Analysing your performance and building a personalised programme…");

    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 60000);

    fetch("/api/public/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signals: sig, goals: goals, hours: goals.hours }),
      signal: ctrl.signal
    }).then(function (r) {
      if (!r.ok) throw new Error("plan");
      return r.json();
    }).then(function (plan) {
      if (!plan || !plan.dailyTasks || !plan.dailyTasks.length) throw new Error("empty");
      commit(plan, "personalised");
      status("Plan generated from your latest performance data.");
    }).catch(function () {
      commit(localPlan(sig, goals), "offline");
      status("Plan generated locally from your stored performance data.", true);
    }).then(function () {
      clearTimeout(to);
      btn.disabled = false; btn.classList.remove("loading");
    });
  }

  function commit(plan, source) {
    store.plan = plan;
    store.planDate = todayKey();
    store.planSource = source;
    store.progress[todayKey()] = store.progress[todayKey()] || {};
    saveStore();
    render();
  }

  /* ---------------- rendering ---------------- */
  var hoursChart = null;

  function render() {
    var sig = signals();
    renderBanner(sig);
    renderGoals(sig);
    renderMetrics(sig);
    renderToday(sig);
    renderRecs(sig);
    renderGaps(sig);
    renderWeekly(sig);
    renderProductivity(sig);
    renderMonthly(sig);
    renderAdaptive(sig);
    renderReport(sig);
  }

  function renderBanner(sig) {
    var s = sig.scores;
    $("spReadiness").textContent = s.readiness;
    $("spRing").style.setProperty("--p", s.readiness + "%");
    $("spBand").textContent = sig.band;
    $("spHeadline").textContent = store.plan ? store.plan.headline + " — " + (store.plan.rationale || "")
      : "No plan yet. Set your goals and generate a personalised preparation programme.";
    [["spApt", "spBarApt", s.aptitude], ["spTech", "spBarTech", s.technical],
    ["spIv", "spBarIv", s.interview], ["spCv", "spBarCv", s.resume]].forEach(function (x) {
      $(x[0]).textContent = x[2];
      $(x[1]).style.width = x[2] + "%";
    });
  }

  function renderGoals() {
    var g = store.goals;
    $("spCompany").value = g.company;
    $("spRole").value = g.role;
    $("spDate").value = g.date;
    $("spHours").value = g.hours;
    $("spWeekGoal").value = g.weekGoal;
    $("spDayGoal").value = g.dayGoal;
    var c = $("spCountdown");
    if (g.date) {
      var days = Math.ceil((new Date(g.date + "T00:00:00").getTime() - Date.now()) / 86400000);
      c.textContent = days >= 0
        ? days + " day(s) to " + (g.company || "target date") + " · " + Math.max(1, Math.ceil(days / 7)) + " week(s) of runway"
        : "Target date has passed — set a new one";
    } else c.textContent = "No target date set";
  }

  function renderMetrics(sig) {
    var tasks = todayTasks(), done = doneCount(tasks);
    var completion = tasks.length ? round((done / tasks.length) * 100) : 0;
    var eff = sig.reasoningAttempts ? clamp(round(sig.accuracy * 0.6 + clamp((45 / Math.max(8, sig.avgSeconds)) * 100, 0, 100) * 0.4), 0, 100) : 0;
    var cards = [
      ["Placement readiness", sig.scores.readiness + "/100", sig.band],
      ["Study hours (7d)", (Math.round(sig.weekMinutes / 6) / 10) + " h", "Goal " + Math.round(store.goals.hours * 7) + " h"],
      ["Daily streak", sig.streak + " day" + (sig.streak === 1 ? "" : "s"), "Consistency " + sig.consistency + "%"],
      ["Task completion", completion + "%", done + " of " + tasks.length + " today"],
      ["Learning efficiency", eff + "/100", sig.avgSeconds + "s avg per question"],
      ["Weekly questions", sig.weekQuestions + "", "Goal " + store.goals.weekGoal]
    ];
    $("spMetrics").innerHTML = cards.map(function (c) {
      return '<article class="stat"><span>' + esc(c[0]) + "</span><strong>" + esc(c[1]) + "</strong><small>" + esc(c[2]) + "</small></article>";
    }).join("");
  }

  function todayTasks() { return store.plan && store.plan.dailyTasks ? store.plan.dailyTasks : []; }
  function todayProgress() { return store.progress[todayKey()] || (store.progress[todayKey()] = {}); }
  function doneCount(tasks) {
    var p = todayProgress();
    return tasks.filter(function (t, i) { return p[i]; }).length;
  }

  function renderToday(sig) {
    var tasks = todayTasks(), ul = $("spTasks");
    if (!tasks.length) {
      ul.innerHTML = '<li class="empty">No plan generated yet. Press “Generate plan” to build today\'s schedule.</li>';
      $("spTodayMeta").textContent = "—";
      $("spTodayPct").textContent = "0%";
      $("spTodayBar").style.width = "0%";
      return;
    }
    var p = todayProgress();
    var total = tasks.reduce(function (s, t) { return s + t.minutes; }, 0);
    var done = doneCount(tasks);
    var pct = round((done / tasks.length) * 100);
    $("spTodayMeta").textContent = tasks.length + " tasks · " + Math.round(total / 6) / 10 + " h estimated · plan built " +
      (store.planDate === todayKey() ? "today" : store.planDate) + " (" + (store.planSource === "offline" ? "local engine" : "personalised") + ")";
    $("spTodayPct").textContent = pct + "%";
    $("spTodayBar").style.width = pct + "%";
    ul.innerHTML = tasks.map(function (t, i) {
      var cls = t.priority === "High" ? "pill-bad" : t.priority === "Medium" ? "pill-mid" : "pill-ok";
      return '<li class="sp-task' + (p[i] ? " done" : "") + '">' +
        '<label><input type="checkbox" data-task="' + i + '"' + (p[i] ? " checked" : "") + ' />' +
        '<span class="sp-task-main"><b>' + esc(t.title) + "</b>" +
        '<small>' + esc(t.topic) + " · " + esc(t.type) + (t.target ? " · Target: " + esc(t.target) : "") + "</small>" +
        (t.why ? '<small class="muted">' + esc(t.why) + "</small>" : "") +
        "</span></label>" +
        '<span class="sp-task-meta"><span class="pill ' + cls + '">' + esc(t.priority) + "</span>" +
        "<b>" + t.minutes + " min</b>" +
        '<small>' + (p[i] ? "Completed" : "Pending") + "</small></span></li>";
    }).join("");
    ul.querySelectorAll("input[data-task]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var i = cb.dataset.task, pr = todayProgress();
        var t = tasks[i];
        if (cb.checked) {
          pr[i] = true;
          store.minutes[todayKey()] = (store.minutes[todayKey()] || 0) + (t ? t.minutes : 0);
        } else {
          delete pr[i];
          store.minutes[todayKey()] = Math.max(0, (store.minutes[todayKey()] || 0) - (t ? t.minutes : 0));
        }
        saveStore();
        render();
      });
    });
  }

  function chips(items, cls) {
    if (!items || !items.length) return '<p class="muted">Nothing flagged.</p>';
    return '<div class="chips">' + items.map(function (x) {
      return '<span class="chip' + (cls ? " " + cls : "") + '">' + esc(x) + "</span>";
    }).join("") + "</div>";
  }
  function bullets(items, empty) {
    if (!items || !items.length) return '<p class="muted">' + esc(empty || "Nothing yet.") + "</p>";
    return "<ul class='sp-mini'>" + items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }

  function renderRecs(sig) {
    var r = store.plan ? store.plan.recommendations : null;
    if (!r) {
      $("spRecs").innerHTML = '<p class="muted">Recommendations appear once a plan is generated. Current weakest area: <b>' +
        esc(sig.weak[0] || "not enough data") + "</b>.</p>";
      return;
    }
    $("spRecs").innerHTML =
      "<h4>Practice next</h4>" + chips(r.nextTopics, "hot") +
      "<h4>Mock tests to attempt</h4>" + bullets(r.mockTests) +
      "<h4>Reasoning categories to improve</h4>" + chips(r.reasoningCategories) +
      "<h4>Aptitude chapters to revise</h4>" + chips(r.aptitudeChapters);
  }

  function renderGaps(sig) {
    var g = store.plan ? store.plan.gaps : localPlan(sig, store.goals).gaps;
    $("spGaps").innerHTML =
      '<div><h4>Weak areas</h4>' + bullets(g.weakAreas, "No weak areas detected yet.") + "</div>" +
      '<div><h4>Missing skills</h4>' + chips(g.missingSkills) + "</div>" +
      '<div><h4>Knowledge gaps</h4>' + bullets(g.knowledgeGaps) + "</div>" +
      '<div><h4>High priority</h4>' + chips(g.highPriority, "hot") + "</div>" +
      '<div><h4>Medium priority</h4>' + chips(g.mediumPriority, "warm") + "</div>" +
      '<div><h4>Revision only</h4>' + chips(g.revision, "cool") + "</div>";
  }

  function renderWeekly(sig) {
    var w = store.plan ? store.plan.weekly : null;
    if (!w) { $("spWeekly").innerHTML = '<p class="muted">Generate a plan to build your weekly roadmap.</p>'; return; }
    var progress = clamp(round((sig.weekQuestions / Math.max(1, store.goals.weekGoal)) * 100), 0, 100);
    $("spWeekly").innerHTML =
      '<p class="pill">' + esc(w.theme) + "</p>" +
      '<div class="bar slim"><i style="width:' + progress + '%"></i></div>' +
      '<small class="muted">' + sig.weekQuestions + " of " + store.goals.weekGoal + " weekly questions (" + progress + "%)</small>" +
      "<h4>Weekly goals</h4>" + bullets(w.goals) +
      "<h4>Topic milestones</h4>" +
      (w.milestones && w.milestones.length
        ? '<ul class="sp-mile">' + w.milestones.map(function (m) {
          return "<li><b>" + esc(m.topic) + "</b><span>" + esc(m.milestone) + "</span><small>" + esc(m.benchmark) + "</small></li>";
        }).join("") + "</ul>"
        : '<p class="muted">No milestones.</p>') +
      "<h4>Skill development targets</h4>" + chips(w.skillTargets);
  }

  function renderMonthly() {
    var m = store.plan ? store.plan.monthly : null;
    if (!m) { $("spMonthly").innerHTML = '<p class="muted">Generate a plan to build your monthly strategy.</p>'; return; }
    $("spMonthly").innerHTML =
      "<p>" + esc(m.objective) + "</p>" +
      '<div class="sp-phases">' + (m.phases || []).map(function (p) {
        return '<article class="card sub"><span class="pill">' + esc(p.week) + "</span><b>" + esc(p.focus) + "</b><small>" + esc(p.outcome) + "</small></article>";
      }).join("") + "</div>" +
      '<div class="sp-grid2"><div><h4>Readiness milestones</h4>' + bullets(m.milestones) + "</div>" +
      "<div><h4>Interview preparation timeline</h4>" + bullets(m.interviewTimeline) + "</div></div>";
  }

  function renderAdaptive(sig) {
    var a = store.plan ? store.plan.adaptation : localPlan(sig, store.goals).adaptation;
    var extra = store.plan && store.plan.insights ? store.plan.insights : [];
    $("spAdaptive").innerHTML = a.concat(extra).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
  }

  function renderProductivity(sig) {
    var tasks = todayTasks(), done = doneCount(tasks);
    var rows = [
      ["Study hours today", (Math.round((store.minutes[todayKey()] || 0) / 6) / 10) + " h of " + store.goals.hours + " h"],
      ["Weekly consistency", sig.consistency + "% (active days in last 14)"],
      ["Task completion rate", (tasks.length ? round((done / tasks.length) * 100) : 0) + "%"],
      ["Daily question goal", sig.weekQuestions ? Math.round(sig.weekQuestions / 7) + " avg vs " + store.goals.dayGoal + " target" : "No practice logged yet"],
      ["Learning speed", sig.trend == null ? "Insufficient data" : (sig.trend >= 0 ? "+" : "") + sig.trend + " pts accuracy shift"],
      ["Bookmarked for review", sig.bookmarks + " questions"]
    ];
    $("spProductivity").innerHTML = rows.map(function (r) {
      return "<li><span>" + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></li>";
    }).join("");

    var labels = [], data = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString(undefined, { weekday: "short" }));
      data.push(Math.round(((store.minutes[dayKey(d.getTime())] || 0) / 60) * 10) / 10);
    }
    var cv = $("spHoursChart");
    if (!cv || !window.Chart) return;
    if (hoursChart) hoursChart.destroy();
    hoursChart = new window.Chart(cv, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{ label: "Study hours", data: data, backgroundColor: "#5b7cfa", borderRadius: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, suggestedMax: Math.max(2, store.goals.hours) } }
      }
    });
  }

  /* ---------------- reports ---------------- */
  var reportKind = "daily";
  function reportText(sig, kind) {
    var g = store.goals, plan = store.plan;
    var tasks = todayTasks(), done = doneCount(tasks);
    var L = [];
    var head = { daily: "DAILY STUDY REPORT", weekly: "WEEKLY PROGRESS REPORT", monthly: "MONTHLY PROGRESS REPORT", placement: "PLACEMENT PREPARATION REPORT" }[kind];
    L.push("PrepDeck — " + head);
    L.push(new Date().toLocaleString());
    L.push("Target: " + (g.company || "not set") + " · " + g.role + (g.date ? " · by " + g.date : ""));
    L.push("");
    L.push("READINESS");
    L.push("  Placement " + sig.scores.readiness + "/100 (" + sig.band + ")");
    L.push("  Aptitude " + sig.scores.aptitude + " | Technical " + sig.scores.technical +
      " | Interview " + sig.scores.interview + " | Resume " + sig.scores.resume);
    L.push("");
    if (kind === "daily") {
      L.push("TODAY'S PLAN (" + done + "/" + tasks.length + " completed)");
      tasks.forEach(function (t, i) {
        L.push("  [" + (todayProgress()[i] ? "x" : " ") + "] " + t.title + " — " + t.minutes + " min · " + t.priority + " priority");
        if (t.target) L.push("       Target: " + t.target);
      });
      L.push("  Study time logged: " + (Math.round((store.minutes[todayKey()] || 0) / 6) / 10) + " h");
    } else if (kind === "weekly") {
      L.push("WEEK SUMMARY");
      L.push("  Questions: " + sig.weekQuestions + " / " + g.weekGoal);
      L.push("  Study hours: " + (Math.round(sig.weekMinutes / 6) / 10) + " h");
      L.push("  Consistency: " + sig.consistency + "% · Streak: " + sig.streak + " days");
      if (plan) { L.push(""); L.push("WEEKLY GOALS"); plan.weekly.goals.forEach(function (x) { L.push("  - " + x); }); }
      if (plan) { L.push(""); L.push("MILESTONES"); plan.weekly.milestones.forEach(function (m) { L.push("  - " + m.topic + ": " + m.milestone + " (" + m.benchmark + ")"); }); }
    } else if (kind === "monthly") {
      L.push("MONTH STRATEGY");
      if (plan) {
        L.push("  " + plan.monthly.objective);
        L.push("");
        plan.monthly.phases.forEach(function (p) { L.push("  " + p.week + ": " + p.focus + " → " + p.outcome); });
        L.push("");
        L.push("MILESTONES"); plan.monthly.milestones.forEach(function (x) { L.push("  - " + x); });
      } else L.push("  No plan generated yet.");
      L.push("");
      L.push("PERFORMANCE");
      L.push("  Reasoning attempts: " + sig.reasoningAttempts + " · Accuracy " + sig.accuracy + "%");
      L.push("  Tests logged: " + sig.tests + " · Average " + sig.avgScore + "%");
      L.push("  Interviews: " + sig.interviews + " · Average " + sig.interviewAvg + "/100");
    } else {
      L.push("SKILL GAP ANALYSIS");
      var gp = plan ? plan.gaps : localPlan(sig, g).gaps;
      L.push("  Weak areas: " + (gp.weakAreas.join("; ") || "none"));
      L.push("  Missing skills: " + (gp.missingSkills.join(", ") || "none"));
      L.push("  High priority: " + (gp.highPriority.join(", ") || "none"));
      L.push("");
      L.push("INTERVIEW TIMELINE");
      (plan ? plan.monthly.interviewTimeline : []).forEach(function (x) { L.push("  - " + x); });
      L.push("");
      L.push("RECOMMENDATIONS");
      var r = plan ? plan.recommendations : localPlan(sig, g).recommendations;
      L.push("  Practice next: " + r.nextTopics.join(", "));
      L.push("  Mock tests: " + r.mockTests.join("; "));
      L.push("");
      L.push("ADAPTIVE NOTES");
      (plan ? plan.adaptation : []).forEach(function (x) { L.push("  - " + x); });
    }
    return L.join("\n");
  }

  function renderReport(sig) {
    $("spReport").textContent = reportText(sig, reportKind);
  }

  /* ---------------- events ---------------- */
  $("spGenerate").addEventListener("click", generate);
  $("spSaveGoals").addEventListener("click", function () {
    store.goals = {
      company: $("spCompany").value.trim(),
      role: $("spRole").value,
      date: $("spDate").value,
      hours: clamp(Number($("spHours").value) || 3, 1, 14),
      weekGoal: clamp(Number($("spWeekGoal").value) || 150, 10, 2000),
      dayGoal: clamp(Number($("spDayGoal").value) || 25, 5, 300)
    };
    saveStore();
    render();
    status("Goals saved. Generate a plan to rebuild your schedule around them.");
  });
  $("spReportSeg").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-report]");
    if (!b) return;
    reportKind = b.dataset.report;
    $("spReportSeg").querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
    renderReport(signals());
  });
  $("spDownload").addEventListener("click", function () {
    var blob = new Blob([reportText(signals(), reportKind)], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prepdeck-" + reportKind + "-report.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  window.PrepDeckPlanner = { render: render, signals: signals };
  render();
})();
