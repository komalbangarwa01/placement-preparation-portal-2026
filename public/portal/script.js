/* PrepDeck — Placement Preparation Portal (Local Storage only) */
(function () {
  var KEY = "prepdeck.attempts";
  var THEME = "prepdeck.theme";

  var $ = function (id) { return document.getElementById(id); };
  var load = function () {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  };
  var save = function (list) { localStorage.setItem(KEY, JSON.stringify(list)); };

  /* ---------- theme ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    $("themeBtn").textContent = t === "dark" ? "☀️" : "🌙";
    localStorage.setItem(THEME, t);
  }
  applyTheme(localStorage.getItem(THEME) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  $("themeBtn").addEventListener("click", function () {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  /* ---------- routing ---------- */
  function show(page) {
    ["home", "dashboard", "practice", "test", "reason", "resume", "interview", "plan", "career", "code", "rank"].forEach(function (p) {
      $("page-" + p).classList.toggle("active", p === page);
    });
    document.querySelectorAll(".nav-link").forEach(function (a) {
      a.classList.toggle("active", a.dataset.page === page);
    });
    $("navLinks").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "dashboard") { render(); if (window.PrepDeckDashboard) window.PrepDeckDashboard.render(); }
    if (page === "reason" && window.PrepDeckReasoning) window.PrepDeckReasoning.render();
    if (page === "resume" && window.PrepDeckResume) window.PrepDeckResume.render();
    if (page === "interview" && window.PrepDeckInterview) window.PrepDeckInterview.render();
    if (page === "plan" && window.PrepDeckPlanner) window.PrepDeckPlanner.render();
    if (page === "career" && window.PrepDeckCareer) window.PrepDeckCareer.render();
    if (page === "code" && window.PrepDeckCoding) window.PrepDeckCoding.render();
    if (page === "rank" && window.PrepDeckRank) window.PrepDeckRank.render();
  }
  document.querySelectorAll("[data-page]").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); show(el.dataset.page); });
  });
  $("burger").addEventListener("click", function () { $("navLinks").classList.toggle("open"); });

  /* ---------- stats ---------- */
  function pct(a) { return Math.round((a.score / a.total) * 100); }

  function render() {
    var list = load();
    var pcts = list.map(pct);
    var avg = pcts.length ? Math.round(pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length) : 0;

    var byTopic = {};
    list.forEach(function (a) {
      (byTopic[a.topic] = byTopic[a.topic] || []).push(pct(a));
    });
    var topics = Object.keys(byTopic).map(function (t) {
      var v = byTopic[t];
      return { topic: t, avg: Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length), n: v.length };
    }).sort(function (a, b) { return b.avg - a.avg; });

    $("statTotal").textContent = list.length;
    $("statAvg").textContent = avg + "%";
    $("statBest").textContent = (pcts.length ? Math.max.apply(null, pcts) : 0) + "%";
    $("statTopics").textContent = topics.length;
    $("heroScore").textContent = avg + "%";
    $("heroBar").style.width = avg + "%";

    fillTopics($("strongList"), topics.filter(function (t) { return t.avg >= 70; }), "No strong topics yet — log a few tests.");
    fillTopics($("weakList"), topics.filter(function (t) { return t.avg < 70; }), "Nothing weak so far. Keep going!");

    var act = $("activityList");
    act.innerHTML = "";
    var recent = list.slice().reverse().slice(0, 8);
    if (!recent.length) { act.innerHTML = '<li class="empty">No activity yet. Log your first test.</li>'; return; }
    recent.forEach(function (a) {
      var li = document.createElement("li");
      li.innerHTML = '<span><b>' + esc(a.topic) + '</b><small>' +
        new Date(a.date).toLocaleString() + '</small></span><span><b>' + a.score + "/" + a.total +
        '</b><small>' + pct(a) + '%</small></span>';
      act.appendChild(li);
    });
  }

  function fillTopics(ul, items, emptyMsg) {
    ul.innerHTML = "";
    if (!items.length) { ul.innerHTML = '<li class="empty">' + emptyMsg + "</li>"; return; }
    items.forEach(function (t) {
      var li = document.createElement("li");
      li.innerHTML = "<span>" + esc(t.topic) + " <em><i style='width:" + t.avg + "%'></i></em></span><b>" + t.avg + "%</b>";
      ul.appendChild(li);
    });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* ---------- form ---------- */
  $("testForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    var topic = f.topic.value.trim();
    var score = Number(f.score.value), total = Number(f.total.value);
    if (!topic || total <= 0 || score < 0 || score > total) {
      $("formHint").style.color = "var(--brand)";
      $("formHint").textContent = "Check the values — score can't exceed the total.";
      return;
    }
    var list = load();
    list.push({ topic: topic, score: score, total: total, date: Date.now() });
    save(list);
    f.reset(); f.total.value = 50;
    $("formHint").style.color = "var(--ok)";
    $("formHint").textContent = "Saved! Opening dashboard…";
    setTimeout(function () { $("formHint").textContent = ""; show("dashboard"); }, 700);
  });

  $("resetBtn").addEventListener("click", function () {
    if (confirm("Delete all locally stored attempts?")) { localStorage.removeItem(KEY); render(); }
  });

  /* ================= APTITUDE TEST MODULE ================= */
  var BANK = {
    Easy: [
      ["What is 25% of 240?", ["50", "60", "70", "80"], 1, "25% = 1/4, and 240 / 4 = 60."],
      ["The average of 5, 10, 15, 20 and 25 is:", ["12", "15", "18", "20"], 1, "Sum = 75; 75 / 5 = 15."],
      ["If a pen costs ₹12, how many pens can be bought with ₹150?", ["10", "11", "12", "13"], 2, "150 / 12 = 12.5, so 12 whole pens."],
      ["Find the next number: 2, 4, 8, 16, ?", ["24", "30", "32", "36"], 2, "Each term doubles: 16 × 2 = 32."],
      ["Simple interest on ₹1000 at 10% for 2 years is:", ["₹100", "₹200", "₹210", "₹220"], 1, "SI = P×R×T/100 = 1000×10×2/100 = ₹200."],
      ["A train covers 120 km in 2 hours. Its speed is:", ["50 km/h", "60 km/h", "70 km/h", "80 km/h"], 1, "Speed = distance / time = 120 / 2 = 60 km/h."],
      ["Which is the odd one out?", ["Circle", "Square", "Triangle", "Cube"], 3, "Cube is 3-dimensional; the others are 2D shapes."],
      ["Ratio 3:4 of a total of 56 gives the smaller part as:", ["21", "24", "28", "32"], 1, "3/7 × 56 = 24."],
      ["If BOOK is coded as CPPL, then WORD is:", ["XPSE", "XQSE", "XPTE", "WPSE"], 0, "Each letter shifts +1: W→X, O→P, R→S, D→E."],
      ["A number increased by 20% becomes 60. The number is:", ["48", "50", "52", "55"], 1, "x × 1.2 = 60 → x = 50."]
    ],
    Medium: [
      ["A can do a job in 12 days, B in 24 days. Together they finish it in:", ["6 days", "8 days", "9 days", "10 days"], 1, "1/12 + 1/24 = 3/24 = 1/8, so 8 days."],
      ["Two dice are thrown. Probability the sum is 9?", ["1/6", "1/9", "1/12", "1/8"], 1, "4 favourable outcomes out of 36 = 1/9."],
      ["A sum doubles at simple interest in 8 years. Rate per annum is:", ["10%", "12.5%", "15%", "20%"], 1, "SI = P in 8 years → R = 100/8 = 12.5%."],
      ["Cost ₹400, sold at ₹480. Profit percent is:", ["15%", "18%", "20%", "25%"], 2, "Profit 80 on 400 = 20%."],
      ["A boat goes 20 km downstream in 2 h; stream is 2 km/h. Boat speed in still water:", ["6 km/h", "8 km/h", "10 km/h", "12 km/h"], 1, "Downstream speed = 10 km/h = boat + 2 → boat = 8 km/h."],
      ["Find the next term: 3, 6, 11, 18, ?", ["25", "26", "27", "29"], 2, "Differences 3, 5, 7, then 9 → 18 + 9 = 27."],
      ["Average of 10 numbers is 24. If one number 30 is removed, new average is:", ["22", "23.3", "24", "25"], 1, "(240 − 30) / 9 = 23.33."],
      ["Mixture 40 L has milk:water = 3:1. Water to add for 1:1 is:", ["10 L", "15 L", "20 L", "25 L"], 2, "Milk 30, water 10; add 20 L water → 30:30."],
      ["A shopkeeper gives 10% then 20% discount on ₹1000. Final price:", ["₹700", "₹720", "₹750", "₹680"], 1, "1000 × 0.9 × 0.8 = ₹720."],
      ["In how many ways can letters of 'BOOK' be arranged?", ["6", "12", "18", "24"], 1, "4! / 2! = 12 (two O's repeat)."]
    ],
    Hard: [
      ["Father is 3× son's age; in 12 years he'll be twice. Son's present age:", ["10", "12", "14", "16"], 1, "3x + 12 = 2(x + 12) → x = 12."],
      ["How many 4-digit numbers with distinct digits start with 5?", ["504", "448", "512", "486"], 0, "1 × 9 × 8 × 7 = 504."],
      ["Pipes fill in 10 and 15 h; a leak empties in 30 h. Time with all open:", ["6 h", "7.5 h", "8 h", "9 h"], 0, "1/10 + 1/15 − 1/30 = 1/6 → 6 hours."],
      ["Compound interest on ₹8000 at 10% for 2 years is:", ["₹1600", "₹1680", "₹1700", "₹1720"], 1, "8000(1.1² − 1) = 8000 × 0.21 = ₹1680."],
      ["Next term: 2, 12, 36, 80, ?", ["120", "150", "154", "162"], 1, "n³ + n²: 5³ + 5² = 125 + 25 = 150."],
      ["Train 150 m long at 72 km/h crosses a 300 m bridge in:", ["18.5 s", "20 s", "22.5 s", "25 s"], 2, "450 m at 20 m/s = 22.5 s."],
      ["Probability of at least one head in 3 coin tosses:", ["5/8", "3/4", "7/8", "1/2"], 2, "1 − (1/2)³ = 7/8."],
      ["Man sells two items at ₹1200 each, one at 20% gain and one at 20% loss. Net:", ["No profit/loss", "₹100 loss", "₹100 gain", "₹50 loss"], 1, "CP = 1000 + 1500 = 2500 vs SP 2400 → ₹100 loss."],
      ["A alone: 20 days, works 5 days, B finishes rest in 9 days. B alone needs:", ["10", "12", "14", "15"], 1, "Remaining 3/4 in 9 days → full job 12 days."],
      ["Sum of the first 30 multiples of 3 is:", ["1395", "1440", "1485", "1530"], 0, "Terms 3…90: 30/2 × (3 + 90) = 15 × 93 = 1395."]
    ]
  };

  var QKEY = "prepdeck.generated";
  var quiz = null, tick = null, generating = false;

  function saveGenerated(entry) {
    var all = [];
    try { all = JSON.parse(localStorage.getItem(QKEY)) || []; } catch (e) { all = []; }
    all.push(entry);
    localStorage.setItem(QKEY, JSON.stringify(all.slice(-30)));
  }

  // Dynamic Question Generation (falls back to the offline bank if the service is unavailable)
  function generateQuestions(category, level, count) {
    return fetch("/api/public/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: category, difficulty: level, count: count })
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error || "Generation failed");
        return d.questions;
      });
    }).then(function (qs) {
      var mapped = qs.map(function (q) { return [q.question, q.options, q.answerIndex, q.explanation]; });
      saveGenerated({ category: category, level: level, date: Date.now(), questions: mapped });
      return mapped;
    });
  }

  function startQuiz(level, category, qs) {
    quiz = {
      level: level,
      category: category,
      qs: qs,
      answers: new Array(qs.length).fill(null),
      i: 0,
      left: 30 * 60,
      startedAt: Date.now()
    };
    $("testIntro").hidden = true; $("testResult").hidden = true; $("testRun").hidden = false;
    $("quizLevel").textContent = category + " · " + level;
    drawQ();
    clearInterval(tick);
    updateTimer();
    tick = setInterval(function () {
      quiz.left--;
      updateTimer();
      if (quiz.left <= 0) finishQuiz(true);
    }, 1000);
  }

  function updateTimer() {
    var m = Math.floor(quiz.left / 60), s = quiz.left % 60;
    var el = $("timer");
    el.textContent = m + ":" + (s < 10 ? "0" : "") + s;
    el.classList.toggle("warn", quiz.left <= 300);
  }

  function drawQ() {
    var q = quiz.qs[quiz.i];
    $("quizProgress").textContent = "Question " + (quiz.i + 1) + " of " + quiz.qs.length;
    $("quizBar").style.width = ((quiz.i + 1) / quiz.qs.length) * 100 + "%";
    $("qText").textContent = q[0];
    var box = $("qOptions"); box.innerHTML = "";
    q[1].forEach(function (opt, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opt" + (quiz.answers[quiz.i] === idx ? " sel" : "");
      b.innerHTML = "<b>" + "ABCD"[idx] + "</b><span>" + esc(opt) + "</span>";
      b.addEventListener("click", function () { quiz.answers[quiz.i] = idx; drawQ(); });
      box.appendChild(b);
    });
    var dots = $("qDots"); dots.innerHTML = "";
    quiz.qs.forEach(function (_, idx) {
      var d = document.createElement("span");
      d.textContent = idx + 1;
      if (quiz.answers[idx] !== null) d.classList.add("done");
      if (idx === quiz.i) d.classList.add("cur");
      d.addEventListener("click", function () { quiz.i = idx; drawQ(); });
      dots.appendChild(d);
    });
    $("prevBtn").disabled = quiz.i === 0;
    $("nextBtn").disabled = quiz.i === quiz.qs.length - 1;
  }

  function finishQuiz(auto) {
    if (!quiz) return;
    clearInterval(tick);
    var score = 0;
    quiz.qs.forEach(function (q, i) { if (quiz.answers[i] === q[2]) score++; });
    var total = quiz.qs.length;
    var secs = Math.max(1, Math.round((Date.now() - quiz.startedAt) / 1000));

    // persist to the same store the dashboard reads -> dashboard updates automatically
    var list = load();
    list.push({
      topic: quiz.category + " (" + quiz.level + ")",
      score: score, total: total, date: Date.now(),
      level: quiz.level, category: quiz.category, seconds: secs, source: "quiz"
    });
    save(list);
    render();

    $("resScore").textContent = score + "/" + total;
    $("resPct").textContent = Math.round((score / total) * 100) + "%";
    $("resLevel").textContent = quiz.level;
    $("resCat").textContent = quiz.category;
    $("resTime").textContent = Math.floor(secs / 60) + "m " + (secs % 60) + "s";

    var rl = $("reviewList"); rl.innerHTML = "";
    quiz.qs.forEach(function (q, i) {
      var ok = quiz.answers[i] === q[2];
      var div = document.createElement("div");
      div.className = "rev" + (ok ? "" : " bad");
      div.innerHTML =
        "<p>" + (i + 1) + ". " + esc(q[0]) + "</p>" +
        '<div class="ans">Your answer: <b>' + (quiz.answers[i] === null ? "Not answered" : esc(q[1][quiz.answers[i]])) +
        "</b> · Correct: <b>" + esc(q[1][q[2]]) + "</b> " + (ok ? "✅" : "❌") + "</div>" +
        '<div class="exp">💡 ' + esc(q[3]) + "</div>";
      rl.appendChild(div);
    });

    $("testRun").hidden = true;
    $("testResult").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (auto) alert("Time's up! Your test has been submitted automatically.");
    quiz = null;
  }

  document.querySelectorAll(".level").forEach(function (b) {
    b.addEventListener("click", function () {
      if (generating) return;
      var level = b.dataset.level;
      var category = $("catSelect").value;
      var count = Number($("countSelect").value);
      var hint = $("genHint");
      generating = true;
      document.querySelectorAll(".level").forEach(function (x) { x.disabled = true; });
      hint.style.color = "var(--muted)";
      hint.textContent = "Preparing your " + level + " " + category + " question set…";
      generateQuestions(category, level, count)
        .catch(function (err) {
          hint.style.color = "var(--warn)";
          hint.textContent = err.message + " — using the offline question bank.";
          return BANK[level].slice(0, count);
        })
        .then(function (qs) {
          generating = false;
          document.querySelectorAll(".level").forEach(function (x) { x.disabled = false; });
          setTimeout(function () { hint.textContent = ""; }, 2500);
          startQuiz(level, category, qs);
        });
    });
  });
  $("prevBtn").addEventListener("click", function () { if (quiz && quiz.i > 0) { quiz.i--; drawQ(); } });
  $("nextBtn").addEventListener("click", function () { if (quiz && quiz.i < quiz.qs.length - 1) { quiz.i++; drawQ(); } });
  $("submitBtn").addEventListener("click", function () {
    if (!quiz) return;
    var left = quiz.answers.filter(function (a) { return a === null; }).length;
    if (left && !confirm(left + " question(s) unanswered. Submit anyway?")) return;
    finishQuiz(false);
  });
  $("retakeBtn").addEventListener("click", function () {
    $("testResult").hidden = true; $("testRun").hidden = true; $("testIntro").hidden = false;
  });

  /* ---------- seed demo data once ---------- */
  if (!localStorage.getItem(KEY)) {
    var now = Date.now(), d = 86400000;
    save([
      { topic: "Quantitative Aptitude", score: 42, total: 50, date: now - 6 * d },
      { topic: "Logical Reasoning", score: 38, total: 50, date: now - 5 * d },
      { topic: "Data Structures", score: 31, total: 50, date: now - 4 * d },
      { topic: "DBMS", score: 22, total: 40, date: now - 3 * d },
      { topic: "Operating Systems", score: 18, total: 40, date: now - 2 * d },
      { topic: "Verbal Ability", score: 44, total: 50, date: now - d }
    ]);
  }
  window.PrepDeck = {
    logAttempt: function (a) { var l = load(); l.push(a); save(l); render(); if (window.PrepDeckDashboard) window.PrepDeckDashboard.render(); },
    render: render,
    go: show
  };
  render();
  var h = (location.hash || "").slice(1);
  show(["dashboard", "practice", "test", "reason", "resume", "interview", "plan", "career", "code", "rank"].indexOf(h) > -1 ? h : "home");
})();