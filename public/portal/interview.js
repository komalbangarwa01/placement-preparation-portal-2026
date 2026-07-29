/* PrepDeck — Enterprise Mock Interview System (Local Storage only) */
(function () {
  var HKEY = "prepdeck.interviews";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch (e) { return []; }
  }
  function saveHistory(list) { localStorage.setItem(HKEY, JSON.stringify(list.slice(-40))); }

  /* ---------- offline fallback bank ---------- */
  var FALLBACK = {
    HR: [
      "Walk me through your background and what led you to apply for this role.",
      "What do you consider your biggest professional strength, and how has it shown up in your work?",
      "Where do you see yourself three years from now, and how does this role fit that plan?",
      "Tell me about a time you received tough feedback. What did you do with it?",
      "Why should our panel select you over other candidates with similar academics?"
    ],
    Technical: [
      "Explain the architecture of the most complex project you have built, end to end.",
      "How would you debug a feature that works locally but fails in production?",
      "Describe how you would design and optimise a data model for a high-traffic feature.",
      "What testing strategy would you apply before shipping a critical release?",
      "Explain a concept from your core subjects that you use most often in practice."
    ],
    Behavioral: [
      "Tell me about a time you disagreed with a teammate. How was it resolved?",
      "Describe a situation where you missed a deadline. What changed afterwards?",
      "Give an example of when you took ownership beyond your assigned scope.",
      "Tell me about the hardest thing you have had to learn quickly.",
      "Describe a time you had to deliver bad news to a stakeholder."
    ],
    Situational: [
      "Your production release breaks two hours before a client demo. What do you do?",
      "A teammate is consistently blocking your work. How do you handle it?",
      "You are given a requirement you believe is technically wrong. What is your approach?",
      "Two priorities are due the same day and you can only finish one. Walk me through your decision.",
      "A client asks for a change mid-sprint that affects the timeline. How do you respond?"
    ]
  };
  FALLBACK.Mixed = FALLBACK.HR.concat(FALLBACK.Technical, FALLBACK.Behavioral, FALLBACK.Situational);

  function fallbackQuestion(type, asked) {
    var pool = (FALLBACK[type] || FALLBACK.Mixed).filter(function (q) { return asked.indexOf(q) === -1; });
    if (!pool.length) pool = FALLBACK.Mixed.filter(function (q) { return asked.indexOf(q) === -1; });
    if (!pool.length) pool = FALLBACK.Mixed;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------- offline heuristic evaluation ---------- */
  function localEvaluate(question, answer) {
    var a = String(answer || "").trim();
    var words = a ? a.split(/\s+/).length : 0;
    var sentences = a.split(/[.!?]+/).filter(function (s) { return s.trim().length > 3; }).length;
    var hasExample = /(for example|we|i built|project|implemented|used|team|client|result)/i.test(a);
    var hasNumbers = /\d/.test(a);
    var hedges = (a.match(/\b(maybe|i think|not sure|probably|kind of|somewhat)\b/gi) || []).length;

    var depth = Math.min(100, Math.round((words / 90) * 100));
    var technical = Math.max(10, Math.min(95, depth * 0.6 + (hasExample ? 22 : 0) + (hasNumbers ? 10 : 0)));
    var problemSolving = Math.max(10, Math.min(95, depth * 0.5 + (sentences > 2 ? 25 : 8) + (hasExample ? 15 : 0)));
    var communication = Math.max(10, Math.min(95, 40 + sentences * 8 + (words > 40 ? 12 : 0) - hedges * 4));
    var confidence = Math.max(10, Math.min(95, 70 - hedges * 9 + (words > 60 ? 12 : -8)));
    var clarity = Math.max(10, Math.min(95, 45 + (sentences > 1 ? 20 : 0) + (words > 35 ? 15 : 0) - hedges * 3));
    var overall = Math.round((technical + problemSolving + communication + confidence + clarity) / 5);

    var improvements = [];
    if (words < 45) improvements.push("Expand the answer — aim for 60-120 words with a concrete situation, action and result.");
    if (!hasExample) improvements.push("Anchor the answer in a real project or incident from your own experience.");
    if (!hasNumbers) improvements.push("Quantify the outcome (users, latency, marks, time saved) so the impact is measurable.");
    if (hedges) improvements.push("Remove hedging phrases like \"I think\" / \"maybe\" — state your position directly.");
    if (!improvements.length) improvements.push("Tighten the closing line into a one-sentence summary of the result.");

    return {
      technical: Math.round(technical), problemSolving: Math.round(problemSolving),
      communication: Math.round(communication), confidence: Math.round(confidence),
      clarity: Math.round(clarity), overall: overall,
      feedback: words
        ? "Offline scoring: your answer ran " + words + " words across " + Math.max(1, sentences) +
          " point(s)" + (hasExample ? ", with a concrete example" : ", but without a concrete example") +
          (hasNumbers ? " and measurable detail." : " and no measurable detail.")
        : "No answer was recorded for this question.",
      improvements: improvements.slice(0, 4),
      idealAnswer: "",
      offline: true
    };
  }

  function localReport(session) {
    var t = session.turns;
    var avg = function (k) {
      if (!t.length) return 0;
      return Math.round(t.reduce(function (s, x) { return s + (x.eval[k] || 0); }, 0) / t.length);
    };
    var overall = avg("overall");
    var rec = overall >= 80 ? "Strong Candidate" : overall >= 65 ? "Interview Ready" : overall >= 45 ? "Needs Improvement" : "Not Ready";
    return {
      overall: overall,
      technical: Math.round((avg("technical") + avg("problemSolving")) / 2),
      communication: Math.round((avg("communication") + avg("clarity")) / 2),
      confidence: avg("confidence"),
      recommendation: rec,
      summary: "Offline evaluation across " + t.length + " questions for the " + session.role + " " +
        session.type + " round. Overall performance scored " + overall + "/100, placing the candidate in the \"" +
        rec + "\" band.",
      strengths: t.filter(function (x) { return x.eval.overall >= 65; }).slice(0, 4).map(function (x) {
        return "Handled well: " + x.question.slice(0, 90);
      }),
      improvements: t.filter(function (x) { return x.eval.overall < 65; }).slice(0, 4).map(function (x) {
        return "Rework the answer to: " + x.question.slice(0, 90);
      }),
      reviseTopics: [session.role + " fundamentals", session.type + " round structure", "Project deep-dive narration"],
      skillsToImprove: ["STAR-format storytelling", "Quantifying outcomes", "Concise technical explanation"],
      strategy: [
        "Run two mock rounds a week and re-attempt every question scored below 65.",
        "Prepare three project stories you can narrate in under 90 seconds each.",
        "Record yourself answering and review filler words and pace."
      ],
      resources: ["Your own project documentation", "Core subject notes (DBMS, OS, CN)", "Company placement papers"],
      offline: true
    };
  }

  /* ---------- session state ---------- */
  var S = null, tick = null, busy = false;

  function api(payload) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 60000);
    return fetch("/api/public/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctl ? ctl.signal : undefined,
      body: JSON.stringify(payload)
    }).then(function (r) {
      clearTimeout(timer);
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error || "Interview service failed.");
        return d;
      });
    }, function (e) { clearTimeout(timer); throw e; });
  }

  /* ---------- chat rendering ---------- */
  function bubble(who, html, cls) {
    var wrap = document.createElement("div");
    wrap.className = "ivmsg " + who + (cls ? " " + cls : "");
    wrap.innerHTML =
      '<div class="ivavatar">' + (who === "ai" ? "🧑‍💼" : "🙋") + "</div>" +
      '<div class="ivbody">' + html + "</div>";
    var chat = $("ivChat");
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
    return wrap;
  }

  function typing() {
    return bubble("ai", '<span class="ivtyping"><i></i><i></i><i></i></span>', "pending");
  }

  function setStatus(msg, err) {
    var el = $("ivStatus");
    el.textContent = msg || "";
    el.classList.toggle("err", !!err);
  }

  function setProgress() {
    $("ivProgress").textContent = "Question " + Math.min(S.turns.length + 1, S.total) + " of " + S.total;
    $("ivBar").style.width = (S.turns.length / S.total) * 100 + "%";
  }

  function fmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function startTimer() {
    clearInterval(tick);
    updateTimer();
    tick = setInterval(function () {
      if (!S) return clearInterval(tick);
      S.left--;
      updateTimer();
      if (S.left <= 0) { clearInterval(tick); finish(true); }
    }, 1000);
  }
  function updateTimer() {
    var el = $("ivTimer");
    el.textContent = fmt(Math.max(0, S.left));
    el.classList.toggle("warn", S.left <= 120);
  }

  /* ---------- flow ---------- */
  function start() {
    S = {
      role: $("ivRole").value,
      type: $("ivType").value,
      level: $("ivLevel").value,
      company: $("ivCompany").value,
      total: Number($("ivCount").value),
      turns: [],
      asked: [],
      current: null,
      startedAt: Date.now(),
      left: Number($("ivDuration").value) * 60
    };
    $("ivSetup").hidden = true;
    $("ivReport").hidden = true;
    $("ivRun").hidden = false;
    $("ivChat").innerHTML = "";
    $("ivTitle").textContent = S.role + " · " + S.type + " Interview";
    $("ivSub").textContent = S.level + " level · " + (S.company === "General" ? "Campus panel" : S.company + " pattern");
    setProgress();
    startTimer();
    bubble("ai",
      "<p>Good day — I'm your interviewer for this <b>" + esc(S.type) + "</b> round for the <b>" + esc(S.role) +
      "</b> position" + (S.company === "General" ? "" : " following the <b>" + esc(S.company) + "</b> pattern") +
      ". We have " + S.total + " questions and " + fmt(S.left) + " on the clock. Answer as you would in a real panel — take your time and be specific.</p>");
    nextQuestion();
  }

  function nextQuestion() {
    if (!S) return;
    if (S.turns.length >= S.total) return finish(false);
    busy = true;
    $("ivSend").disabled = true;
    var pend = typing();
    api({
      action: "question", role: S.role, type: S.type, level: S.level, company: S.company,
      index: S.turns.length, total: S.total,
      history: S.turns.map(function (t) { return { question: t.question, answer: t.answer, overall: t.eval.overall }; })
    }).catch(function (err) {
      setStatus(err.message + " — continuing with the offline interviewer.", true);
      return { question: fallbackQuestion(S.type, S.asked), focus: S.type, isFollowUp: false, hint: "" };
    }).then(function (d) {
      if (!S) return;
      pend.remove();
      S.current = d;
      S.asked.push(d.question);
      bubble("ai",
        '<span class="ivtag">' + esc(d.focus || S.type) + (d.isFollowUp ? " · follow-up" : "") + "</span>" +
        "<p>" + esc(d.question) + "</p>" +
        (d.hint ? '<small class="ivhint">Interviewer is looking for: ' + esc(d.hint) + "</small>" : ""));
      setProgress();
      busy = false;
      $("ivSend").disabled = false;
      $("ivAnswer").focus();
    });
  }

  function submitAnswer(skipped) {
    if (!S || busy) return;
    var answer = skipped ? "" : $("ivAnswer").value.trim();
    if (!skipped && !answer) {
      setStatus("Type your answer before sending, or use Skip question.", true);
      return;
    }
    setStatus("");
    var q = S.current ? S.current.question : "";
    $("ivAnswer").value = "";
    bubble("me", "<p>" + esc(skipped ? "(skipped this question)" : answer) + "</p>");
    busy = true;
    $("ivSend").disabled = true;
    var pend = typing();

    api({ action: "evaluate", role: S.role, type: S.type, level: S.level, company: S.company, question: q, answer: answer })
      .catch(function (err) {
        setStatus(err.message + " — scored offline.", true);
        return localEvaluate(q, answer);
      })
      .then(function (ev) {
        if (!S) return;
        pend.remove();
        S.turns.push({ question: q, answer: answer, eval: ev, at: Date.now() });
        bubble("ai",
          '<div class="ivscore"><span class="ivpill ' + band(ev.overall) + '">' + ev.overall + "/100</span>" +
          dim("Technical", ev.technical) + dim("Problem solving", ev.problemSolving) +
          dim("Communication", ev.communication) + dim("Confidence", ev.confidence) + dim("Clarity", ev.clarity) +
          "</div><p>" + esc(ev.feedback) + "</p>" +
          (ev.improvements && ev.improvements.length
            ? "<ul class='ivfix'>" + ev.improvements.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>"
            : "") +
          (ev.idealAnswer ? '<details class="ivideal"><summary>What a strong answer covers</summary><p>' + esc(ev.idealAnswer) + "</p></details>" : ""),
          "feedback");
        busy = false;
        setProgress();
        if (S.turns.length >= S.total) finish(false); else nextQuestion();
      });
  }

  function band(v) { return v >= 75 ? "good" : v >= 50 ? "mid" : "bad"; }
  function dim(label, v) {
    return '<span class="ivdim">' + label + " <b>" + (v == null ? "—" : v) + "</b></span>";
  }

  function finish(auto) {
    if (!S) return;
    clearInterval(tick);
    var session = S;
    S = null;
    if (!session.turns.length) {
      $("ivRun").hidden = true; $("ivSetup").hidden = false;
      setStatus(auto ? "Time ran out before any answer was recorded." : "", auto);
      return;
    }
    $("ivRun").hidden = true;
    $("ivReport").hidden = false;
    $("ivReportBody").innerHTML = '<div class="card"><p class="empty">Compiling your recruiter evaluation…</p></div>';
    window.scrollTo({ top: 0, behavior: "smooth" });

    api({
      action: "report", role: session.role, type: session.type, level: session.level, company: session.company,
      transcript: session.turns.map(function (t) { return { question: t.question, answer: t.answer, overall: t.eval.overall }; })
    }).catch(function () { return localReport(session); })
      .then(function (rep) {
        var record = {
          id: "iv" + Date.now(),
          date: Date.now(),
          role: session.role, type: session.type, level: session.level, company: session.company,
          durationSec: Math.round((Date.now() - session.startedAt) / 1000),
          questions: session.turns.length,
          report: rep,
          transcript: session.turns
        };
        var hist = loadHistory();
        hist.push(record);
        saveHistory(hist);
        renderReport(record);
        renderHistory();
      });
  }

  function ul(id, items, empty) {
    if (!items || !items.length) return '<ul class="insights"><li class="empty">' + empty + "</li></ul>";
    return '<ul class="insights">' + items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>";
  }

  function recBand(r) {
    return r === "Strong Candidate" ? "good" : r === "Interview Ready" ? "good" : r === "Needs Improvement" ? "mid" : "bad";
  }

  function renderReport(rec) {
    var r = rec.report;
    var html =
      '<div class="card readiness">' +
        '<div class="ring" style="--p:' + r.overall + '"><span><strong>' + r.overall + "</strong><small>Interview Score</small></span></div>" +
        '<div class="readiness-copy">' +
          '<span class="badge ' + recBand(r.recommendation) + '">' + esc(r.recommendation) + "</span>" +
          "<h3>" + esc(rec.role) + " · " + esc(rec.type) + " round" + (rec.company === "General" ? "" : " · " + esc(rec.company)) + "</h3>" +
          "<p>" + esc(r.summary) + "</p>" +
          '<ul class="rfactors">' +
            "<li><span>Technical</span><b>" + r.technical + "</b></li>" +
            "<li><span>Communication</span><b>" + r.communication + "</b></li>" +
            "<li><span>Confidence</span><b>" + r.confidence + "</b></li>" +
            "<li><span>Questions</span><b>" + rec.questions + "</b></li>" +
            "<li><span>Duration</span><b>" + fmt(rec.durationSec) + "</b></li>" +
          "</ul>" +
        "</div>" +
      "</div>" +
      '<h3 class="sec-title">Recruiter assessment</h3>' +
      '<div class="grid-2">' +
        "<div class='card'><h3>Strengths observed</h3>" + ul(null, r.strengths, "No standout strengths recorded.") + "</div>" +
        "<div class='card'><h3>Areas for improvement</h3>" + ul(null, r.improvements, "No blocking gaps recorded.") + "</div>" +
        "<div class='card'><h3>Topics to revise</h3>" + ul(null, r.reviseTopics, "—") + "</div>" +
        "<div class='card'><h3>Skills to improve</h3>" + ul(null, r.skillsToImprove, "—") + "</div>" +
        "<div class='card'><h3>Preparation strategy</h3>" + ul(null, r.strategy, "—") + "</div>" +
        "<div class='card'><h3>Learning resources</h3>" + ul(null, r.resources, "—") + "</div>" +
      "</div>" +
      '<h3 class="sec-title">Interview transcript &amp; per-answer scoring</h3>' +
      rec.transcript.map(function (t, i) {
        var e = t.eval;
        return '<div class="card rev' + (e.overall >= 60 ? "" : " bad") + '">' +
          "<p><b>Q" + (i + 1) + ".</b> " + esc(t.question) + "</p>" +
          '<div class="ans">Your answer: ' + esc(t.answer || "(skipped)") + "</div>" +
          '<div class="ivscore"><span class="ivpill ' + band(e.overall) + '">' + e.overall + "/100</span>" +
          dim("Technical", e.technical) + dim("Problem solving", e.problemSolving) +
          dim("Communication", e.communication) + dim("Confidence", e.confidence) + dim("Clarity", e.clarity) + "</div>" +
          '<div class="exp">💬 ' + esc(e.feedback) + "</div>" +
          (e.improvements && e.improvements.length
            ? "<ul class='ivfix'>" + e.improvements.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
          "</div>";
      }).join("");
    $("ivReportBody").innerHTML = html;
    $("ivReport").dataset.id = rec.id;
  }

  function download(rec) {
    var r = rec.report;
    var lines = [
      "PREPDECK — MOCK INTERVIEW EVALUATION",
      "=".repeat(46),
      "Date: " + new Date(rec.date).toLocaleString(),
      "Role: " + rec.role + "   Type: " + rec.type + "   Level: " + rec.level,
      "Pattern: " + rec.company + "   Questions: " + rec.questions + "   Duration: " + fmt(rec.durationSec),
      "",
      "OVERALL SCORE: " + r.overall + "/100   RECOMMENDATION: " + r.recommendation,
      "Technical " + r.technical + " | Communication " + r.communication + " | Confidence " + r.confidence,
      "",
      "SUMMARY", "-".repeat(46), r.summary, "",
      "STRENGTHS", "-".repeat(46)
    ].concat(
      (r.strengths || []).map(function (s) { return "• " + s; }), ["", "AREAS FOR IMPROVEMENT", "-".repeat(46)],
      (r.improvements || []).map(function (s) { return "• " + s; }), ["", "TOPICS TO REVISE", "-".repeat(46)],
      (r.reviseTopics || []).map(function (s) { return "• " + s; }), ["", "PREPARATION STRATEGY", "-".repeat(46)],
      (r.strategy || []).map(function (s) { return "• " + s; }), ["", "TRANSCRIPT", "=".repeat(46)],
      rec.transcript.reduce(function (acc, t, i) {
        return acc.concat([
          "Q" + (i + 1) + ". " + t.question,
          "Answer: " + (t.answer || "(skipped)"),
          "Score: " + t.eval.overall + "/100 — " + t.eval.feedback,
          ""
        ]);
      }, [])
    );
    var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prepdeck-interview-" + new Date(rec.date).toISOString().slice(0, 10) + ".txt";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ---------- history dashboard ---------- */
  var chart = null;
  function renderHistory() {
    var hist = loadHistory();
    var n = hist.length;
    var avg = n ? Math.round(hist.reduce(function (s, x) { return s + x.report.overall; }, 0) / n) : 0;
    var best = n ? Math.max.apply(null, hist.map(function (x) { return x.report.overall; })) : 0;
    var last3 = hist.slice(-3), prev3 = hist.slice(-6, -3);
    var mean = function (a) { return a.length ? a.reduce(function (s, x) { return s + x.report.overall; }, 0) / a.length : 0; };
    var trend = prev3.length ? Math.round(mean(last3) - mean(prev3)) : 0;

    $("ivStatTotal").textContent = n;
    $("ivStatAvg").textContent = avg;
    $("ivStatBest").textContent = best;
    $("ivStatTrend").textContent = (trend > 0 ? "+" : "") + trend;
    $("ivStatRec").textContent = n ? hist[n - 1].report.recommendation : "—";

    var listEl = $("ivHistoryList");
    listEl.innerHTML = "";
    if (!n) {
      listEl.innerHTML = '<li class="empty">No interviews yet — run your first mock round.</li>';
    } else {
      hist.slice().reverse().forEach(function (rec) {
        var li = document.createElement("li");
        li.innerHTML =
          "<span><b>" + esc(rec.role + " · " + rec.type) + "</b><small>" +
          new Date(rec.date).toLocaleString() + " · " + esc(rec.company) + " · " + rec.questions + " questions</small></span>" +
          '<span><b>' + rec.report.overall + "/100</b><small>" + esc(rec.report.recommendation) + "</small></span>";
        var btn = document.createElement("button");
        btn.className = "btn ghost sm";
        btn.textContent = "View report";
        btn.addEventListener("click", function () {
          $("ivSetup").hidden = true; $("ivRun").hidden = true; $("ivReport").hidden = false;
          renderReport(rec);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        li.appendChild(btn);
        listEl.appendChild(li);
      });
    }

    var cv = $("chIvTrend");
    if (cv && window.Chart) {
      if (chart) { chart.destroy(); chart = null; }
      var pts = hist.slice(-12);
      chart = new window.Chart(cv.getContext("2d"), {
        type: "line",
        data: {
          labels: pts.map(function (x, i) { return "#" + (i + 1); }),
          datasets: [
            { label: "Overall", data: pts.map(function (x) { return x.report.overall; }), borderColor: "#5b7cfa", tension: .35, fill: false },
            { label: "Technical", data: pts.map(function (x) { return x.report.technical; }), borderColor: "#22c55e", tension: .35, fill: false },
            { label: "Communication", data: pts.map(function (x) { return x.report.communication; }), borderColor: "#f59e0b", tension: .35, fill: false }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { position: "bottom" } } }
      });
    }
  }

  /* ---------- wiring ---------- */
  function init() {
    $("ivStart").addEventListener("click", start);
    $("ivSend").addEventListener("click", function () { submitAnswer(false); });
    $("ivSkip").addEventListener("click", function () { submitAnswer(true); });
    $("ivEnd").addEventListener("click", function () {
      if (!S) return;
      if (!S.turns.length) {
        if (!confirm("End the interview without any scored answers?")) return;
        clearInterval(tick); S = null;
        $("ivRun").hidden = true; $("ivSetup").hidden = false;
        return;
      }
      if (confirm("End the interview now and generate your report?")) finish(false);
    });
    $("ivAnswer").addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submitAnswer(false);
    });
    $("ivRetake").addEventListener("click", function () {
      $("ivReport").hidden = true; $("ivRun").hidden = true; $("ivSetup").hidden = false;
      setStatus("");
    });
    $("ivDownload").addEventListener("click", function () {
      var id = $("ivReport").dataset.id;
      var rec = loadHistory().filter(function (x) { return x.id === id; })[0];
      if (rec) download(rec);
    });
    $("ivClearHistory").addEventListener("click", function () {
      if (confirm("Delete all stored interview history?")) { localStorage.removeItem(HKEY); renderHistory(); }
    });
    renderHistory();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.PrepDeckInterview = { render: renderHistory };
})();
