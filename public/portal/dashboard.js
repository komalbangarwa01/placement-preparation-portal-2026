/* PrepDeck — Personalised Dashboard hub (Local Storage only) */
(function () {
  "use strict";
  var PKEY = "prepdeck.planner";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("page-dashboard")) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function read(k, fb) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function round(n) { return Math.round(n || 0); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function dayKey(ts) { return new Date(ts).toISOString().slice(0, 10); }
  function band(v) { return v >= 85 ? "Placement Ready" : v >= 65 ? "Advanced" : v >= 40 ? "Intermediate" : "Beginner"; }
  function tone(v) { return v >= 70 ? "pill-ok" : v >= 45 ? "pill-mid" : "pill-bad"; }

  var charts = {};
  function paint(id, cfg) {
    var el = $(id);
    if (!el || !window.Chart) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new window.Chart(el.getContext("2d"), cfg);
  }
  function css(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }

  /* ---------------- aggregation ---------------- */
  function collect() {
    var tests = read("prepdeck.attempts", []) || [];
    var R = read("prepdeck.reasoning", {}) || {};
    var rAttempts = R.attempts || [], rDays = R.days || {};
    var interviews = read("prepdeck.interviews", []) || [];
    var cvLast = read("prepdeck.resume.last", null);
    var cvHistory = read("prepdeck.resume.history", []) || [];
    var coding = read("prepdeck.coding", {}) || {};
    var planner = read(PKEY, {}) || {};
    var minutes = planner.minutes || {};
    var goals = Object.assign({ company: "", role: "Software Engineer", date: "", hours: 3, weekGoal: 150, dayGoal: 25 }, planner.goals || {});

    var sig = (window.PrepDeckPlanner && window.PrepDeckPlanner.signals)
      ? window.PrepDeckPlanner.signals() : null;

    var pcts = tests.map(function (a) { return (a.score / a.total) * 100; });
    var avgTest = pcts.length ? pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length : 0;
    var rTotal = rAttempts.length;
    var rCorrect = rAttempts.filter(function (a) { return a.correct; }).length;
    var rAcc = rTotal ? (rCorrect / rTotal) * 100 : 0;

    var codingLog = coding.log || [];
    var progress = coding.progress || {};
    var solved = 0, codeAttempts = 0;
    Object.keys(progress).forEach(function (k) {
      codeAttempts++;
      if (progress[k].status === "solved") solved++;
    });
    var codingScore = codeAttempts ? round((solved / codeAttempts) * 100) : 0;

    var ivN = interviews.length;
    var ivAvg = ivN ? round(interviews.reduce(function (s, x) { return s + (x.report ? x.report.overall || 0 : 0); }, 0) / ivN) : 0;
    var resumeScore = cvLast && cvLast.scores ? round(cvLast.scores.ats) : 0;

    /* hours: planner minutes + reasoning time + coding sessions + tests */
    var plannedMinutes = Object.keys(minutes).reduce(function (s, k) { return s + (minutes[k] || 0); }, 0);
    var reasoningMinutes = rAttempts.reduce(function (s, a) { return s + (a.seconds || 0); }, 0) / 60;
    var codingMinutes = codingLog.length * 12;
    var testMinutes = tests.length * 20 + ivN * 18;
    var hours = Math.round(((plannedMinutes + reasoningMinutes + codingMinutes + testMinutes) / 60) * 10) / 10;

    /* activity per day (14 / 84 days) */
    function activityMap() {
      var m = {};
      function add(ts, n) { var k = dayKey(ts); m[k] = (m[k] || 0) + n; }
      rAttempts.forEach(function (a) { if (a.at || a.date) add(a.at || a.date, 1); });
      Object.keys(rDays).forEach(function (k) { m[k] = Math.max(m[k] || 0, rDays[k] || 0); });
      tests.forEach(function (t) { if (t.date) add(t.date, 5); });
      codingLog.forEach(function (l) { add(l.at, 3); });
      interviews.forEach(function (i) { if (i.at || i.date) add(i.at || i.date, 4); });
      Object.keys(minutes).forEach(function (k) { m[k] = (m[k] || 0) + Math.round((minutes[k] || 0) / 5); });
      return m;
    }
    var act = activityMap();

    var streak = 0, d = new Date();
    if (!act[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
    while (act[dayKey(d.getTime())]) { streak++; d.setDate(d.getDate() - 1); }

    var activeDays = 0, i;
    for (i = 0; i < 14; i++) { d = new Date(); d.setDate(d.getDate() - i); if (act[dayKey(d.getTime())]) activeDays++; }
    var consistency = round((activeDays / 14) * 100);

    /* topic accuracy across reasoning + tests */
    var byTopic = {};
    rAttempts.forEach(function (a) {
      var k = a.category || "Reasoning";
      var s = byTopic[k] || (byTopic[k] = { n: 0, sum: 0 });
      s.n++; s.sum += a.correct ? 100 : 0;
    });
    tests.forEach(function (t) {
      var s = byTopic[t.topic] || (byTopic[t.topic] = { n: 0, sum: 0 });
      s.n++; s.sum += (t.score / t.total) * 100;
    });
    Object.keys(progress).forEach(function (id) {
      var p = progress[id];
      if (!p || !p.topic) return;
      var s = byTopic[p.topic] || (byTopic[p.topic] = { n: 0, sum: 0 });
      s.n++; s.sum += p.status === "solved" ? 100 : 40;
    });
    var topics = Object.keys(byTopic).map(function (k) {
      return { topic: k, acc: round(byTopic[k].sum / byTopic[k].n), n: byTopic[k].n };
    }).sort(function (a, b) { return b.acc - a.acc; });

    var aptitude = round(clamp(avgTest * 0.6 + rAcc * 0.4, 0, 100));
    var reasoning = round(rAcc);
    var technical = round(clamp((codingScore || 0) * 0.55 + (resumeScore || 35) * 0.2 + (rAcc || 0) * 0.25, 0, 100));
    var interviewScore = ivN ? ivAvg : 0;
    var engagement = round(consistency * 0.6 + clamp((rTotal / 200) * 100, 0, 100) * 0.4);
    var readiness = sig && sig.scores ? sig.scores.readiness : round(clamp(
      aptitude * 0.28 + technical * 0.24 + (interviewScore || aptitude * 0.6) * 0.18 +
      (resumeScore || 35) * 0.1 + engagement * 0.2, 0, 100));

    /* trends */
    function windowScore(from, to) {
      var vals = [];
      rAttempts.forEach(function (a) {
        var ts = a.at || a.date; if (!ts || ts < from || ts >= to) return;
        vals.push(a.correct ? 100 : 0);
      });
      tests.forEach(function (t) {
        if (!t.date || t.date < from || t.date >= to) return;
        vals.push((t.score / t.total) * 100);
      });
      codingLog.forEach(function (l) {
        if (!l.at || l.at < from || l.at >= to) return;
        vals.push(l.status === "solved" ? 100 : 35);
      });
      interviews.forEach(function (x) {
        var ts = x.at || x.date; if (!ts || ts < from || ts >= to) return;
        vals.push(x.report ? x.report.overall || 0 : 0);
      });
      return vals.length ? round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) : null;
    }
    var weekly = [], monthly = [], t0;
    for (i = 6; i >= 0; i--) {
      d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      t0 = d.getTime();
      weekly.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), value: windowScore(t0, t0 + 864e5), questions: act[dayKey(t0)] || 0 });
    }
    for (i = 5; i >= 0; i--) {
      d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); d.setMonth(d.getMonth() - i);
      var nxt = new Date(d); nxt.setMonth(nxt.getMonth() + 1);
      monthly.push({ label: d.toLocaleDateString(undefined, { month: "short" }), value: windowScore(d.getTime(), nxt.getTime()) });
    }
    var consistency14 = [];
    for (i = 13; i >= 0; i--) {
      d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      consistency14.push({ label: (d.getMonth() + 1) + "/" + d.getDate(), value: act[dayKey(d.getTime())] || 0 });
    }

    /* recent vs previous improvement */
    function acc(list) {
      return list.length ? (list.filter(function (a) { return a.correct; }).length / list.length) * 100 : null;
    }
    var recent = rAttempts.slice(-25), prev = rAttempts.slice(-50, -25);
    var trend = (recent.length >= 5 && prev.length >= 5) ? round(acc(recent) - acc(prev)) : null;

    var improvedSkill = null;
    (function () {
      var best = null;
      var half = {};
      rAttempts.forEach(function (a, idx) {
        var k = a.category || "Reasoning";
        var slot = half[k] || (half[k] = { early: [], late: [] });
        slot[idx < rAttempts.length / 2 ? "early" : "late"].push(a);
      });
      Object.keys(half).forEach(function (k) {
        var e = acc(half[k].early), l = acc(half[k].late);
        if (e == null || l == null || half[k].early.length < 3 || half[k].late.length < 3) return;
        var delta = round(l - e);
        if (!best || delta > best.delta) best = { topic: k, delta: delta };
      });
      improvedSkill = best;
    })();

    /* timeline */
    var timeline = [];
    tests.forEach(function (t) {
      timeline.push({ kind: "Test", at: t.date, title: t.topic + " test", meta: t.score + "/" + t.total, value: round((t.score / t.total) * 100) + "%" });
    });
    interviews.forEach(function (x) {
      timeline.push({ kind: "Interview", at: x.at || x.date, title: (x.role || "Mock interview") + (x.company ? " · " + x.company : ""), meta: "Interview practice", value: (x.report ? round(x.report.overall) : 0) + "/100" });
    });
    cvHistory.forEach(function (h) {
      timeline.push({ kind: "Resume", at: h.at || h.date, title: (h.role || "Resume") + " analysis", meta: h.fileName || "Resume review", value: round(h.scores ? h.scores.ats : h.ats || 0) + " ATS" });
    });
    codingLog.slice(-40).forEach(function (l) {
      timeline.push({ kind: "Coding", at: l.at, title: l.topic + " · " + l.difficulty, meta: (l.lang || "code"), value: l.status === "solved" ? "Solved" : "Attempted" });
    });
    (function () {
      var byDay = {};
      rAttempts.forEach(function (a) {
        var k = dayKey(a.at || a.date || Date.now());
        var s = byDay[k] || (byDay[k] = { n: 0, c: 0, at: a.at || a.date || Date.now() });
        s.n++; if (a.correct) s.c++;
      });
      Object.keys(byDay).forEach(function (k) {
        var s = byDay[k];
        timeline.push({ kind: "Reasoning", at: s.at, title: "Reasoning practice", meta: s.n + " questions", value: round((s.c / s.n) * 100) + "%" });
      });
    })();
    (function () {
      var pr = planner.progress || {};
      Object.keys(pr).forEach(function (k) {
        var done = Object.keys(pr[k] || {}).length;
        if (done) timeline.push({ kind: "Task", at: new Date(k + "T12:00:00").getTime(), title: "Study plan tasks completed", meta: k, value: done + " done" });
      });
    })();
    timeline = timeline.filter(function (x) { return x.at; }).sort(function (a, b) { return b.at - a.at; });

    /* heatmap: 12 weeks x 7 days */
    var heat = [];
    for (i = 83; i >= 0; i--) {
      d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      heat.push({ date: dayKey(d.getTime()), n: act[dayKey(d.getTime())] || 0 });
    }

    var overall = round(clamp(
      readiness * 0.4 +
      clamp((rTotal / 300) * 100, 0, 100) * 0.15 +
      clamp((tests.length / 20) * 100, 0, 100) * 0.1 +
      clamp((solved / 60) * 100, 0, 100) * 0.15 +
      clamp((ivN / 8) * 100, 0, 100) * 0.1 +
      (resumeScore ? 100 : 0) * 0.1, 0, 100));

    return {
      tests: tests, testCount: tests.length, avgTest: round(avgTest),
      reasoningAttempts: rTotal, accuracy: round(rAcc),
      solved: solved, codeAttempts: codeAttempts, codingScore: codingScore,
      interviews: ivN, interviewScore: interviewScore, resumeScore: resumeScore,
      hours: hours, streak: streak, consistency: consistency, activeDays: activeDays,
      topics: topics, readiness: readiness, aptitude: aptitude, reasoning: reasoning,
      technical: technical, engagement: engagement, overall: overall,
      weekly: weekly, monthly: monthly, consistency14: consistency14, heat: heat,
      trend: trend, improvedSkill: improvedSkill, timeline: timeline,
      goals: goals, planner: planner, weak: topics.slice().reverse().filter(function (t) { return t.acc < 70; }),
      strong: topics.filter(function (t) { return t.acc >= 70; }),
      missingSkills: cvLast && cvLast.scores ? (cvLast.scores.missingSkills || []) : []
    };
  }

  /* ---------------- render pieces ---------------- */
  var ACTIONS = [
    { page: "test", label: "Start Aptitude Test", icon: "🧮" },
    { page: "reason", label: "Practice Reasoning", icon: "🧩" },
    { page: "resume", label: "Analyze Resume", icon: "📄" },
    { page: "interview", label: "Take Mock Interview", icon: "🎤" },
    { page: "plan", label: "Open Study Planner", icon: "🗓️" },
    { page: "code", label: "Start Coding Practice", icon: "💻" }
  ];

  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }

  function bar(v, label) {
    return '<div class="db-bar"><span>' + esc(label) + '<b>' + round(v) + '</b></span><em><i style="width:' + clamp(round(v), 0, 100) + '%"></i></em></div>';
  }

  function render() {
    var s = collect();

    $("dbWelcome").textContent = greeting() + " — here's your placement snapshot";
    $("dbWelcomeNote").textContent = s.goals.company
      ? "Target: " + s.goals.company + " · " + s.goals.role + (s.goals.date ? " · by " + s.goals.date : "")
      : "Set a target company and date in goal tracking to sharpen your recommendations.";

    $("dbReadiness").textContent = s.readiness;
    $("dbRing").style.setProperty("--p", s.readiness);
    $("dbBand").textContent = band(s.readiness);
    $("dbProgressPill").textContent = s.overall + "% overall progress";
    $("dbProgressBar").style.width = s.overall + "%";
    $("dbBandNote").textContent = s.readiness >= 85
      ? "You are interview-ready. Hold the standard with daily revision and full-length mocks."
      : s.readiness >= 65
        ? "Strong profile. Close the remaining weak topics and add more mock interviews."
        : s.readiness >= 40
          ? "Solid foundation. Increase daily volume and start company-specific preparation."
          : "Build momentum: short daily reasoning sets plus one aptitude test this week.";

    $("dbBannerMeta").innerHTML =
      '<span class="pill">Consistency <b>' + s.consistency + '%</b></span>' +
      '<span class="pill">Questions <b>' + s.reasoningAttempts + '</b></span>' +
      '<span class="pill">Problems solved <b>' + s.solved + '</b></span>' +
      '<span class="pill">Mock rounds <b>' + s.interviews + '</b></span>';

    $("dbActions").innerHTML = ACTIONS.map(function (a) {
      return '<button class="db-action" type="button" data-go="' + a.page + '"><span>' + a.icon + '</span>' + esc(a.label) + '</button>';
    }).join("");
    $("dbActions").querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (window.PrepDeck && window.PrepDeck.go) window.PrepDeck.go(b.dataset.go);
        else location.hash = "#" + b.dataset.go;
      });
    });

    $("dbStreak").textContent = s.streak + (s.streak === 1 ? " day" : " days");
    $("dbHours").textContent = s.hours + "h";
    $("dbAccuracy").textContent = s.accuracy + "%";
    $("dbInterviewScore").textContent = s.interviewScore || "—";

    var modules = [
      { label: "Aptitude", value: s.avgTest, meta: s.testCount + " tests" },
      { label: "Reasoning", value: s.accuracy, meta: s.reasoningAttempts + " questions" },
      { label: "Coding", value: s.codingScore, meta: s.solved + " solved" },
      { label: "Resume", value: s.resumeScore, meta: s.resumeScore ? "ATS score" : "not analysed" },
      { label: "Mock interview", value: s.interviewScore, meta: s.interviews + " rounds" }
    ];
    $("dbModules").innerHTML = modules.map(function (m) {
      return '<div class="db-module"><div class="db-module-top"><span>' + esc(m.label) + '</span>' +
        '<span class="pill ' + tone(m.value) + '">' + round(m.value) + '</span></div>' +
        '<em><i style="width:' + clamp(round(m.value), 0, 100) + '%"></i></em>' +
        '<small class="muted">' + esc(m.meta) + '</small></div>';
    }).join("");

    var readinessSet = [
      { label: "Placement readiness", value: s.readiness },
      { label: "Technical readiness", value: s.technical },
      { label: "Aptitude readiness", value: s.aptitude },
      { label: "Interview readiness", value: s.interviewScore }
    ];
    $("dbReadinessGrid").innerHTML = readinessSet.map(function (r) {
      return '<div class="db-ready"><strong>' + round(r.value) + '</strong><span>' + esc(r.label) + '</span>' +
        '<em><i style="width:' + clamp(round(r.value), 0, 100) + '%"></i></em>' +
        '<span class="pill ' + tone(r.value) + '">' + band(r.value) + '</span></div>';
    }).join("");

    /* achievements */
    var ach = [];
    if (s.streak >= 3) ach.push(s.streak + "-day practice streak maintained");
    if (s.reasoningAttempts >= 50) ach.push(s.reasoningAttempts + " reasoning questions attempted");
    if (s.solved >= 10) ach.push(s.solved + " coding problems solved");
    if (s.strong.length) ach.push("Strong command of " + s.strong.slice(0, 3).map(function (t) { return t.topic; }).join(", "));
    if (s.resumeScore >= 70) ach.push("Resume clears ATS benchmark at " + s.resumeScore);
    if (s.interviewScore >= 70) ach.push("Mock interview average of " + s.interviewScore + "/100");
    if (s.trend != null && s.trend > 0) ach.push("Accuracy improved by " + s.trend + " points recently");
    if (!ach.length) ach.push("No milestones yet — complete a practice session to unlock achievements.");
    $("dbAchievements").innerHTML = ach.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");

    $("dbLearning").innerHTML =
      bar(clamp((s.reasoningAttempts / 300) * 100, 0, 100), "Reasoning coverage") +
      bar(clamp((s.testCount / 20) * 100, 0, 100), "Aptitude test volume") +
      bar(clamp((s.solved / 60) * 100, 0, 100), "DSA problem coverage") +
      bar(clamp((s.interviews / 8) * 100, 0, 100), "Interview practice") +
      bar(s.consistency, "Practice consistency");

    /* charts */
    var brand = css("--brand", "#3b6ef5"), brand2 = css("--brand-2", "#12b886"), line = css("--line", "#e2e8f0"), muted = css("--muted", "#64748b");
    var lineOpts = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 100, grid: { color: line }, ticks: { color: muted } }, x: { grid: { display: false }, ticks: { color: muted } } }
    };
    paint("dbChWeek", {
      type: "line",
      data: {
        labels: s.weekly.map(function (w) { return w.label; }),
        datasets: [{ data: s.weekly.map(function (w) { return w.value; }), borderColor: brand, backgroundColor: "transparent", tension: .35, spanGaps: true, pointRadius: 4 }]
      }, options: lineOpts
    });
    paint("dbChMonth", {
      type: "bar",
      data: {
        labels: s.monthly.map(function (m) { return m.label; }),
        datasets: [{ data: s.monthly.map(function (m) { return m.value; }), backgroundColor: brand2, borderRadius: 8 }]
      }, options: lineOpts
    });
    var topTopics = s.topics.slice(0, 8);
    paint("dbChTopics", {
      type: "bar",
      data: {
        labels: topTopics.map(function (t) { return t.topic; }),
        datasets: [{ data: topTopics.map(function (t) { return t.acc; }), backgroundColor: brand, borderRadius: 6 }]
      },
      options: Object.assign({}, lineOpts, { indexAxis: "y", scales: { x: { beginAtZero: true, max: 100, grid: { color: line }, ticks: { color: muted } }, y: { grid: { display: false }, ticks: { color: muted } } } })
    });
    paint("dbChSkills", {
      type: "radar",
      data: {
        labels: ["Aptitude", "Reasoning", "Coding", "Resume", "Interview", "Consistency"],
        datasets: [{
          data: [s.avgTest, s.accuracy, s.codingScore, s.resumeScore, s.interviewScore, s.consistency],
          borderColor: brand, backgroundColor: "color-mix(in oklab, " + brand + " 22%, transparent)", pointBackgroundColor: brand
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { r: { min: 0, max: 100, grid: { color: line }, angleLines: { color: line }, pointLabels: { color: muted }, ticks: { display: false } } }
      }
    });
    paint("dbChConsistency", {
      type: "bar",
      data: {
        labels: s.consistency14.map(function (c) { return c.label; }),
        datasets: [{ data: s.consistency14.map(function (c) { return c.value; }), backgroundColor: brand2, borderRadius: 5 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: line }, ticks: { color: muted, precision: 0 } }, x: { grid: { display: false }, ticks: { color: muted, maxRotation: 0, autoSkip: true } } }
      }
    });

    var max = s.heat.reduce(function (m, h) { return Math.max(m, h.n); }, 0) || 1;
    $("dbHeat").innerHTML = s.heat.map(function (h) {
      var lvl = h.n === 0 ? 0 : Math.min(4, Math.ceil((h.n / max) * 4));
      return '<i class="db-heat-cell lvl' + lvl + '" title="' + h.date + ' · ' + h.n + ' activity points"></i>';
    }).join("");

    /* recommendations */
    var weakNames = s.weak.slice(0, 4).map(function (t) { return t.topic; });
    var recTopics = weakNames.length ? weakNames : ["Number Series", "Blood Relations", "Arrays", "Percentages"];
    var recos = [
      { title: "Recommended topics", items: recTopics },
      {
        title: "Suggested practice tests", items: [
          "Mixed reasoning set — 25 questions, " + (s.accuracy >= 70 ? "Hard" : s.accuracy >= 50 ? "Medium" : "Easy"),
          "Full aptitude mock — 30 minutes",
          s.solved >= 20 ? "Company coding set — Medium tier" : "Arrays & Strings starter set"
        ]
      },
      { title: "Weak areas to improve", items: weakNames.length ? weakNames : ["Log more sessions to detect weak areas"] },
      {
        title: "Daily learning targets", items: [
          s.goals.dayGoal + " practice questions",
          Math.max(1, Math.round(s.goals.hours)) + " focused study hours",
          "1 coding problem from " + (weakNames[0] || "Arrays")
        ]
      },
      {
        title: "Weekly learning goals", items: [
          s.goals.weekGoal + " questions across all modules",
          "2 full-length mock tests",
          "1 mock interview round" + (s.goals.company ? " in " + s.goals.company + " format" : "")
        ]
      }
    ];
    if (s.missingSkills.length) recos[0].items = recTopics.concat(s.missingSkills.slice(0, 3));
    $("dbRecos").innerHTML = recos.map(function (r) {
      return '<div class="db-reco"><h4>' + esc(r.title) + "</h4><ul>" +
        r.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>";
    }).join("");

    /* goals */
    $("dbGoalCompany").value = s.goals.company || "";
    $("dbGoalDate").value = s.goals.date || "";
    $("dbGoalWeek").value = s.goals.weekGoal;
    $("dbGoalDay").value = s.goals.dayGoal;

    var weekQuestions = s.consistency14.slice(-7).reduce(function (a, c) { return a + c.value; }, 0);
    var todayQuestions = s.consistency14[s.consistency14.length - 1].value;
    var weekPct = clamp(round((weekQuestions / (s.goals.weekGoal || 1)) * 100), 0, 100);
    var dayPct = clamp(round((todayQuestions / (s.goals.dayGoal || 1)) * 100), 0, 100);
    var monthTarget = (s.goals.weekGoal || 0) * 4;
    var monthQuestions = s.heat.slice(-30).reduce(function (a, h) { return a + h.n; }, 0);
    var monthPct = clamp(round((monthQuestions / (monthTarget || 1)) * 100), 0, 100);
    var daysLeft = s.goals.date ? Math.ceil((new Date(s.goals.date).getTime() - Date.now()) / 864e5) : null;
    var completion = round((weekPct + monthPct + s.readiness) / 3);

    $("dbGoalTrack").innerHTML =
      '<div class="db-goal-head"><strong>' + completion + '%</strong><span>goal completion</span>' +
      (daysLeft != null ? '<span class="pill">' + (daysLeft >= 0 ? daysLeft + " days to target date" : Math.abs(daysLeft) + " days past target") + "</span>" : "") + "</div>" +
      bar(dayPct, "Today · " + todayQuestions + "/" + s.goals.dayGoal + " questions") +
      bar(weekPct, "This week · " + weekQuestions + "/" + s.goals.weekGoal + " questions") +
      bar(monthPct, "This month · " + monthQuestions + "/" + monthTarget + " questions") +
      bar(s.readiness, "Readiness milestone · target 85") +
      '<ul class="db-list"><li>Remaining this week: ' + Math.max(0, s.goals.weekGoal - weekQuestions) + " questions</li>" +
      "<li>Readiness gap: " + Math.max(0, 85 - s.readiness) + " points to Placement Ready</li>" +
      "<li>Mock interviews remaining this month: " + Math.max(0, 4 - s.interviews) + "</li></ul>";

    /* insights */
    var best = s.topics[0], worst = s.topics[s.topics.length - 1];
    var insights = [];
    insights.push(s.improvedSkill
      ? "Most improved skill: " + s.improvedSkill.topic + " (" + (s.improvedSkill.delta >= 0 ? "+" : "") + s.improvedSkill.delta + " points)"
      : "Most improved skill: not enough history yet — keep practising to unlock this insight.");
    insights.push(worst ? "Weakest topic: " + worst.topic + " at " + worst.acc + "% accuracy" : "Weakest topic: no data yet.");
    insights.push(best ? "Highest scoring category: " + best.topic + " at " + best.acc + "%" : "Highest scoring category: no data yet.");
    insights.push("Learning consistency: active on " + s.activeDays + " of the last 14 days (" + s.consistency + "%).");
    insights.push("Recommended next step: " + (
      s.readiness < 40 ? "run a 25-question mixed reasoning set today to build baseline accuracy."
        : s.resumeScore < 60 ? "upload your resume for an ATS analysis and fix the flagged sections."
          : s.interviews < 3 ? "complete a mock interview round for your target company."
            : worst ? "clear " + worst.topic + " with a focused 30-minute drill." : "hold the routine with daily mixed practice."));
    $("dbInsights").innerHTML = insights.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("");

    /* timeline */
    renderTimeline(s.timeline, "All");
    var kinds = ["All", "Test", "Reasoning", "Coding", "Interview", "Resume", "Task"];
    $("dbTlFilters").innerHTML = kinds.map(function (k, i) {
      return '<button type="button" class="chip' + (i === 0 ? " on" : "") + '" data-kind="' + k + '">' + k + "</button>";
    }).join("");
    $("dbTlFilters").querySelectorAll("[data-kind]").forEach(function (b) {
      b.addEventListener("click", function () {
        $("dbTlFilters").querySelectorAll("[data-kind]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        renderTimeline(s.timeline, b.dataset.kind);
      });
    });
  }

  function renderTimeline(items, kind) {
    var list = kind === "All" ? items : items.filter(function (i) { return i.kind === kind; });
    var el = $("dbTimeline");
    if (!list.length) { el.innerHTML = '<li class="empty">No activity recorded in this category yet.</li>'; return; }
    el.innerHTML = list.slice(0, 12).map(function (i) {
      return "<li><span><b>" + esc(i.title) + "</b><small>" + esc(i.kind) + " · " + esc(i.meta) + " · " +
        new Date(i.at).toLocaleString() + "</small></span><span><b>" + esc(i.value) + "</b></span></li>";
    }).join("");
  }

  /* ---------------- events ---------------- */
  var form = $("dbGoalForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var s = read(PKEY, {}) || {};
      s.goals = Object.assign({ role: "Software Engineer", hours: 3 }, s.goals || {}, {
        company: $("dbGoalCompany").value.trim(),
        date: $("dbGoalDate").value,
        weekGoal: Math.max(10, Number($("dbGoalWeek").value) || 150),
        dayGoal: Math.max(5, Number($("dbGoalDay").value) || 25)
      });
      write(PKEY, s);
      render();
    });
  }
  if ($("dbRefresh")) $("dbRefresh").addEventListener("click", render);
  window.addEventListener("storage", function () {
    if ($("page-dashboard").classList.contains("active")) render();
  });

  window.PrepDeckDashboard = { render: render, collect: collect };
})();
