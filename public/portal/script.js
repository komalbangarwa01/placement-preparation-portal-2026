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
    ["home", "dashboard", "practice"].forEach(function (p) {
      $("page-" + p).classList.toggle("active", p === page);
    });
    document.querySelectorAll(".nav-link").forEach(function (a) {
      a.classList.toggle("active", a.dataset.page === page);
    });
    $("navLinks").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "dashboard") render();
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
  render();
  show(location.hash === "#dashboard" ? "dashboard" : location.hash === "#practice" ? "practice" : "home");
})();