/* PrepDeck — Candidate Assessment Dashboard (Local Storage + Chart.js) */
(function () {
  "use strict";
  var RKEY = "prepdeck.reasoning", TKEY = "prepdeck.attempts", AKEY = "prepdeck.analytics";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("aReadiness")) return;

  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function mix(c, a) { return "color-mix(in oklab, " + c + " " + a + "%, transparent)"; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function round(n) { return Math.round(n || 0); }

  function readReasoning() {
    try { var s = JSON.parse(localStorage.getItem(RKEY)) || {}; return { attempts: s.attempts || [], days: s.days || {}, bookmarks: s.bookmarks || [] }; }
    catch (e) { return { attempts: [], days: {}, bookmarks: [] }; }
  }
  function readTests() {
    try { return JSON.parse(localStorage.getItem(TKEY)) || []; } catch (e) { return []; }
  }

  /* ---------------- metrics ---------------- */
  function compute() {
    var R = readReasoning(), T = readTests();
    var A = R.attempts.slice().sort(function (a, b) { return a.date - b.date; });
    var total = A.length;
    var correct = A.filter(function (a) { return a.correct; }).length;
    var acc = total ? (correct / total) * 100 : 0;
    var secs = A.reduce(function (t, a) { return t + (a.seconds || 0); }, 0);
    var avgTime = total ? secs / total : 0;

    var pcts = T.map(function (a) { return (a.score / a.total) * 100; });
    var avgScore = pcts.length ? pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length : 0;

    /* topic + level breakdowns */
    function group(keyFn) {
      var by = {};
      A.forEach(function (a) {
        var k = keyFn(a); var s = by[k] || (by[k] = { n: 0, c: 0, secs: 0 });
        s.n++; if (a.correct) s.c++; s.secs += a.seconds || 0;
      });
      return Object.keys(by).map(function (k) {
        return { key: k, n: by[k].n, correct: by[k].c, acc: round((by[k].c / by[k].n) * 100), avg: round(by[k].secs / by[k].n) };
      });
    }
    var topics = group(function (a) { return a.category || "General"; }).sort(function (a, b) { return b.acc - a.acc; });
    var levels = group(function (a) { return a.level || "Medium"; });

    /* time efficiency: 45s benchmark, weighted by accuracy */
    var timeEff = total ? clamp(round((45 / Math.max(6, avgTime)) * 100 * (0.55 + 0.45 * (acc / 100))), 0, 100) : 0;

    /* improvement trend: last 20 vs previous 20 */
    var recent = A.slice(-20), prev = A.slice(-40, -20);
    function pa(list) { return list.length ? (list.filter(function (a) { return a.correct; }).length / list.length) * 100 : 0; }
    var trend = (recent.length >= 5 && prev.length >= 5) ? pa(recent) - pa(prev) : null;

    /* consistency: active days in last 14 */
    var activeDays = 0, i, d;
    for (i = 0; i < 14; i++) { d = new Date(); d.setDate(d.getDate() - i); if (R.days[dayKey(d.getTime())]) activeDays++; }
    var consistency = round((activeDays / 14) * 100);

    /* streak */
    var streak = 0; d = new Date();
    if (!R.days[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
    while (R.days[dayKey(d.getTime())]) { streak++; d.setDate(d.getDate() - 1); }

    /* learning progress index: coverage x accuracy x volume */
    var catCount = (window.ReasoningBank && window.ReasoningBank.CATEGORIES.length) || 10;
    var coverage = clamp((topics.length / catCount) * 100, 0, 100);
    var volume = clamp((total / 300) * 100, 0, 100);
    var lpi = round(coverage * 0.3 + acc * 0.45 + volume * 0.25);

    /* readiness: accuracy 40, consistency 20, frequency 15, test performance 25 */
    var frequency = clamp(round((weekCount(R.days) / 70) * 100), 0, 100);
    var testPerf = pcts.length ? clamp(avgScore, 0, 100) : clamp(acc, 0, 100);
    var readiness = total || pcts.length
      ? clamp(round(acc * 0.40 + consistency * 0.20 + frequency * 0.15 + testPerf * 0.25), 0, 100) : 0;

    var band = readiness >= 85 ? "Placement Ready" : readiness >= 65 ? "Advanced" : readiness >= 40 ? "Intermediate" : "Beginner";

    return {
      R: R, T: T, A: A, total: total, correct: correct, incorrect: total - correct, acc: acc,
      avgTime: avgTime, avgScore: avgScore, tests: T.length, topics: topics, levels: levels,
      timeEff: timeEff, trend: trend, consistency: consistency, frequency: frequency,
      streak: streak, lpi: lpi, readiness: readiness, band: band, testPerf: testPerf
    };
  }

  function weekCount(days) {
    var n = 0;
    for (var i = 0; i < 7; i++) { var d = new Date(); d.setDate(d.getDate() - i); n += days[dayKey(d.getTime())] || 0; }
    return n;
  }

  /* daily accuracy series */
  function dailySeries(A, n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      var k = dayKey(d.getTime());
      var day = A.filter(function (a) { return dayKey(a.date) === k; });
      var c = day.filter(function (a) { return a.correct; }).length;
      out.push({ date: new Date(d), label: d.getDate() + "/" + (d.getMonth() + 1), n: day.length, acc: day.length ? round((c / day.length) * 100) : null });
    }
    return out;
  }

  function monthlySeries(A, months) {
    var out = [];
    for (var i = months - 1; i >= 0; i--) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      var y = d.getFullYear(), m = d.getMonth();
      var set = A.filter(function (a) { var x = new Date(a.date); return x.getFullYear() === y && x.getMonth() === m; });
      var c = set.filter(function (a) { return a.correct; }).length;
      out.push({ label: d.toLocaleString(undefined, { month: "short" }), n: set.length, acc: set.length ? round((c / set.length) * 100) : null });
    }
    return out;
  }

  /* ---------------- charts ---------------- */
  var charts = {};
  function draw(id, config) {
    if (!window.Chart) return;
    var el = $(id); if (!el) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(el.getContext("2d"), config);
  }
  function baseOpts(extra) {
    var grid = mix(css("--muted") || "#888", 18);
    var o = {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: { legend: { display: false }, tooltip: { padding: 10 } },
      scales: {
        x: { grid: { display: false }, ticks: { color: css("--muted") } },
        y: { beginAtZero: true, grid: { color: grid }, ticks: { color: css("--muted") } }
      }
    };
    return Object.assign(o, extra || {});
  }

  function renderCharts(M) {
    var brand = css("--brand") || "#ff5a3c", brand2 = css("--brand-2") || "#0f766e";
    var ok = css("--ok") || "#0f8a5f", warn = css("--warn") || "#d97706";

    var wk = dailySeries(M.A, 7);
    draw("chWeek", {
      type: "line",
      data: {
        labels: wk.map(function (d) { return d.label; }),
        datasets: [
          { label: "Accuracy %", data: wk.map(function (d) { return d.acc; }), borderColor: brand, backgroundColor: mix(brand, 18), fill: true, tension: .35, spanGaps: true, pointRadius: 4 },
          { label: "Questions", data: wk.map(function (d) { return d.n; }), borderColor: brand2, borderDash: [5, 4], tension: .35, pointRadius: 3, yAxisID: "y1" }
        ]
      },
      options: baseOpts({
        plugins: { legend: { display: true, labels: { color: css("--muted"), boxWidth: 12 } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: css("--muted") } },
          y: { beginAtZero: true, max: 100, ticks: { color: css("--muted") }, grid: { color: mix(css("--muted"), 18) } },
          y1: { position: "right", beginAtZero: true, grid: { display: false }, ticks: { color: css("--muted") } }
        }
      })
    });

    var mo = monthlySeries(M.A, 6);
    draw("chMonth", {
      type: "line",
      data: {
        labels: mo.map(function (d) { return d.label; }),
        datasets: [{ label: "Accuracy %", data: mo.map(function (d) { return d.acc; }), borderColor: brand2, backgroundColor: mix(brand2, 18), fill: true, tension: .35, spanGaps: true, pointRadius: 4 }]
      },
      options: baseOpts({ scales: { x: { grid: { display: false }, ticks: { color: css("--muted") } }, y: { beginAtZero: true, max: 100, ticks: { color: css("--muted") }, grid: { color: mix(css("--muted"), 18) } } } })
    });

    var tp = M.topics.slice(0, 10);
    var hasTopics = tp.length >= 3;
    draw("chTopics", {
      type: hasTopics ? "radar" : "bar",
      data: {
        labels: tp.map(function (t) { return t.key; }),
        datasets: [{ label: "Accuracy %", data: tp.map(function (t) { return t.acc; }), borderColor: brand, backgroundColor: mix(brand, 22), pointBackgroundColor: brand, borderRadius: 8 }]
      },
      options: hasTopics ? {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { r: { beginAtZero: true, max: 100, angleLines: { color: mix(css("--muted"), 20) }, grid: { color: mix(css("--muted"), 20) }, pointLabels: { color: css("--muted"), font: { size: 10 } }, ticks: { display: false } } }
      } : baseOpts()
    });

    var order = ["Easy", "Medium", "Hard"];
    var lv = order.map(function (k) {
      var f = M.levels.filter(function (l) { return l.key === k; })[0];
      return f || { key: k, acc: 0, n: 0 };
    });
    draw("chLevels", {
      type: "bar",
      data: {
        labels: order,
        datasets: [{ label: "Accuracy %", data: lv.map(function (l) { return l.acc; }), backgroundColor: [mix(ok, 70), mix(warn, 70), mix(brand, 70)], borderRadius: 10, maxBarThickness: 60 }]
      },
      options: baseOpts({ scales: { x: { grid: { display: false }, ticks: { color: css("--muted") } }, y: { beginAtZero: true, max: 100, ticks: { color: css("--muted") }, grid: { color: mix(css("--muted"), 18) } } } })
    });

    draw("chSplit", {
      type: "doughnut",
      data: {
        labels: ["Correct", "Incorrect"],
        datasets: [{ data: [M.correct, M.incorrect], backgroundColor: [ok, mix(brand, 75)], borderWidth: 0, hoverOffset: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { display: true, position: "bottom", labels: { color: css("--muted"), boxWidth: 12 } } } }
    });

    /* rolling accuracy timeline over last 60 answers */
    var last = M.A.slice(-60), roll = [], win = [];
    last.forEach(function (a, i) {
      win.push(a.correct ? 1 : 0); if (win.length > 10) win.shift();
      roll.push({ x: i + 1, y: round((win.reduce(function (s, v) { return s + v; }, 0) / win.length) * 100) });
    });
    draw("chTimeline", {
      type: "line",
      data: {
        labels: roll.map(function (r) { return "#" + r.x; }),
        datasets: [{ label: "Rolling accuracy %", data: roll.map(function (r) { return r.y; }), borderColor: brand, backgroundColor: mix(brand, 14), fill: true, tension: .35, pointRadius: 0, borderWidth: 2 }]
      },
      options: baseOpts({ scales: { x: { grid: { display: false }, ticks: { color: css("--muted"), maxTicksLimit: 8 } }, y: { beginAtZero: true, max: 100, ticks: { color: css("--muted") }, grid: { color: mix(css("--muted"), 18) } } } })
    });
  }

  /* ---------------- heatmap ---------------- */
  function renderHeat(M) {
    var box = $("aHeat"); if (!box) return;
    box.innerHTML = "";
    var series = dailySeries(M.A, 84);
    series.forEach(function (d) {
      var cell = document.createElement("i");
      var lvl = d.acc === null ? 0 : d.acc >= 85 ? 4 : d.acc >= 70 ? 3 : d.acc >= 50 ? 2 : 1;
      cell.className = "hc h" + lvl;
      cell.title = d.date.toDateString() + " — " + (d.n ? d.n + " questions · " + d.acc + "% accuracy" : "no practice");
      box.appendChild(cell);
    });
  }

  /* ---------------- panels ---------------- */
  function list(el, items, empty) {
    if (!el) return;
    el.innerHTML = "";
    if (!items.length) { el.innerHTML = '<li class="empty">' + empty + "</li>"; return; }
    items.forEach(function (h) { var li = document.createElement("li"); li.innerHTML = h; el.appendChild(li); });
  }

  function priorityRank(M) {
    var cats = (window.ReasoningBank && window.ReasoningBank.CATEGORIES) || M.topics.map(function (t) { return t.key; });
    return cats.map(function (c) {
      var t = M.topics.filter(function (x) { return x.key === c; })[0] || { acc: 0, n: 0, avg: 0 };
      var gap = 100 - t.acc, unseen = t.n < 5 ? 35 : 0;
      return { key: c, acc: t.acc, n: t.n, avg: t.avg, score: round(gap * 0.7 + unseen) };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 5);
  }

  function insights(M) {
    var out = [];
    if (!M.total) { return ["Complete your first practice set to unlock personalised insights."]; }
    out.push("You have solved <b>" + M.total + "</b> questions at <b>" + round(M.acc) + "%</b> overall accuracy.");
    if (M.trend !== null) out.push(M.trend >= 0
      ? "Accuracy is <b>up " + round(M.trend) + " points</b> versus your previous block of questions — momentum is positive."
      : "Accuracy has <b>slipped " + Math.abs(round(M.trend)) + " points</b> recently; slow down and read each question fully.");
    out.push(M.avgTime <= 45
      ? "Average pace of <b>" + round(M.avgTime) + "s</b> per question is within the campus-test benchmark of 45s."
      : "Average pace of <b>" + round(M.avgTime) + "s</b> per question is above the 45s benchmark — practise timed sets.");
    out.push(M.consistency >= 50
      ? "Practice consistency is strong: active on <b>" + round(M.consistency) + "%</b> of the last 14 days."
      : "Practice consistency is <b>" + round(M.consistency) + "%</b> over the last 14 days — short daily sets will lift readiness fastest.");
    if (M.topics.length) out.push("Strongest area: <b>" + esc(M.topics[0].key) + "</b> (" + M.topics[0].acc + "%). Weakest: <b>" + esc(M.topics[M.topics.length - 1].key) + "</b> (" + M.topics[M.topics.length - 1].acc + "%).");
    return out;
  }

  function steps(M) {
    if (!M.total) return ["Start with a mixed practice set of 15 questions to establish a baseline.", "Log any offline aptitude tests to enrich the assessment profile."];
    var pr = priorityRank(M), out = [];
    out.push("Run a focused set on <b>" + esc(pr[0].key) + "</b> — highest priority for score gain.");
    out.push(M.acc < 70 ? "Target <b>70%+</b> accuracy before moving to Hard difficulty."
      : "Shift to <b>Hard</b> difficulty sets to stretch your ceiling.");
    out.push("Maintain a daily streak of at least <b>20 questions</b>; current streak is " + M.streak + " day" + (M.streak === 1 ? "" : "s") + ".");
    out.push("Review the incorrect-question set weekly to convert repeat mistakes.");
    return out;
  }

  function opportunities(M) {
    var out = [];
    if (M.avgTime > 45) out.push("Reduce average solving time by <b>" + round(M.avgTime - 45) + "s</b> to reach the benchmark pace.");
    if (M.acc < 85) out.push("Lift overall accuracy by <b>" + round(85 - M.acc) + " points</b> to enter the Placement Ready band.");
    if (M.consistency < 70) out.push("Add <b>" + Math.max(1, round((70 - M.consistency) / 100 * 14)) + " more practice days</b> per fortnight for consistency credit.");
    var weakest = M.topics.filter(function (t) { return t.n >= 3 && t.acc < 70; });
    if (weakest.length) out.push("Clear <b>" + weakest.length + "</b> topic" + (weakest.length === 1 ? "" : "s") + " still below the 70% pass line.");
    var covered = M.topics.length, all = (window.ReasoningBank && window.ReasoningBank.CATEGORIES.length) || 10;
    if (covered < all) out.push("Attempt the <b>" + (all - covered) + "</b> categories you have not touched yet for full syllabus coverage.");
    if (!out.length) out.push("All core metrics are in a healthy range — keep rotating across categories to hold the level.");
    return out;
  }

  /* ---------------- reports ---------------- */
  function windowStats(A, days) {
    var cut = Date.now() - days * 86400000;
    var set = A.filter(function (a) { return a.date >= cut; });
    var c = set.filter(function (a) { return a.correct; }).length;
    var secs = set.reduce(function (t, a) { return t + (a.seconds || 0); }, 0);
    var by = {};
    set.forEach(function (a) { var s = by[a.category] || (by[a.category] = { n: 0, c: 0 }); s.n++; if (a.correct) s.c++; });
    var best = null, worst = null;
    Object.keys(by).forEach(function (k) {
      var acc = (by[k].c / by[k].n) * 100;
      if (!best || acc > best.acc) best = { key: k, acc: round(acc) };
      if (!worst || acc < worst.acc) worst = { key: k, acc: round(acc) };
    });
    return { n: set.length, correct: c, acc: set.length ? round((c / set.length) * 100) : 0, avg: set.length ? round(secs / set.length) : 0, topics: Object.keys(by).length, best: best, worst: worst };
  }

  function reportRows(s, label) {
    if (!s.n) return ['<li class="empty">No practice recorded in the last ' + label + ".</li>"];
    return [
      "Questions solved <b>" + s.n + "</b>",
      "Correct answers <b>" + s.correct + "</b>",
      "Accuracy <b>" + s.acc + "%</b>",
      "Average time / question <b>" + s.avg + "s</b>",
      "Topics practised <b>" + s.topics + "</b>",
      "Best topic <b>" + (s.best ? esc(s.best.key) + " · " + s.best.acc + "%" : "—") + "</b>",
      "Focus topic <b>" + (s.worst ? esc(s.worst.key) + " · " + s.worst.acc + "%" : "—") + "</b>"
    ];
  }

  function summaryText(M) {
    var w = windowStats(M.A, 7), m = windowStats(M.A, 30);
    var L = [];
    L.push("PREPDECK — CANDIDATE PERFORMANCE SUMMARY");
    L.push("Generated: " + new Date().toLocaleString());
    L.push("");
    L.push("PLACEMENT READINESS: " + M.readiness + "/100  (" + M.band + ")");
    L.push("  Accuracy " + round(M.acc) + "% | Consistency " + M.consistency + "% | Frequency " + M.frequency + "% | Test performance " + round(M.testPerf) + "%");
    L.push("");
    L.push("OVERVIEW");
    L.push("  Total tests attempted    : " + (M.tests + countSessions(M)));
    L.push("  Total questions solved   : " + M.total);
    L.push("  Average score            : " + round(M.avgScore) + "%");
    L.push("  Overall accuracy         : " + round(M.acc) + "%");
    L.push("  Time efficiency score    : " + M.timeEff + "/100");
    L.push("  Avg time per question    : " + round(M.avgTime) + "s");
    L.push("  Learning progress index  : " + M.lpi + "/100");
    L.push("  Daily practice streak    : " + M.streak + " day(s)");
    L.push("");
    L.push("TOPIC-WISE ACCURACY");
    M.topics.forEach(function (t) { L.push("  " + pad(t.key, 30) + t.acc + "%  (" + t.n + " questions, avg " + t.avg + "s)"); });
    if (!M.topics.length) L.push("  No topic data yet.");
    L.push("");
    L.push("DIFFICULTY-WISE PERFORMANCE");
    ["Easy", "Medium", "Hard"].forEach(function (k) {
      var f = M.levels.filter(function (l) { return l.key === k; })[0];
      L.push("  " + pad(k, 30) + (f ? f.acc + "%  (" + f.n + " questions)" : "not attempted"));
    });
    L.push("");
    L.push("WEEKLY REPORT (last 7 days)");
    L.push("  Questions " + w.n + " | Accuracy " + w.acc + "% | Avg time " + w.avg + "s | Topics " + w.topics);
    L.push("MONTHLY REPORT (last 30 days)");
    L.push("  Questions " + m.n + " | Accuracy " + m.acc + "% | Avg time " + m.avg + "s | Topics " + m.topics);
    L.push("");
    L.push("PRACTICE PRIORITY RANKING");
    priorityRank(M).forEach(function (p, i) { L.push("  " + (i + 1) + ". " + pad(p.key, 28) + p.acc + "% over " + p.n + " questions"); });
    L.push("");
    L.push("RECOMMENDED NEXT STEPS");
    steps(M).forEach(function (s, i) { L.push("  " + (i + 1) + ". " + strip(s)); });
    L.push("");
    L.push("Report generated locally by PrepDeck. No data leaves this device.");
    return L.join("\n");
  }
  function pad(s, n) { s = String(s); while (s.length < n) s += " "; return s; }
  function strip(s) { return String(s).replace(/<[^>]+>/g, ""); }

  function countSessions(M) {
    var seen = {};
    M.A.forEach(function (a) { seen[Math.floor(a.date / 600000)] = 1; });
    return Object.keys(seen).length;
  }

  /* ---------------- render ---------------- */
  function render() {
    var M = compute();
    var sessions = countSessions(M);

    /* readiness */
    $("aReadiness").textContent = M.readiness;
    $("aRing").style.setProperty("--p", M.readiness + "%");
    $("aLevelBadge").textContent = M.band;
    $("aLevelBadge").className = "badge lv-" + M.band.toLowerCase().replace(/\s+/g, "-");
    $("aLevel").textContent = M.band;
    $("aLevelTitle").textContent = M.band === "Placement Ready" ? "Interview-ready performance profile"
      : M.band === "Advanced" ? "Strong candidate — polish the final gaps"
        : M.band === "Intermediate" ? "Solid base, accuracy needs consolidation"
          : "Building the fundamentals";
    $("aLevelNote").textContent = M.total
      ? "Readiness is weighted from accuracy (40%), consistency (20%), practice frequency (15%) and test performance (25%)."
      : "Complete a few practice sets to generate your placement readiness profile.";

    var ladder = ["Beginner", "Intermediate", "Advanced", "Placement Ready"];
    $("aLadder").innerHTML = ladder.map(function (l) {
      return '<span class="rung' + (l === M.band ? " on" : "") + '">' + l + "</span>";
    }).join("");
    $("aFactors").innerHTML = [
      ["Accuracy", round(M.acc)], ["Consistency", M.consistency],
      ["Practice frequency", M.frequency], ["Test performance", round(M.testPerf)]
    ].map(function (f) {
      return "<li><span>" + f[0] + "</span><em><i style='width:" + clamp(f[1], 0, 100) + "%'></i></em><b>" + f[1] + "%</b></li>";
    }).join("");

    /* overview */
    $("aTests").textContent = M.tests + sessions;
    $("aTestsSub").textContent = M.tests + " logged · " + sessions + " practice sessions";
    $("aAvgScore").textContent = round(M.avgScore) + "%";
    $("rTotal").textContent = M.total;
    $("rCorrect").textContent = M.correct;
    $("rIncorrect").textContent = M.incorrect;
    $("rAccuracy").textContent = round(M.acc) + "%";
    $("rAvgTime").textContent = round(M.avgTime) + "s";
    $("rStreak").textContent = M.streak + (M.streak === 1 ? " day" : " days");
    $("aTimeEff").textContent = M.timeEff + "/100";
    $("aTimeEffSub").textContent = round(M.avgTime) + "s avg vs 45s benchmark";

    /* metrics */
    var t = $("aTrend");
    if (M.trend === null) { t.textContent = "—"; t.className = ""; $("aTrendSub").textContent = "needs 10+ questions"; }
    else {
      t.textContent = (M.trend >= 0 ? "▲ +" : "▼ ") + round(M.trend) + " pts";
      t.className = M.trend >= 0 ? "up" : "down";
      $("aTrendSub").textContent = "last 20 vs previous 20";
    }
    $("aLPI").textContent = M.lpi + "/100";

    renderCharts(M);
    renderHeat(M);

    list($("aFocus"), priorityRank(M).slice(0, 4).map(function (p) {
      return "<span>" + esc(p.key) + " <em><i style='width:" + clamp(p.acc, 2, 100) + "%'></i></em></span><b>" + p.acc + "% <small>(" + p.n + ")</small></b>";
    }), "Practise a few sets to generate focus recommendations.");

    var pr = priorityRank(M);
    $("aPriority").innerHTML = pr.map(function (p) {
      var tag = p.n < 5 ? "Low coverage" : p.acc < 50 ? "Critical" : p.acc < 70 ? "Improve" : "Maintain";
      return "<li><span>" + esc(p.key) + "</span><small class='tag'>" + tag + "</small><b>" + p.acc + "%</b></li>";
    }).join("");

    list($("aInsights"), insights(M), "");
    list($("aSteps"), steps(M), "");
    list($("aSuggest"), priorityRank(M).slice(0, 4).map(function (p) {
      var lvl = p.acc >= 80 ? "Hard" : p.acc >= 55 ? "Medium" : "Easy";
      return "<b>" + esc(p.key) + "</b> at <b>" + lvl + "</b> level — 15 question set";
    }), "");
    list($("aOpps"), opportunities(M), "");

    /* reports */
    var w = windowStats(M.A, 7), m = windowStats(M.A, 30);
    list($("aWeekReport"), reportRows(w, "7 days"), "");
    list($("aMonthReport"), reportRows(m, "30 days"), "");
    $("aMonthTotal").textContent = m.n + " question" + (m.n === 1 ? "" : "s") + " in the last 30 days";
    $("aUpdated").textContent = "Last updated " + new Date().toLocaleString();

    /* persist a snapshot */
    try {
      localStorage.setItem(AKEY, JSON.stringify({
        updated: Date.now(), readiness: M.readiness, band: M.band, accuracy: round(M.acc),
        questions: M.total, tests: M.tests + sessions, avgScore: round(M.avgScore),
        timeEfficiency: M.timeEff, lpi: M.lpi, streak: M.streak, consistency: M.consistency,
        topics: M.topics, levels: M.levels
      }));
    } catch (e) { /* storage full — snapshot is optional */ }

    return M;
  }

  /* download */
  $("aDownload").addEventListener("click", function () {
    var M = compute();
    var blob = new Blob([summaryText(M)], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "PrepDeck-Performance-Summary-" + new Date().toISOString().slice(0, 10) + ".txt";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  /* keep in sync with the reasoning module and tab switches */
  if (window.PrepDeckReasoning) {
    var base = window.PrepDeckReasoning.render;
    window.PrepDeckReasoning.render = function () { base(); render(); };
  }
  document.querySelectorAll(".rtab").forEach(function (b) {
    b.addEventListener("click", function () { if (b.dataset.pane === "analytics") render(); });
  });
  window.addEventListener("storage", render);
  window.PrepDeckAssessment = { render: render, summary: summaryText, compute: compute };
  render();
})();
