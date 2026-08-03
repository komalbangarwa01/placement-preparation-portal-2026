/* PrepDeck — Coding Practice Platform (Local Storage only) */
(function () {
  "use strict";
  var KEY = "prepdeck.coding";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("page-code") || !window.PrepDeckCodingBank) return;

  var BANK = window.PrepDeckCodingBank;
  var PAGE_SIZE = 12;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function round(n) { return Math.round(n || 0); }
  function dayKey(ts) { var d = new Date(ts); return d.toISOString().slice(0, 10); }

  /* ---------------- store ---------------- */
  var store = (function () {
    var fb = { progress: {}, bookmarks: [], revision: [], code: {}, log: [], lists: {}, company: "TCS" };
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (!v || typeof v !== "object") return fb;
      Object.keys(fb).forEach(function (k) { if (v[k] == null) v[k] = fb[k]; });
      return v;
    } catch (e) { return fb; }
  })();
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  /* ---------------- language templates ---------------- */
  var TEMPLATES = {
    javascript: function (p) {
      return "// " + p.title + " — " + p.topic + " (" + p.difficulty + ")\n" +
        "// Read the sample input below and print the expected output.\n\n" +
        "function solve(input) {\n  // your code here\n  return \"\";\n}\n\n" +
        "console.log(solve(" + JSON.stringify(p.sampleInput) + "));\n";
    },
    python: function (p) {
      return "# " + p.title + " — " + p.topic + " (" + p.difficulty + ")\n\n" +
        "def solve(data):\n    # your code here\n    return \"\"\n\n\n" +
        "if __name__ == \"__main__\":\n    print(solve(" + JSON.stringify(p.sampleInput) + "))\n";
    },
    java: function (p) {
      return "// " + p.title + " — " + p.topic + " (" + p.difficulty + ")\n\n" +
        "public class Solution {\n    static String solve(String data) {\n        // your code here\n        return \"\";\n    }\n\n" +
        "    public static void main(String[] args) {\n        System.out.println(solve(" + JSON.stringify(p.sampleInput) + "));\n    }\n}\n";
    },
    cpp: function (p) {
      return "// " + p.title + " — " + p.topic + " (" + p.difficulty + ")\n\n" +
        "#include <bits/stdc++.h>\nusing namespace std;\n\n" +
        "string solve(string data) {\n    // your code here\n    return \"\";\n}\n\n" +
        "int main() {\n    cout << solve(" + JSON.stringify(p.sampleInput) + ") << endl;\n    return 0;\n}\n";
    }
  };
  var LANG_LABEL = { javascript: "JavaScript", python: "Python", java: "Java", cpp: "C++" };

  /* ---------------- state ---------------- */
  var state = { page: 0, current: null, lang: "javascript", view: "library" };
  var charts = {};

  function progressOf(id) { return store.progress[id] || null; }
  function statusOf(id) { var p = progressOf(id); return p ? p.status : "todo"; }

  /* ---------------- filtering ---------------- */
  function filtered() {
    var topic = $("cdTopic").value, diff = $("cdDiff").value, comp = $("cdCompany").value;
    var st = $("cdStatus").value, q = $("cdSearch").value.trim().toLowerCase();
    return BANK.problems.filter(function (p) {
      if (topic && p.topic !== topic) return false;
      if (diff && p.difficulty !== diff) return false;
      if (comp && p.companies.indexOf(comp) < 0) return false;
      if (q && p.title.toLowerCase().indexOf(q) < 0 && p.topic.toLowerCase().indexOf(q) < 0) return false;
      if (st === "bookmark") return store.bookmarks.indexOf(p.id) >= 0;
      if (st === "revision") return store.revision.indexOf(p.id) >= 0;
      if (st) return statusOf(p.id) === st;
      return true;
    });
  }

  function diffPill(d) {
    return '<span class="pill sm ' + (d === "Easy" ? "pill-ok" : d === "Medium" ? "pill-mid" : "pill-bad") + '">' + d + "</span>";
  }

  function renderList() {
    var list = filtered();
    var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = clamp(state.page, 0, pages - 1);
    var slice = list.slice(state.page * PAGE_SIZE, state.page * PAGE_SIZE + PAGE_SIZE);
    $("cdCount").textContent = list.length + " problem" + (list.length === 1 ? "" : "s") + " match your filters";
    $("cdPageInfo").textContent = "Page " + (state.page + 1) + " of " + pages;
    var html = slice.map(function (p) {
      var st = statusOf(p.id);
      var mark = st === "solved" ? '<span class="pill sm pill-ok">Solved</span>'
        : st === "attempted" ? '<span class="pill sm pill-mid">Attempted</span>'
        : '<span class="pill sm">Not started</span>';
      return '<button class="cd-row' + (state.current && state.current.id === p.id ? " on" : "") + '" data-id="' + p.id + '">' +
        '<span class="cd-row-main"><b>' + esc(p.title) + '</b>' +
        '<small class="muted">' + esc(p.topic) + ' · ' + p.companies.map(esc).join(", ") + ' · ~' + p.minutes + ' min</small></span>' +
        '<span class="cd-row-tags">' + (store.bookmarks.indexOf(p.id) >= 0 ? '<span class="pill sm">★</span>' : "") +
        (store.revision.indexOf(p.id) >= 0 ? '<span class="pill sm">Revise</span>' : "") +
        diffPill(p.difficulty) + mark + "</span></button>";
    }).join("");
    $("cdList").innerHTML = html || '<p class="empty">No problems match these filters. Try widening the search.</p>';
    Array.prototype.forEach.call($("cdList").querySelectorAll(".cd-row"), function (b) {
      b.addEventListener("click", function () { open(b.dataset.id); });
    });
  }

  /* ---------------- workspace ---------------- */
  function codeKey(id, lang) { return id + "::" + lang; }

  function highlight() {
    var el = $("cdHighlight");
    var lang = state.lang;
    el.className = "language-" + (lang === "cpp" ? "cpp" : lang);
    var text = $("cdCode").value;
    el.textContent = text + "\n";
    if (window.Prism && window.Prism.languages[lang]) window.Prism.highlightElement(el);
    el.parentNode.scrollTop = $("cdCode").scrollTop;
    el.parentNode.scrollLeft = $("cdCode").scrollLeft;
  }

  function loadCode() {
    var p = state.current;
    var saved = store.code[codeKey(p.id, state.lang)];
    $("cdCode").value = saved != null ? saved : TEMPLATES[state.lang](p);
    highlight();
  }

  function open(id) {
    var p = BANK.problems.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    state.current = p;
    $("cdWorkspace").hidden = false;
    $("cdTitle").textContent = p.title;
    $("cdMeta").innerHTML = esc(p.topic) + " · " + p.difficulty + " · Acceptance " + round(p.acceptance) +
      "% · Asked at " + p.companies.map(esc).join(", ");
    $("cdStatement").innerHTML = p.statement.split("\n\n").map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("");
    $("cdConstraints").innerHTML = p.constraints.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("");
    $("cdSampleIn").textContent = p.sampleInput;
    $("cdSampleOut").textContent = p.sampleOutput;
    $("cdExplain").textContent = p.explanation;
    $("cdTests").innerHTML = p.tests.map(function (t, i) {
      return '<div class="cd-test"><b>Test ' + (i + 1) + '</b><pre>Input: ' + esc(t.input) + "\nExpected: " + esc(t.output) + "</pre></div>";
    }).join("");
    $("cdConsole").textContent = "Run your solution to see the output here.";
    syncMarks();
    loadCode();
    renderList();
    $("cdWorkspace").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function syncMarks() {
    var p = state.current; if (!p) return;
    var b = store.bookmarks.indexOf(p.id) >= 0;
    var r = store.revision.indexOf(p.id) >= 0;
    $("cdBookmark").textContent = b ? "★ Bookmarked" : "☆ Bookmark";
    $("cdRevision").textContent = r ? "In revision list" : "Mark for revision";
  }

  function toggle(arr, id) {
    var i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1); else arr.push(id);
    persist();
  }

  function record(status) {
    var p = state.current; if (!p) return;
    var prev = store.progress[p.id] || { attempts: 0 };
    store.progress[p.id] = {
      status: status === "solved" ? "solved" : (prev.status === "solved" ? "solved" : "attempted"),
      attempts: (prev.attempts || 0) + 1,
      solvedAt: status === "solved" ? Date.now() : prev.solvedAt || null,
      at: Date.now(),
      lang: state.lang,
      topic: p.topic,
      difficulty: p.difficulty
    };
    store.log.push({ id: p.id, topic: p.topic, difficulty: p.difficulty, status: status, at: Date.now(), lang: state.lang });
    if (store.log.length > 800) store.log = store.log.slice(-800);
    persist();
    renderList();
    renderMetrics();
    if (state.view === "analytics") renderAnalytics();
  }

  /* ---------------- run ---------------- */
  function runCode() {
    var p = state.current; if (!p) return;
    var out = $("cdConsole");
    if (state.lang !== "javascript") {
      out.textContent = LANG_LABEL[state.lang] + " runs on a compiler outside the browser, so this editor validates your " +
        "solution against the sample manually.\n\nExpected output: " + p.sampleOutput +
        "\n\nCompare your logic, then use “Mark as solved” once your output matches.";
      return;
    }
    var logs = [];
    var native = console.log;
    try {
      console.log = function () { logs.push(Array.prototype.slice.call(arguments).join(" ")); };
      // eslint-disable-next-line no-new-func
      new Function($("cdCode").value)();
      console.log = native;
      var produced = logs.join("\n").trim();
      var expected = String(p.sampleOutput).trim();
      var pass = produced.replace(/\s+/g, "") === expected.replace(/\s+/g, "");
      out.textContent = "Output:\n" + (produced || "(no output)") + "\n\nExpected:\n" + expected +
        "\n\n" + (pass ? "✓ Sample test passed." : "✗ Sample test did not match yet.");
      out.className = "cd-console " + (pass ? "ok" : "bad");
      if (pass) record("solved");
    } catch (err) {
      console.log = native;
      out.className = "cd-console bad";
      out.textContent = "Runtime error:\n" + (err && err.message ? err.message : String(err));
    }
  }

  /* ---------------- analytics ---------------- */
  function stats() {
    var ids = Object.keys(store.progress);
    var solved = 0, attempted = 0, byTopic = {}, byDiff = {};
    BANK.topics.forEach(function (t) { byTopic[t] = { solved: 0, tried: 0, total: 0 }; });
    BANK.levels.forEach(function (l) { byDiff[l] = { solved: 0, tried: 0, total: 0 }; });
    BANK.problems.forEach(function (p) { byTopic[p.topic].total++; byDiff[p.difficulty].total++; });
    ids.forEach(function (id) {
      var e = store.progress[id];
      var t = byTopic[e.topic], d = byDiff[e.difficulty];
      if (!t || !d) return;
      t.tried++; d.tried++;
      if (e.status === "solved") { solved++; t.solved++; d.solved++; } else attempted++;
    });
    var tried = solved + attempted;
    var success = tried ? round((solved / tried) * 100) : 0;

    var days = {};
    store.log.forEach(function (l) { days[dayKey(l.at)] = true; });
    var streak = 0, cur = new Date();
    for (;;) {
      var k = dayKey(cur.getTime());
      if (days[k]) { streak++; cur.setDate(cur.getDate() - 1); }
      else if (streak === 0 && k === dayKey(Date.now())) { cur.setDate(cur.getDate() - 1); if (!days[dayKey(cur.getTime())]) break; }
      else break;
      if (streak > 400) break;
    }

    var coverage = round((solved / BANK.problems.length) * 100);
    var hardWeight = byDiff.Hard.solved * 3 + byDiff.Medium.solved * 2 + byDiff.Easy.solved;
    var depth = clamp(round((hardWeight / 120) * 100), 0, 100);
    var breadth = clamp(round((BANK.topics.filter(function (t) { return byTopic[t].solved > 0; }).length / BANK.topics.length) * 100), 0, 100);
    var coding = clamp(round(depth * 0.4 + breadth * 0.3 + success * 0.3), 0, 100);
    var dsa = clamp(round(breadth * 0.5 + depth * 0.35 + Math.min(coverage * 4, 100) * 0.15), 0, 100);
    var interview = clamp(round(coding * 0.6 + success * 0.2 + Math.min(streak * 5, 100) * 0.2), 0, 100);

    return {
      solved: solved, attempted: attempted, tried: tried, success: success, streak: streak,
      coverage: coverage, byTopic: byTopic, byDiff: byDiff, breadth: breadth, depth: depth,
      coding: coding, dsa: dsa, interview: interview
    };
  }

  function band(score) {
    return score >= 80 ? "Placement Ready" : score >= 60 ? "Advanced" : score >= 35 ? "Intermediate" : "Beginner";
  }

  function renderMetrics() {
    var s = stats();
    var cards = [
      ["Problems solved", s.solved + " / " + BANK.problems.length],
      ["Success rate", s.success + "%"],
      ["Topics covered", BANK.topics.filter(function (t) { return s.byTopic[t].solved > 0; }).length + " / " + BANK.topics.length],
      ["Coding streak", s.streak + " day" + (s.streak === 1 ? "" : "s")],
      ["Bookmarked", String(store.bookmarks.length)],
      ["Learning progress", s.coverage + "%"]
    ];
    $("cdMetrics").innerHTML = cards.map(function (c) {
      return '<div class="stat"><small>' + esc(c[0]) + "</small><strong>" + esc(c[1]) + "</strong></div>";
    }).join("");
  }

  function topicRanking(s) {
    return BANK.topics.map(function (t) {
      var e = s.byTopic[t];
      var rate = e.tried ? (e.solved / e.tried) * 100 : 0;
      var volume = Math.min(e.solved / 6, 1) * 100;
      return { topic: t, score: round(rate * 0.6 + volume * 0.4), solved: e.solved, tried: e.tried };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  function makeChart(id, cfg) {
    if (!window.Chart) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new window.Chart($(id), cfg);
  }

  function bucketSeries(unitDays, buckets, label) {
    var now = Date.now(), out = [], labels = [];
    for (var i = buckets - 1; i >= 0; i--) {
      var end = now - i * unitDays * 86400000;
      var start = end - unitDays * 86400000;
      var n = store.log.filter(function (l) { return l.status === "solved" && l.at > start && l.at <= end; }).length;
      out.push(n);
      labels.push(label + (buckets - i));
    }
    return { labels: labels, data: out };
  }

  function renderAnalytics() {
    var s = stats();
    $("cdReady").textContent = s.coding;
    $("cdRing").style.setProperty("--p", s.coding);
    $("cdBand").textContent = band(s.coding);
    $("cdBandNote").textContent = s.solved
      ? "You have solved " + s.solved + " problems with a " + s.success + "% success rate across " +
        BANK.topics.filter(function (t) { return s.byTopic[t].solved > 0; }).length + " topics."
      : "Solve problems across topics to build your coding readiness profile.";
    $("cdScores").innerHTML = [
      ["Coding readiness", s.coding], ["DSA readiness", s.dsa], ["Interview readiness", s.interview]
    ].map(function (x) {
      return '<div class="cd-score"><small>' + x[0] + "</small><b>" + x[1] + "</b>" +
        '<span class="bar"><i style="width:' + x[1] + '%"></i></span><small class="muted">' + band(x[1]) + "</small></div>";
    }).join("");

    var rank = topicRanking(s);
    makeChart("cdTopicChart", {
      type: "bar",
      data: {
        labels: BANK.topics.map(function (t) { return t.length > 12 ? t.slice(0, 11) + "…" : t; }),
        datasets: [{ label: "Solved", data: BANK.topics.map(function (t) { return s.byTopic[t].solved; }), backgroundColor: "#3b82f6", borderRadius: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
    makeChart("cdDiffChart", {
      type: "doughnut",
      data: {
        labels: BANK.levels,
        datasets: [{ data: BANK.levels.map(function (l) { return s.byDiff[l].solved; }), backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"] }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    var wk = bucketSeries(7, 8, "W");
    makeChart("cdWeekChart", {
      type: "line",
      data: { labels: wk.labels, datasets: [{ label: "Solved", data: wk.data, borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,.18)", fill: true, tension: .35 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
    var mo = bucketSeries(30, 6, "M");
    makeChart("cdMonthChart", {
      type: "bar",
      data: { labels: mo.labels, datasets: [{ label: "Solved", data: mo.data, backgroundColor: "#0ea5e9", borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });

    var strong = rank.filter(function (r) { return r.solved >= 3 && r.score >= 60; });
    var weak = rank.slice().reverse().filter(function (r) { return r.score < 60; }).slice(0, 6);
    $("cdStrong").innerHTML = strong.length
      ? '<ul class="cd-tlist">' + strong.map(function (r) {
          return "<li><span><b>" + esc(r.topic) + "</b><small class='muted'>" + r.solved + " solved</small></span>" +
            '<span class="pill sm pill-ok">' + r.score + "</span></li>";
        }).join("") + "</ul>"
      : '<p class="empty">Solve at least three problems in a topic to certify it as a strong area.</p>';
    $("cdWeak").innerHTML = weak.length
      ? '<ul class="cd-tlist">' + weak.map(function (r) {
          return "<li><span><b>" + esc(r.topic) + "</b><small class='muted'>" +
            (r.tried ? r.solved + " solved of " + r.tried + " attempted" : "not started yet") + "</small></span>" +
            '<span class="pill sm ' + (r.score < 30 ? "pill-bad" : "pill-mid") + '">' + r.score + "</span></li>";
        }).join("") + "</ul>"
      : '<p class="empty">No weak areas detected. Raise the difficulty to keep improving.</p>';

    var nextProblems = weak.slice(0, 3).reduce(function (acc, r) {
      var pick = BANK.problems.filter(function (p) {
        return p.topic === r.topic && statusOf(p.id) === "todo" && p.difficulty === (s.coding >= 60 ? "Medium" : "Easy");
      }).slice(0, 2);
      return acc.concat(pick);
    }, []);
    if (!nextProblems.length) nextProblems = BANK.problems.filter(function (p) { return statusOf(p.id) === "todo"; }).slice(0, 5);
    var revision = store.revision.concat(Object.keys(store.progress).filter(function (id) {
      return store.progress[id].status === "attempted";
    })).slice(0, 6);

    $("cdRecommend").innerHTML =
      '<div class="cd-rec-grid">' +
      '<div><h4>Next problems to attempt</h4><ul class="cd-tlist">' +
        nextProblems.slice(0, 6).map(function (p) {
          return '<li><span><b>' + esc(p.title) + "</b><small class='muted'>" + esc(p.topic) + "</small></span>" +
            '<button class="btn ghost sm" data-open="' + p.id + '">Open</button></li>';
        }).join("") + "</ul></div>" +
      "<div><h4>Topics to practise</h4><ul class='cd-tlist'>" +
        (weak.length ? weak.slice(0, 5) : rank.slice(0, 5)).map(function (r) {
          return "<li><span><b>" + esc(r.topic) + "</b><small class='muted'>Target 6 solved problems</small></span></li>";
        }).join("") + "</ul></div>" +
      "<div><h4>Revision list</h4><ul class='cd-tlist'>" +
        (revision.length ? revision.map(function (id) {
          var p = BANK.problems.filter(function (x) { return x.id === id; })[0];
          return p ? '<li><span><b>' + esc(p.title) + "</b><small class='muted'>" + esc(p.topic) + "</small></span>" +
            '<button class="btn ghost sm" data-open="' + p.id + '">Revise</button></li>' : "";
        }).join("") : "<li class='empty'>Bookmark or mark problems for revision to build this list.</li>") + "</ul></div>" +
      "<div><h4>Suggested learning path</h4><ol class='cd-path'>" +
        ["Arrays & Strings fundamentals", "Searching & Sorting patterns", "Stacks, Queues & Linked Lists",
         "Recursion & Backtracking", "Trees & Graphs traversals", "Dynamic Programming & Greedy"]
          .map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ol></div>" +
      "</div>";

    Array.prototype.forEach.call($("cdRecommend").querySelectorAll("[data-open]"), function (b) {
      b.addEventListener("click", function () { setView("library"); open(b.dataset.open); });
    });
  }

  /* ---------------- company prep ---------------- */
  var COMPANY_PLAN = {
    TCS: { focus: ["Arrays", "Strings", "Searching", "Recursion"], mix: "Easy 60% · Medium 35% · Hard 5%", note: "TCS NQT coding rewards a correct, compiling solution on pattern, string and array problems within tight sectional timing." },
    Infosys: { focus: ["Arrays", "Strings", "Recursion", "Dynamic Programming"], mix: "Easy 45% · Medium 45% · Hard 10%", note: "Infosys pairs pseudocode reasoning with two coding problems; puzzles and recursion appear frequently." },
    Wipro: { focus: ["Arrays", "Strings", "Sorting", "Stacks"], mix: "Easy 55% · Medium 40% · Hard 5%", note: "Wipro NLTH focuses on two coding questions with heavy emphasis on loops, strings and basic data structures." },
    Accenture: { focus: ["Arrays", "Strings", "Searching", "Sorting"], mix: "Easy 65% · Medium 30% · Hard 5%", note: "Accenture's coding round is short; accuracy under time pressure matters more than algorithmic depth." },
    Cognizant: { focus: ["Arrays", "Linked Lists", "Trees", "Dynamic Programming"], mix: "Easy 40% · Medium 45% · Hard 15%", note: "Cognizant GenC Next raises the bar with data-structure heavy questions and follow-up optimisation discussion." },
    Capgemini: { focus: ["Arrays", "Strings", "Greedy Algorithms", "Searching"], mix: "Easy 50% · Medium 40% · Hard 10%", note: "Capgemini blends game-based aptitude with two coding problems; clean input handling is essential." },
    Deloitte: { focus: ["Trees", "Graphs", "Dynamic Programming", "Sorting"], mix: "Easy 30% · Medium 50% · Hard 20%", note: "Deloitte technical screens go deeper into complexity analysis, so justify time and space for every solution." }
  };

  function renderCompany() {
    var s = stats();
    var names = Object.keys(COMPANY_PLAN);
    $("cdCompanyTracks").innerHTML = names.map(function (n) {
      return '<button class="cr-track' + (store.company === n ? " on" : "") + '" data-co="' + n + '"><b>' + n + "</b>" +
        "<small class='muted'>" + COMPANY_PLAN[n].mix + "</small></button>";
    }).join("");
    Array.prototype.forEach.call($("cdCompanyTracks").querySelectorAll("[data-co]"), function (b) {
      b.addEventListener("click", function () { store.company = b.dataset.co; persist(); renderCompany(); });
    });

    var co = store.company, plan = COMPANY_PLAN[co];
    var pool = BANK.problems.filter(function (p) { return p.companies.indexOf(co) >= 0; });
    var solvedPool = pool.filter(function (p) { return statusOf(p.id) === "solved"; }).length;
    var readiness = clamp(round((solvedPool / Math.max(pool.length * 0.15, 1)) * 100), 0, 100);

    $("cdCompanyPanel").innerHTML =
      '<div class="page-head tight"><div class="min-w"><h3>' + esc(co) + " coding preparation</h3>" +
      "<small class='muted'>" + esc(plan.note) + "</small></div>" +
      '<span class="pill ' + (readiness >= 70 ? "pill-ok" : readiness >= 40 ? "pill-mid" : "pill-bad") + '">Track readiness ' + readiness + "%</span></div>" +
      '<div class="cr-bench-grid">' +
        '<div class="stat"><small>Mapped problems</small><strong>' + pool.length + "</strong></div>" +
        '<div class="stat"><small>Solved from track</small><strong>' + solvedPool + "</strong></div>" +
        '<div class="stat"><small>Difficulty mix</small><strong class="sm">' + esc(plan.mix) + "</strong></div>" +
        '<div class="stat"><small>Priority topics</small><strong class="sm">' + esc(plan.focus.join(", ")) + "</strong></div>" +
      "</div>" +
      "<h4>Preparation roadmap</h4><ol class='cd-path'>" +
        ["Week 1 — Rebuild fundamentals in " + plan.focus[0] + " and " + plan.focus[1] + " with 3 easy problems a day.",
         "Week 2 — Move to medium difficulty in " + plan.focus[2] + "; write the complexity of every solution.",
         "Week 3 — Solve " + plan.focus[3] + " problems and revisit every attempted-but-unsolved question.",
         "Week 4 — Two timed mock sets from this track under exam conditions, then review explanations."]
        .map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>" +
      "<h4>Recommended questions from this track</h4><ul class='cd-tlist'>" +
        pool.filter(function (p) { return statusOf(p.id) !== "solved"; }).slice(0, 8).map(function (p) {
          return "<li><span><b>" + esc(p.title) + "</b><small class='muted'>" + esc(p.topic) + " · " + p.difficulty + "</small></span>" +
            '<button class="btn ghost sm" data-open="' + p.id + '">Solve</button></li>';
        }).join("") + "</ul>";

    Array.prototype.forEach.call($("cdCompanyPanel").querySelectorAll("[data-open]"), function (b) {
      b.addEventListener("click", function () { setView("library"); open(b.dataset.open); });
    });
  }

  /* ---------------- report ---------------- */
  function report() {
    var s = stats(), rank = topicRanking(s), L = [];
    L.push("PREPDECK — CODING PRACTICE REPORT");
    L.push("Generated: " + new Date().toLocaleString());
    L.push("");
    L.push("SUMMARY");
    L.push("Problems solved      : " + s.solved + " / " + BANK.problems.length);
    L.push("Problems attempted   : " + s.tried);
    L.push("Success rate         : " + s.success + "%");
    L.push("Coding streak        : " + s.streak + " days");
    L.push("");
    L.push("READINESS");
    L.push("Coding readiness     : " + s.coding + " (" + band(s.coding) + ")");
    L.push("DSA readiness        : " + s.dsa + " (" + band(s.dsa) + ")");
    L.push("Interview readiness  : " + s.interview + " (" + band(s.interview) + ")");
    L.push("");
    L.push("TOPIC PERFORMANCE");
    rank.forEach(function (r) { L.push("  " + r.topic + " — score " + r.score + ", solved " + r.solved + " of " + r.tried + " attempted"); });
    L.push("");
    L.push("DIFFICULTY PERFORMANCE");
    BANK.levels.forEach(function (l) { L.push("  " + l + " — solved " + s.byDiff[l].solved + " of " + s.byDiff[l].total); });
    return L.join("\n");
  }

  /* ---------------- views ---------------- */
  function setView(v) {
    state.view = v;
    $("cdViewLibrary").hidden = v !== "library";
    $("cdViewAnalytics").hidden = v !== "analytics";
    $("cdViewCompany").hidden = v !== "company";
    $("cdTabLibrary").classList.toggle("primary", v === "library");
    $("cdTabAnalytics").classList.toggle("primary", v === "analytics");
    $("cdTabCompany").classList.toggle("primary", v === "company");
    if (v === "analytics") renderAnalytics();
    if (v === "company") renderCompany();
  }

  /* ---------------- wiring ---------------- */
  $("cdBankCount").textContent = BANK.problems.length;
  BANK.topics.forEach(function (t) {
    var o = document.createElement("option"); o.textContent = t; $("cdTopic").appendChild(o);
  });
  BANK.companies.forEach(function (c) {
    var o = document.createElement("option"); o.textContent = c; $("cdCompany").appendChild(o);
  });

  ["cdTopic", "cdDiff", "cdCompany", "cdStatus"].forEach(function (id) {
    $(id).addEventListener("change", function () { state.page = 0; renderList(); });
  });
  $("cdSearch").addEventListener("input", function () { state.page = 0; renderList(); });
  $("cdPrevPage").addEventListener("click", function () { state.page--; renderList(); });
  $("cdNextPage").addEventListener("click", function () { state.page++; renderList(); });
  $("cdRandom").addEventListener("click", function () {
    var list = filtered(); if (!list.length) return;
    open(list[Math.floor(Math.random() * list.length)].id);
  });

  $("cdCode").addEventListener("input", function () {
    highlight();
    if (!state.current) return;
    store.code[codeKey(state.current.id, state.lang)] = $("cdCode").value;
    persist();
    $("cdSaveHint").textContent = "Saved " + new Date().toLocaleTimeString();
  });
  $("cdCode").addEventListener("scroll", function () {
    var pre = $("cdHighlight").parentNode;
    pre.scrollTop = $("cdCode").scrollTop;
    pre.scrollLeft = $("cdCode").scrollLeft;
  });
  $("cdCode").addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      e.preventDefault();
      var el = e.target, s = el.selectionStart;
      el.value = el.value.slice(0, s) + "  " + el.value.slice(el.selectionEnd);
      el.selectionStart = el.selectionEnd = s + 2;
      el.dispatchEvent(new Event("input"));
    }
  });
  $("cdLang").addEventListener("change", function () {
    state.lang = $("cdLang").value;
    if (state.current) loadCode();
  });
  $("cdReset").addEventListener("click", function () {
    if (!state.current) return;
    delete store.code[codeKey(state.current.id, state.lang)];
    persist();
    loadCode();
    $("cdSaveHint").textContent = "Code reset to the starter template";
  });
  $("cdFull").addEventListener("click", function () {
    var pane = $("cdEditorPane");
    pane.classList.toggle("fullscreen");
    $("cdFull").textContent = pane.classList.contains("fullscreen") ? "Exit full screen" : "Full screen";
  });
  $("cdRun").addEventListener("click", runCode);
  $("cdSolved").addEventListener("click", function () {
    record("solved");
    $("cdConsole").className = "cd-console ok";
    $("cdConsole").textContent = "Marked as solved. Your analytics and readiness scores have been updated.";
  });
  $("cdFailed").addEventListener("click", function () {
    record("attempted");
    $("cdConsole").className = "cd-console";
    $("cdConsole").textContent = "Marked as attempted and added to your revision candidates.";
  });
  $("cdBookmark").addEventListener("click", function () {
    if (!state.current) return;
    toggle(store.bookmarks, state.current.id); syncMarks(); renderList(); renderMetrics();
  });
  $("cdRevision").addEventListener("click", function () {
    if (!state.current) return;
    toggle(store.revision, state.current.id); syncMarks(); renderList();
  });
  $("cdDownload").addEventListener("click", function () {
    var blob = new Blob([report()], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prepdeck-coding-report.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $("cdTabLibrary").addEventListener("click", function () { setView("library"); });
  $("cdTabAnalytics").addEventListener("click", function () { setView("analytics"); });
  $("cdTabCompany").addEventListener("click", function () { setView("company"); });

  function render() {
    renderMetrics();
    renderList();
    if (state.view === "analytics") renderAnalytics();
    if (state.view === "company") renderCompany();
  }

  setView("library");
  render();
  window.PrepDeckCoding = { render: render };
})();