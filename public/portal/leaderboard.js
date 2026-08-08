/* PrepDeck — Leaderboard & Ranking System (Local Storage only) */
(function () {
  "use strict";
  var LKEY = "prepdeck.leaderboard";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("page-rank")) return;

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

  /* ---------------- deterministic cohort ---------------- */
  var NAMES = [
    "Aarav Menon", "Diya Sharma", "Rohan Iyer", "Ishita Nair", "Karthik Rao",
    "Sneha Kulkarni", "Aditya Verma", "Meera Pillai", "Rahul Deshmukh", "Ananya Bose",
    "Vikram Reddy", "Pooja Jain", "Siddharth Ghosh", "Nandini Rao", "Arjun Kapoor",
    "Tanvi Joshi", "Manish Gupta", "Riya Chandran", "Harsh Patel", "Lakshmi Menon",
    "Neel Saxena", "Kavya Krishnan", "Devansh Mehta", "Shreya Banerjee"
  ];
  var COLLEGES = ["NIT Trichy", "VIT Vellore", "SRM Chennai", "PES Bengaluru", "BIT Mesra", "Anna University", "IIIT Hyderabad", "Amrita Coimbatore"];

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function buildCohort() {
    return NAMES.map(function (name, i) {
      var r = rng(i * 7919 + 13);
      var base = 34 + Math.round(r() * 58);
      function jitter(sp) { return round(clamp(base + (r() - 0.5) * sp, 12, 99)); }
      var aptitude = jitter(24), reasoning = jitter(24), coding = jitter(28), interview = jitter(26);
      var accuracy = round(clamp((aptitude + reasoning) / 2 + (r() - 0.5) * 10, 15, 98));
      var consistency = round(clamp(base + (r() - 0.5) * 34, 10, 100));
      var completion = round(clamp(base + (r() - 0.5) * 30, 10, 100));
      var tests = 4 + Math.round(r() * 40);
      var hours = round(8 + r() * 120);
      /* activity spread over the last 90 days for time-window rankings */
      var act = {}, d, k, j;
      for (j = 0; j < 90; j++) {
        d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - j);
        k = dayKey(d.getTime());
        act[k] = r() < consistency / 130 ? round(20 + r() * 120 * (base / 70)) : 0;
      }
      return {
        id: "peer-" + i, name: name, college: COLLEGES[i % COLLEGES.length],
        aptitude: aptitude, reasoning: reasoning, coding: coding, interview: interview,
        accuracy: accuracy, consistency: consistency, completion: completion,
        tests: tests, hours: hours, activity: act
      };
    });
  }

  function cohort() {
    var store = read(LKEY, {}) || {};
    if (!store.cohort || store.cohort.length !== NAMES.length || !store.cohort[0].activity) {
      store.cohort = buildCohort();
      write(LKEY, store);
    }
    return store.cohort;
  }

  /* ---------------- scoring ---------------- */
  function points(c) {
    return round(
      c.accuracy * 3.2 +
      ((c.aptitude + c.reasoning + c.coding + c.interview) / 4) * 3.6 +
      c.consistency * 1.8 +
      c.completion * 1.4 +
      c.interview * 1.2 +
      clamp(c.tests, 0, 60) * 4
    );
  }
  function readinessOf(c) {
    return round(clamp(c.aptitude * 0.26 + c.coding * 0.24 + c.interview * 0.2 + c.reasoning * 0.16 + c.consistency * 0.14, 0, 100));
  }
  function catScore(c, cat) {
    if (cat === "aptitude") return c.aptitude;
    if (cat === "reasoning") return c.reasoning;
    if (cat === "coding") return c.coding;
    if (cat === "interview") return c.interview;
    return round(points(c) / 12);
  }

  function periodDays(period) {
    return period === "daily" ? 1 : period === "weekly" ? 7 : period === "monthly" ? 30 : 90;
  }
  function windowActivity(c, period) {
    var days = periodDays(period), total = 0, d, i;
    for (i = 0; i < days; i++) {
      d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      total += (c.activity && c.activity[dayKey(d.getTime())]) || 0;
    }
    return total;
  }

  /* ---------------- the user ---------------- */
  function me() {
    var s = (window.PrepDeckDashboard && window.PrepDeckDashboard.collect)
      ? window.PrepDeckDashboard.collect() : null;
    var profile = read(LKEY, {}) || {};
    var name = (profile.profile && profile.profile.name) || "You";
    var act = {}, i, d;
    var heat = (s && s.heat) || [];
    heat.forEach(function (h) { act[h.date] = h.n * 12; });
    var completion = s ? round(clamp((s.codeAttempts ? (s.solved / s.codeAttempts) * 100 : 0) * 0.5 + clamp((s.testCount / 20) * 100, 0, 100) * 0.5, 0, 100)) : 0;
    return {
      id: "me", you: true, name: name, college: "Your profile",
      aptitude: s ? s.aptitude : 0, reasoning: s ? s.reasoning : 0,
      coding: s ? s.codingScore : 0, interview: s ? s.interviewScore : 0,
      accuracy: s ? s.accuracy : 0, consistency: s ? s.consistency : 0,
      completion: completion, tests: s ? s.testCount : 0, hours: s ? s.hours : 0,
      streak: s ? s.streak : 0, resume: s ? s.resumeScore : 0,
      readinessRaw: s ? s.readiness : 0, trend: s ? s.trend : null,
      improved: s ? s.improvedSkill : null, topics: s ? s.topics : [],
      weak: s ? s.weak : [], activity: act, signals: s
    };
  }

  function table(cat, period) {
    var all = cohort().concat([me()]);
    var rows = all.map(function (c) {
      var pts = points(c);
      var win = windowActivity(c, period);
      var factor = period === "all" ? 1 : clamp(0.35 + win / (periodDays(period) * 90), 0.15, 1.25);
      var score = period === "all" ? pts : round(pts * factor);
      return {
        ref: c, name: c.name, you: !!c.you, college: c.college,
        score: score, catScore: catScore(c, cat), accuracy: c.accuracy,
        readiness: c.you ? (c.readinessRaw || readinessOf(c)) : readinessOf(c),
        tests: c.tests, hours: c.hours, consistency: c.consistency, completion: c.completion
      };
    });
    var keyed = rows.map(function (r) {
      r.sortKey = cat === "overall" ? r.score : round(r.catScore * 10 + r.score / 40);
      return r;
    });
    keyed.sort(function (a, b) { return b.sortKey - a.sortKey; });
    keyed.forEach(function (r, i) { r.rank = i + 1; });
    return keyed;
  }

  /* ---------------- badges & titles ---------------- */
  var BADGES = [
    { id: "apt", label: "Aptitude Master", icon: "🧮", test: function (u) { return u.aptitude >= 75; }, need: "Reach 75 in aptitude" },
    { id: "rea", label: "Reasoning Expert", icon: "🧩", test: function (u) { return u.reasoning >= 75; }, need: "Reach 75% reasoning accuracy" },
    { id: "cod", label: "Coding Champion", icon: "💻", test: function (u) { return u.coding >= 70; }, need: "Reach a 70 coding success rate" },
    { id: "int", label: "Interview Pro", icon: "🎤", test: function (u) { return u.interview >= 70; }, need: "Score 70+ in mock interviews" },
    { id: "con", label: "Consistency King", icon: "🔥", test: function (u) { return u.streak >= 7 || u.consistency >= 70; }, need: "Maintain a 7-day practice streak" },
    { id: "rdy", label: "Placement Ready", icon: "🏆", test: function (u) { return (u.readinessRaw || 0) >= 85; }, need: "Reach 85 placement readiness" }
  ];
  function badgesFor(u) {
    return BADGES.map(function (b) { return { badge: b, earned: !!b.test(u) }; });
  }
  function titleFor(u, rank, total) {
    var pct = rank / total;
    if ((u.readinessRaw || 0) >= 85) return { title: "Placement Ready Candidate", note: "Recruiter-ready profile — keep interview practice warm." };
    if (pct <= 0.1) return { title: "Elite Candidate", note: "Top 10% of the cohort — sustain the momentum." };
    if ((u.trend || 0) >= 8) return { title: "Fast Learner", note: "Your recent accuracy is climbing faster than the cohort." };
    if (u.consistency >= 70) return { title: "Consistent Performer", note: "Reliable daily practice is compounding your scores." };
    return { title: "Rising Star", note: "Early momentum — build depth across modules to climb ranks." };
  }

  var RANK_TIERS = [
    { name: "Bronze", min: 0 }, { name: "Silver", min: 450 }, { name: "Gold", min: 800 },
    { name: "Platinum", min: 1150 }, { name: "Diamond", min: 1500 }, { name: "Elite", min: 1850 }
  ];
  function tierFor(pts) {
    var cur = RANK_TIERS[0], nxt = RANK_TIERS[1], i;
    for (i = 0; i < RANK_TIERS.length; i++) {
      if (pts >= RANK_TIERS[i].min) { cur = RANK_TIERS[i]; nxt = RANK_TIERS[i + 1] || null; }
    }
    return { cur: cur, next: nxt };
  }

  /* ---------------- history ---------------- */
  function trackHistory(rank, pts) {
    var store = read(LKEY, {}) || {};
    var hist = store.history || [];
    var today = dayKey(Date.now());
    var last = hist[hist.length - 1];
    if (last && last.date === today) { last.rank = rank; last.points = pts; }
    else hist.push({ date: today, rank: rank, points: pts });
    store.history = hist.slice(-30);
    store.best = Math.min(store.best || rank, rank);
    write(LKEY, store);
    return store;
  }

  /* ---------------- state ---------------- */
  var CATS = [
    { id: "overall", label: "Overall Performance" },
    { id: "aptitude", label: "Aptitude" },
    { id: "reasoning", label: "Reasoning" },
    { id: "coding", label: "Coding" },
    { id: "interview", label: "Mock Interviews" }
  ];
  var PERIODS = [
    { id: "daily", label: "Daily" }, { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" }, { id: "all", label: "All-time" }
  ];
  var state = { cat: "overall", period: "all" };

  function tabs(container, items, current, onPick) {
    container.innerHTML = "";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lb-tab" + (it.id === current ? " on" : "");
      b.textContent = it.label;
      b.addEventListener("click", function () { onPick(it.id); });
      container.appendChild(b);
    });
  }

  /* ---------------- render ---------------- */
  function render() {
    var u = me();
    var rows = table(state.cat, state.period);
    var allTime = table("overall", "all");
    var myAll = allTime.filter(function (r) { return r.you; })[0];
    var mine = rows.filter(function (r) { return r.you; })[0];
    var total = rows.length;
    var pts = myAll.score;
    var store = trackHistory(myAll.rank, pts);
    var hist = store.history || [];
    var prev = hist.length > 1 ? hist[hist.length - 2] : null;
    var change = prev ? prev.rank - myAll.rank : 0;
    var t = titleFor(u, myAll.rank, total);

    /* banner */
    $("lbRankNum").textContent = "#" + myAll.rank;
    $("lbRing").style.setProperty("--p", clamp(round((1 - myAll.rank / total) * 100), 3, 100));
    $("lbTitle").textContent = t.title;
    $("lbTitleNote").textContent = t.note;
    var pill = $("lbBandPill");
    pill.textContent = band(u.readinessRaw || 0);
    pill.className = "pill " + tone(u.readinessRaw || 0);

    var meta = [
      ["Current rank", "#" + myAll.rank + " of " + total],
      ["Highest rank", "#" + (store.best || myAll.rank)],
      ["Placement readiness", round(u.readinessRaw) + "/100"],
      ["Accuracy rate", round(u.accuracy) + "%"],
      ["Practice hours", u.hours + " h"],
      ["Percentile", round(clamp((1 - myAll.rank / total) * 100, 0, 99)) + "th"]
    ];
    $("lbProfileMeta").innerHTML = meta.map(function (m) {
      return '<span><small>' + esc(m[0]) + '</small><b>' + esc(m[1]) + '</b></span>';
    }).join("");

    var bl = badgesFor(u);
    $("lbBadges").innerHTML = bl.map(function (b) {
      return '<span class="lb-badge' + (b.earned ? " on" : "") + '" title="' + esc(b.earned ? "Earned" : b.badge.need) + '">' +
        b.badge.icon + " " + esc(b.badge.label) + "</span>";
    }).join("");

    /* progress to next rank */
    var tier = tierFor(pts);
    var need = tier.next ? tier.next.min : tier.cur.min;
    var floor = tier.cur.min;
    var progress = tier.next ? clamp(((pts - floor) / (need - floor)) * 100, 0, 100) : 100;
    $("lbPointsPill").textContent = pts + " pts · " + tier.cur.name;
    $("lbNextBar").style.width = progress + "%";
    $("lbNextNote").textContent = tier.next
      ? "You need " + Math.max(0, need - pts) + " more points to reach " + tier.next.name + " tier."
      : "You have reached the highest tier — defend your position.";
    var ahead = allTime[myAll.rank - 2];
    $("lbNextGrid").innerHTML = [
      ["Current points", pts],
      ["Required points", tier.next ? need : "Max"],
      ["Tier progress", round(progress) + "%"],
      ["Gap to rank #" + Math.max(1, myAll.rank - 1), ahead ? (ahead.score - pts) + " pts" : "You lead"]
    ].map(function (m) { return '<div class="stat"><span>' + esc(m[0]) + "</span><strong>" + esc(m[1]) + "</strong></div>"; }).join("");

    var sug = [];
    if (u.accuracy < 70) sug.push("Lift reasoning accuracy above 70% — each point adds ~3 ranking points.");
    if (u.consistency < 70) sug.push("Practice on " + Math.max(1, 10 - round(u.consistency / 10)) + " more days over the next fortnight to raise your consistency multiplier.");
    if (u.coding < 70) sug.push("Solve 5 more coding problems in your weak topics to boost the completion component.");
    if (!u.interview) sug.push("Complete a mock interview — interview performance carries 1.2x weight in the ranking formula.");
    if ((u.weak || []).length) sug.push("Target " + esc(u.weak.slice(0, 2).map(function (w) { return w.topic; }).join(" and ")) + " — your lowest-accuracy topics.");
    if (!sug.length) sug.push("Maintain your current cadence and defend your rank with weekly full-length tests.");
    $("lbSuggestions").innerHTML = '<ul class="lb-list">' + sug.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ul>";

    /* tabs + table */
    tabs($("lbCatTabs"), CATS, state.cat, function (id) { state.cat = id; render(); });
    tabs($("lbPeriodTabs"), PERIODS, state.period, function (id) { state.period = id; render(); });

    var tb = $("lbRows");
    tb.innerHTML = "";
    rows.slice(0, 20).concat(mine.rank > 20 ? [mine] : []).forEach(function (r) {
      var tr = document.createElement("tr");
      if (r.you) tr.className = "you";
      var delta = r.you ? change : 0;
      var medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : "";
      tr.innerHTML =
        "<td><b>#" + r.rank + "</b> " + medal + "</td>" +
        '<td><span class="lb-name">' + esc(r.name) + (r.you ? ' <em class="pill pill-ok">You</em>' : "") +
        "</span><small class='muted'>" + esc(r.college) + "</small></td>" +
        "<td>" + r.score + "</td>" +
        "<td>" + round(r.accuracy) + "%</td>" +
        "<td>" + round(r.readiness) + "</td>" +
        "<td>" + r.tests + "</td>" +
        '<td class="' + (delta > 0 ? "up" : delta < 0 ? "down" : "flat") + '">' +
        (delta > 0 ? "▲ " + delta : delta < 0 ? "▼ " + Math.abs(delta) : "–") + "</td>";
      tb.appendChild(tr);
    });

    /* charts */
    var brand = css("--brand", "#4f46e5");
    var ok = css("--ok", "#16a34a");
    var muted = css("--muted", "#64748b");
    var labels = hist.map(function (h) { return h.date.slice(5); });
    paint("lbRankChart", {
      type: "line",
      data: {
        labels: labels.length > 1 ? labels : [labels[0] || "today", "today"],
        datasets: [{
          label: "Rank position",
          data: labels.length > 1 ? hist.map(function (h) { return h.rank; }) : [myAll.rank, myAll.rank],
          borderColor: brand, backgroundColor: brand, tension: 0.35, fill: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { reverse: true, min: 1, max: total, ticks: { precision: 0 } } },
        plugins: { legend: { display: false } }
      }
    });

    var avg = function (key) {
      var vals = allTime.filter(function (r) { return !r.you; }).map(function (r) { return r.ref[key] || 0; });
      return round(vals.reduce(function (a, b) { return a + b; }, 0) / (vals.length || 1));
    };
    var topSlice = allTime.filter(function (r) { return !r.you; }).slice(0, Math.max(1, round(allTime.length * 0.1)));
    var top10 = function (key) {
      return round(topSlice.reduce(function (s, r) { return s + (r.ref[key] || 0); }, 0) / topSlice.length);
    };
    var keys = ["aptitude", "reasoning", "coding", "interview", "consistency"];
    paint("lbCompareChart", {
      type: "bar",
      data: {
        labels: ["Aptitude", "Reasoning", "Coding", "Interview", "Consistency"],
        datasets: [
          { label: "You", data: keys.map(function (k) { return round(u[k] || 0); }), backgroundColor: brand },
          { label: "Cohort average", data: keys.map(avg), backgroundColor: muted },
          { label: "Top 10%", data: keys.map(top10), backgroundColor: ok }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
    });

    /* benchmarking */
    var sorted = allTime.filter(function (r) { return !r.you; }).map(function (r) { return r.score; }).sort(function (a, b) { return b - a; });
    function quantile(p) { return sorted[clamp(Math.floor(sorted.length * p), 0, sorted.length - 1)]; }
    var benches = [
      { label: "Average candidate", value: round(sorted.reduce(function (a, b) { return a + b; }, 0) / sorted.length) },
      { label: "Top 25%", value: quantile(0.25) },
      { label: "Top 10%", value: quantile(0.1) },
      { label: "Placement-ready benchmark", value: RANK_TIERS[4].min }
    ];
    $("lbBenchmarks").innerHTML = benches.map(function (b) {
      var ratio = clamp(round((pts / b.value) * 100), 0, 100);
      var gap = pts - b.value;
      return '<div class="lb-bench"><div class="lb-bench-head"><span>' + esc(b.label) + "</span><b>" + b.value + " pts</b></div>" +
        '<div class="bar slim"><i style="width:' + ratio + '%"></i></div>' +
        '<small class="muted">' + (gap >= 0 ? "You are " + gap + " pts above this benchmark." : "You need " + Math.abs(gap) + " more points to match this benchmark.") + "</small></div>";
    }).join("");

    /* competitor comparison — nearest rivals */
    var around = allTime.slice(Math.max(0, myAll.rank - 3), myAll.rank + 2).filter(function (r) { return !r.you; }).slice(0, 4);
    $("lbCompetitors").innerHTML = around.map(function (r) {
      var diff = pts - r.score;
      return '<div class="lb-comp"><div><b>#' + r.rank + " " + esc(r.name) + "</b><small class='muted'>" + esc(r.college) +
        " · " + round(r.accuracy) + "% accuracy · readiness " + round(r.readiness) + "</small></div>" +
        '<span class="pill ' + (diff >= 0 ? "pill-ok" : "pill-bad") + '">' + (diff >= 0 ? "+" : "") + diff + " pts</span></div>";
    }).join("") || '<p class="muted">No close competitors — you are leading the cohort.</p>';

    /* hall of fame */
    function fame(title, list, fmt) {
      return '<div class="lb-fame-card"><h4>' + esc(title) + "</h4><ol>" +
        list.map(function (r) { return "<li><span>" + esc(r.name) + "</span><b>" + esc(fmt(r)) + "</b></li>"; }).join("") + "</ol></div>";
    }
    var byAcc = allTime.slice().sort(function (a, b) { return b.accuracy - a.accuracy; }).slice(0, 5);
    var byCon = allTime.slice().sort(function (a, b) { return b.consistency - a.consistency; }).slice(0, 5);
    var byLearn = allTime.slice().sort(function (a, b) { return (b.completion + b.readiness) - (a.completion + a.readiness); }).slice(0, 5);
    $("lbFame").innerHTML =
      fame("Top performers", allTime.slice(0, 5), function (r) { return r.score + " pts"; }) +
      fame("Highest accuracy", byAcc, function (r) { return round(r.accuracy) + "%"; }) +
      fame("Most consistent", byCon, function (r) { return round(r.consistency) + "%"; }) +
      fame("Fastest learners", byLearn, function (r) { return "Readiness " + round(r.readiness); });

    /* achievement showcase */
    $("lbAchievements").innerHTML = bl.map(function (b) {
      return '<div class="lb-ach-card' + (b.earned ? " on" : "") + '"><span class="lb-ach-icon">' + b.badge.icon + "</span>" +
        "<div><b>" + esc(b.badge.label) + "</b><small class='muted'>" + esc(b.earned ? "Earned — displayed on your profile" : b.badge.need) + "</small></div>" +
        '<span class="pill ' + (b.earned ? "pill-ok" : "pill-mid") + '">' + (b.earned ? "Earned" : "Locked") + "</span></div>";
    }).join("");
  }

  function download() {
    var u = me();
    var allTime = table("overall", "all");
    var mine = allTime.filter(function (r) { return r.you; })[0];
    var lines = [
      "PREPDECK — RANKING & BENCHMARK REPORT",
      "Generated: " + new Date().toLocaleString(),
      "",
      "Rank: #" + mine.rank + " of " + allTime.length,
      "Total score: " + mine.score + " pts",
      "Accuracy: " + round(u.accuracy) + "%",
      "Placement readiness: " + round(u.readinessRaw) + " (" + band(u.readinessRaw || 0) + ")",
      "Tests attempted: " + u.tests,
      "Practice hours: " + u.hours,
      "",
      "BADGES EARNED",
      badgesFor(u).filter(function (b) { return b.earned; }).map(function (b) { return " - " + b.badge.label; }).join("\n") || " - none yet",
      "",
      "TOP 10 LEADERBOARD",
      allTime.slice(0, 10).map(function (r) { return " " + r.rank + ". " + r.name + " — " + r.score + " pts (" + round(r.accuracy) + "% accuracy)"; }).join("\n")
    ];
    var blob = new Blob([lines.join("\n")], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prepdeck-ranking-report.txt";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  if ($("lbRefresh")) $("lbRefresh").addEventListener("click", render);
  if ($("lbDownload")) $("lbDownload").addEventListener("click", download);
  window.addEventListener("storage", function () {
    if ($("page-rank").classList.contains("active")) render();
  });

  window.PrepDeckRank = { render: render };
})();
