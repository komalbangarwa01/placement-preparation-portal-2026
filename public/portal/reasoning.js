/* PrepDeck — Reasoning Practice System (Local Storage only) */
(function () {
  "use strict";
  var BANK = window.ReasoningBank;
  if (!BANK) return;

  var SKEY = "prepdeck.reasoning";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  var DEF = { attempts: [], bookmarks: [], recent: [], days: {} };
  function loadStore() {
    try {
      var s = JSON.parse(localStorage.getItem(SKEY)) || {};
      return {
        attempts: s.attempts || [], bookmarks: s.bookmarks || [],
        recent: s.recent || [], days: s.days || {}
      };
    } catch (e) { return JSON.parse(JSON.stringify(DEF)); }
  }
  function saveStore(s) { localStorage.setItem(SKEY, JSON.stringify(s)); }
  var store = loadStore();

  /* ---------------- setup controls ---------------- */
  var catSel = $("rCategory"), lvlSel = $("rLevel"), cntSel = $("rCount");
  BANK.CATEGORIES.forEach(function (c) {
    var o = document.createElement("option"); o.textContent = c; catSel.appendChild(o);
  });
  $("rBankCount").textContent = BANK.count.toLocaleString();

  function currentMode() {
    var el = document.querySelector('input[name="rmode"]:checked');
    return el ? el.value : "category";
  }
  function syncMode() {
    var m = currentMode();
    catSel.disabled = m !== "category";
    lvlSel.disabled = m === "mixed";
    $("rModeNote").textContent =
      m === "category" ? "Category-wise practice — focus on one reasoning topic at a time."
        : m === "difficulty" ? "Difficulty-wise practice — questions pulled from every category at the chosen level."
          : "Mixed practice — a randomised set across all ten categories and all difficulty levels.";
  }
  document.querySelectorAll('input[name="rmode"]').forEach(function (r) {
    r.addEventListener("change", syncMode);
  });
  syncMode();

  /* ---------------- session engine ---------------- */
  var S = null, qTimer = null;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickQuestions(pool, count) {
    var recent = store.recent || [];
    var fresh = pool.filter(function (q) { return recent.indexOf(q.id) === -1; });
    var chosen = shuffle(fresh).slice(0, count);
    if (chosen.length < count) {
      var used = {};
      chosen.forEach(function (q) { used[q.id] = 1; });
      chosen = chosen.concat(shuffle(pool.filter(function (q) { return !used[q.id]; })).slice(0, count - chosen.length));
    }
    return chosen;
  }

  function startSession(pool, label) {
    var count = Number(cntSel.value);
    if (!pool.length) { flash("No questions match this selection.", true); return; }
    var qs = pickQuestions(pool, count);
    S = { qs: qs, i: 0, answers: [], times: [], label: label, startedAt: Date.now(), qStart: Date.now(), locked: false };
    $("rSetup").hidden = true; $("rSummary").hidden = true; $("rRun").hidden = false;
    $("rSessionLabel").textContent = label;
    drawQuestion();
    clearInterval(qTimer);
    qTimer = setInterval(function () {
      if (!S) return;
      var t = Math.floor((Date.now() - S.qStart) / 1000);
      $("rQTimer").textContent = "Time on this question: " + t + "s";
    }, 500);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function drawQuestion() {
    var q = S.qs[S.i];
    S.qStart = Date.now(); S.locked = false;
    $("rProgress").textContent = "Question " + (S.i + 1) + " of " + S.qs.length;
    $("rMeta").textContent = q.category + " · " + q.level;
    $("rBar").style.width = ((S.i) / S.qs.length) * 100 + "%";
    $("rQText").textContent = q.q;
    $("rExplain").hidden = true;
    $("rNext").disabled = true;
    $("rNext").textContent = S.i === S.qs.length - 1 ? "Finish session" : "Next question →";
    var mark = $("rBookmark");
    mark.classList.toggle("on", store.bookmarks.indexOf(q.id) > -1);
    mark.textContent = store.bookmarks.indexOf(q.id) > -1 ? "★ Bookmarked" : "☆ Bookmark";
    var box = $("rOptions"); box.innerHTML = "";
    q.options.forEach(function (opt, idx) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "opt";
      b.innerHTML = "<b>" + "ABCD"[idx] + "</b><span>" + esc(opt) + "</span>";
      b.addEventListener("click", function () { answer(idx); });
      box.appendChild(b);
    });
  }

  function answer(idx) {
    if (S.locked) return;
    S.locked = true;
    var q = S.qs[S.i];
    var secs = Math.max(1, Math.round((Date.now() - S.qStart) / 1000));
    S.answers.push(idx); S.times.push(secs);
    var btns = $("rOptions").children;
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (i === q.ans) btns[i].classList.add("right");
      else if (i === idx) btns[i].classList.add("wrong");
    }
    var ok = idx === q.ans;
    $("rExplain").hidden = false;
    $("rExplain").className = "explain " + (ok ? "ok" : "bad");
    $("rExplain").innerHTML = "<b>" + (ok ? "Correct" : "Incorrect") + "</b> · Answer: " +
      esc(q.options[q.ans]) + "<p>" + esc(q.exp) + "</p><small>Time taken: " + secs + "s</small>";
    $("rNext").disabled = false;

    store.attempts.push({ id: q.id, category: q.category, level: q.level, correct: ok, seconds: secs, date: Date.now() });
    store.attempts = store.attempts.slice(-4000);
    store.recent = [q.id].concat(store.recent).slice(0, 400);
    var k = dayKey(Date.now());
    store.days[k] = (store.days[k] || 0) + 1;
    saveStore(store);
  }

  $("rNext").addEventListener("click", function () {
    if (!S) return;
    if (S.i === S.qs.length - 1) return finishSession();
    S.i++; drawQuestion();
  });
  $("rQuit").addEventListener("click", function () {
    if (!S) return;
    if (S.answers.length && !confirm("End this session now? Answered questions are already saved.")) return;
    if (S.answers.length) return finishSession();
    clearInterval(qTimer); S = null;
    $("rRun").hidden = true; $("rSetup").hidden = false;
  });
  $("rBookmark").addEventListener("click", function () {
    if (!S) return;
    var id = S.qs[S.i].id, at = store.bookmarks.indexOf(id);
    if (at > -1) store.bookmarks.splice(at, 1); else store.bookmarks.push(id);
    saveStore(store);
    this.classList.toggle("on", at === -1);
    this.textContent = at === -1 ? "★ Bookmarked" : "☆ Bookmark";
    renderBookmarks();
  });

  function finishSession() {
    clearInterval(qTimer);
    var answered = S.answers.length;
    var correct = 0, wrongList = [];
    for (var i = 0; i < answered; i++) {
      if (S.answers[i] === S.qs[i].ans) correct++;
      else wrongList.push({ q: S.qs[i], given: S.answers[i] });
    }
    var secs = Math.max(1, Math.round((Date.now() - S.startedAt) / 1000));
    var acc = answered ? Math.round((correct / answered) * 100) : 0;

    $("rSumAcc").textContent = acc + "%";
    $("rSumScore").textContent = correct + "/" + answered;
    $("rSumWrong").textContent = answered - correct;
    $("rSumTime").textContent = Math.floor(secs / 60) + "m " + (secs % 60) + "s";
    $("rSumAvg").textContent = (answered ? Math.round(secs / answered) : 0) + "s";

    var rl = $("rReviewList"); rl.innerHTML = "";
    if (!wrongList.length) {
      rl.innerHTML = '<p class="empty">Perfect session — every question was answered correctly.</p>';
    } else {
      wrongList.forEach(function (w, n) {
        var d = document.createElement("div");
        d.className = "rev bad";
        d.innerHTML = "<p>" + (n + 1) + ". " + esc(w.q.q) + "</p>" +
          '<div class="ans">Your answer: <b>' + esc(w.q.options[w.given]) + "</b> · Correct: <b>" +
          esc(w.q.options[w.q.ans]) + "</b></div><div class=\"exp\">" + esc(w.q.exp) + "</div>";
        rl.appendChild(d);
      });
    }

    if (answered && window.PrepDeck && window.PrepDeck.logAttempt) {
      window.PrepDeck.logAttempt({
        topic: "Reasoning · " + (S.label.split(" · ")[0] || "Practice"),
        score: correct, total: answered, date: Date.now(), seconds: secs, source: "reasoning"
      });
    }
    S = null;
    $("rRun").hidden = true; $("rSummary").hidden = false;
    renderAnalytics();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("rAgain").addEventListener("click", function () {
    $("rSummary").hidden = true; $("rSetup").hidden = false;
  });

  /* ---------------- start buttons ---------------- */
  $("rStart").addEventListener("click", function () {
    var m = currentMode(), pool, label;
    if (m === "category") {
      pool = BANK.filter(catSel.value, lvlSel.value === "Mixed" ? null : lvlSel.value);
      label = catSel.value + " · " + lvlSel.value;
    } else if (m === "difficulty") {
      pool = BANK.filter(null, lvlSel.value === "Mixed" ? null : lvlSel.value);
      label = "All categories · " + lvlSel.value;
    } else {
      pool = BANK.all; label = "Mixed practice · All levels";
    }
    startSession(pool, label);
  });

  $("rStartWeak").addEventListener("click", function () {
    var weak = weakestCategory();
    var pool = BANK.filter(weak.category, recommendedLevel(weak));
    startSession(pool, weak.category + " · " + recommendedLevel(weak));
  });

  $("rStartBookmarks").addEventListener("click", function () {
    var pool = store.bookmarks.map(BANK.byId).filter(Boolean);
    if (!pool.length) { flash("Bookmark a few questions first.", true); return; }
    startSession(pool, "Bookmarked questions");
  });

  $("rStartIncorrect").addEventListener("click", function () {
    var ids = {};
    store.attempts.forEach(function (a) { ids[a.id] = a.correct ? undefined : true; });
    var pool = Object.keys(ids).filter(function (k) { return ids[k]; }).map(BANK.byId).filter(Boolean);
    if (!pool.length) { flash("No incorrect questions to revisit yet.", true); return; }
    startSession(pool, "Incorrect question review");
  });

  function flash(msg, warn) {
    var h = $("rHint");
    h.style.color = warn ? "var(--warn)" : "var(--ok)";
    h.textContent = msg;
    setTimeout(function () { h.textContent = ""; }, 2800);
  }

  /* ---------------- analytics ---------------- */
  function statsByCategory() {
    var by = {};
    store.attempts.forEach(function (a) {
      var s = by[a.category] || (by[a.category] = { n: 0, c: 0, secs: 0 });
      s.n++; if (a.correct) s.c++; s.secs += a.seconds || 0;
    });
    return Object.keys(by).map(function (c) {
      return { category: c, n: by[c].n, correct: by[c].c, acc: Math.round((by[c].c / by[c].n) * 100), avg: Math.round(by[c].secs / by[c].n) };
    }).sort(function (a, b) { return b.acc - a.acc; });
  }

  function weakestCategory() {
    var s = statsByCategory().filter(function (c) { return c.n >= 3; });
    if (!s.length) return { category: BANK.CATEGORIES[0], acc: 0, n: 0 };
    return s[s.length - 1];
  }

  function recommendedLevel(cat) {
    if (!cat || cat.n < 3) return "Easy";
    if (cat.acc >= 80) return "Hard";
    if (cat.acc >= 55) return "Medium";
    return "Easy";
  }

  function streak() {
    var count = 0, d = new Date();
    if (!store.days[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
    while (store.days[dayKey(d.getTime())]) { count++; d.setDate(d.getDate() - 1); }
    return count;
  }

  function renderAnalytics() {
    var total = store.attempts.length;
    var correct = store.attempts.filter(function (a) { return a.correct; }).length;
    var acc = total ? Math.round((correct / total) * 100) : 0;
    $("rTotal").textContent = total;
    $("rCorrect").textContent = correct;
    $("rIncorrect").textContent = total - correct;
    $("rAccuracy").textContent = acc + "%";
    $("rStreak").textContent = streak() + (streak() === 1 ? " day" : " days");
    var secs = store.attempts.reduce(function (t, a) { return t + (a.seconds || 0); }, 0);
    $("rAvgTime").textContent = (total ? Math.round(secs / total) : 0) + "s";

    var stats = statsByCategory();
    fillTopics($("rStrong"), stats.filter(function (c) { return c.acc >= 70; }), "Practise a few sets to reveal your strong topics.");
    fillTopics($("rWeak"), stats.filter(function (c) { return c.acc < 70; }), "No weak topics recorded yet.");

    /* weekly progress — last 7 days */
    var week = $("rWeek"); week.innerHTML = "";
    var max = 1, vals = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var v = store.days[dayKey(d.getTime())] || 0;
      max = Math.max(max, v);
      vals.push({ label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()], v: v });
    }
    vals.forEach(function (x) {
      var col = document.createElement("div");
      col.className = "wk-col";
      col.innerHTML = '<i style="height:' + Math.max(4, Math.round((x.v / max) * 100)) + '%"></i><b>' + x.v + "</b><span>" + x.label + "</span>";
      week.appendChild(col);
    });
    var weekTotal = vals.reduce(function (t, x) { return t + x.v; }, 0);
    $("rWeekTotal").textContent = weekTotal + " question" + (weekTotal === 1 ? "" : "s") + " in the last 7 days";

    /* adaptive recommendation */
    var weak = weakestCategory();
    var lvl = recommendedLevel(weak);
    $("rAdvice").innerHTML = total < 5
      ? "Complete a short mixed set to unlock personalised topic and difficulty recommendations."
      : "Recommended next set: <b>" + esc(weak.category) + "</b> at <b>" + lvl + "</b> level — current accuracy " +
        weak.acc + "% across " + weak.n + " attempt" + (weak.n === 1 ? "" : "s") + ".";

    renderBookmarks();
  }

  function fillTopics(ul, items, emptyMsg) {
    ul.innerHTML = "";
    if (!items.length) { ul.innerHTML = '<li class="empty">' + emptyMsg + "</li>"; return; }
    items.forEach(function (t) {
      var li = document.createElement("li");
      li.innerHTML = "<span>" + esc(t.category) + " <em><i style='width:" + t.acc + "%'></i></em></span><b>" +
        t.acc + "% <small>(" + t.n + ")</small></b>";
      ul.appendChild(li);
    });
  }

  function renderBookmarks() {
    var box = $("rBookmarkList");
    if (!box) return;
    box.innerHTML = "";
    $("rBookmarkCount").textContent = store.bookmarks.length;
    if (!store.bookmarks.length) {
      box.innerHTML = '<p class="empty">No bookmarks yet. Use the bookmark button during a session to save tricky questions.</p>';
      return;
    }
    store.bookmarks.slice().reverse().forEach(function (id) {
      var q = BANK.byId(id); if (!q) return;
      var d = document.createElement("div");
      d.className = "rev";
      d.innerHTML = '<p><span class="tag">' + esc(q.category) + " · " + q.level + "</span> " + esc(q.q) + "</p>" +
        '<div class="ans">Answer: <b>' + esc(q.options[q.ans]) + "</b></div>" +
        '<div class="exp">' + esc(q.exp) + "</div>";
      var rm = document.createElement("button");
      rm.className = "btn ghost sm"; rm.textContent = "Remove bookmark";
      rm.addEventListener("click", function () {
        store.bookmarks = store.bookmarks.filter(function (b) { return b !== id; });
        saveStore(store); renderBookmarks();
      });
      d.appendChild(rm);
      box.appendChild(d);
    });
  }

  $("rResetStats").addEventListener("click", function () {
    if (!confirm("Clear reasoning progress, bookmarks and analytics?")) return;
    store = JSON.parse(JSON.stringify(DEF));
    saveStore(store); renderAnalytics();
  });

  document.querySelectorAll(".rtab").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".rtab").forEach(function (x) { x.classList.toggle("active", x === b); });
      ["practice", "analytics", "bookmarks"].forEach(function (p) {
        $("rPane-" + p).hidden = p !== b.dataset.pane;
      });
    });
  });

  window.PrepDeckReasoning = { render: renderAnalytics };
  renderAnalytics();
})();
