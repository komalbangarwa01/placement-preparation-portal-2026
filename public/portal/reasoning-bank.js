/* PrepDeck — Reasoning Question Bank
   Deterministic generator: 10 categories x 3 levels x 45 items = 1350 questions.
   Every item ships with four options, a correct index and a worked explanation. */
(function (root) {
  "use strict";

  var CATEGORIES = [
    "Number Series", "Alphabet Series", "Coding-Decoding", "Blood Relations",
    "Direction Sense", "Seating Arrangement", "Syllogism", "Analogy",
    "Statement and Conclusion", "Logical Puzzles"
  ];
  var LEVELS = ["Easy", "Medium", "Hard"];
  var PER_LEVEL = 45;

  /* deterministic pseudo-random generator so the bank is identical on every load */
  function rng(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  function pick(rand, arr) { return arr[Math.floor(rand() * arr.length) % arr.length]; }
  function int(rand, lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }

  var A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function shift(ch, k) { return A[((A.indexOf(ch) + k) % 26 + 26) % 26]; }
  function code(word, k) { return word.split("").map(function (c) { return shift(c, k); }).join(""); }
  function ord(n) { return n + (["th", "st", "nd", "rd"][n % 10 > 3 || (n % 100 - n % 10 === 10) ? 0 : n % 10] || "th"); }

  /* builds one MCQ: unique options, deterministic shuffle */
  function mcq(rand, question, correct, wrong, explanation) {
    var opts = [String(correct)];
    for (var i = 0; i < wrong.length && opts.length < 4; i++) {
      var w = String(wrong[i]);
      if (opts.indexOf(w) === -1) opts.push(w);
    }
    var pad = 1;
    while (opts.length < 4) {
      var alt = String(correct) + " ".repeat(pad);
      if (!isNaN(Number(correct))) alt = String(Number(correct) + pad * 3);
      if (opts.indexOf(alt) === -1) opts.push(alt);
      pad++;
    }
    for (var j = opts.length - 1; j > 0; j--) {
      var k = Math.floor(rand() * (j + 1));
      var t = opts[j]; opts[j] = opts[k]; opts[k] = t;
    }
    return { q: question, options: opts, ans: opts.indexOf(String(correct)), exp: explanation };
  }

  var NAMES = ["Arun", "Priya", "Rahul", "Meera", "Kabir", "Sneha", "Vikram", "Ananya", "Rohan", "Divya",
    "Karthik", "Nisha", "Aditya", "Pooja", "Manish", "Farah", "Imran", "Lakshmi", "Nikhil", "Tanvi"];
  var WORDS = ["LOGIC", "BRAIN", "PAPER", "MOUSE", "TIGER", "PLANT", "CHAIR", "STONE", "CLOUD", "TRAIN",
    "GRAPE", "HOUSE", "LIGHT", "MONEY", "NURSE", "OCEAN", "PRIZE", "QUEEN", "RIVER", "SNAKE"];
  function sing(w) {
    if (/ists$/.test(w) || /ers$/.test(w) || /ants$/.test(w)) return w.slice(0, -1);
    if (/ies$/.test(w)) return w.slice(0, -3) + "y";
    if (/es$/.test(w) && /(ch|sh|s|x|z)es$/.test(w)) return w.slice(0, -2);
    return w.replace(/s$/, "");
  }
  var GROUPS = ["engineers", "students", "doctors", "artists", "singers", "lawyers", "farmers", "pilots",
    "teachers", "cricketers", "authors", "chemists", "dancers", "nurses", "traders"];

  /* ------------------------------------------------------------------ *
   * 1. Number Series                                                    *
   * ------------------------------------------------------------------ */
  function numberSeries(level, i, rand) {
    var a, d, r, seq, ans, exp;
    if (level === "Easy") {
      var mode = i % 3;
      if (mode === 0) {
        a = int(rand, 3, 20); d = int(rand, 2, 12);
        seq = [a, a + d, a + 2 * d, a + 3 * d]; ans = a + 4 * d;
        exp = "The series increases by a constant " + d + " each time: " + (a + 3 * d) + " + " + d + " = " + ans + ".";
      } else if (mode === 1) {
        a = int(rand, 2, 6); r = int(rand, 2, 3);
        seq = [a, a * r, a * r * r, a * r * r * r]; ans = seq[3] * r;
        exp = "Each term is multiplied by " + r + ": " + seq[3] + " x " + r + " = " + ans + ".";
      } else {
        a = int(rand, 40, 90); d = int(rand, 3, 9);
        seq = [a, a - d, a - 2 * d, a - 3 * d]; ans = a - 4 * d;
        exp = "The series decreases by " + d + " each step: " + seq[3] + " - " + d + " = " + ans + ".";
      }
    } else if (level === "Medium") {
      var m2 = i % 3;
      if (m2 === 0) {
        a = int(rand, 2, 9); d = int(rand, 2, 5);
        seq = [a, a + d, a + d + (d + 2), a + d + (d + 2) + (d + 4)];
        ans = seq[3] + (d + 6);
        exp = "Differences grow by 2: " + d + ", " + (d + 2) + ", " + (d + 4) + ", " + (d + 6) + " -> " + seq[3] + " + " + (d + 6) + " = " + ans + ".";
      } else if (m2 === 1) {
        a = int(rand, 2, 6); var c = int(rand, 1, 5);
        seq = [a, a * 2 + c, (a * 2 + c) * 2 + c, ((a * 2 + c) * 2 + c) * 2 + c];
        ans = seq[3] * 2 + c;
        exp = "Rule: multiply by 2 and add " + c + " -> " + seq[3] + " x 2 + " + c + " = " + ans + ".";
      } else {
        var n0 = int(rand, 2, 7);
        seq = [n0 * n0, (n0 + 1) * (n0 + 1), (n0 + 2) * (n0 + 2), (n0 + 3) * (n0 + 3)];
        ans = (n0 + 4) * (n0 + 4);
        exp = "These are perfect squares of " + n0 + ", " + (n0 + 1) + ", " + (n0 + 2) + ", " + (n0 + 3) + " so the next is " + (n0 + 4) + "^2 = " + ans + ".";
      }
    } else {
      var m3 = i % 3;
      if (m3 === 0) {
        var b = int(rand, 2, 5);
        seq = [b * b * b + b, (b + 1) * (b + 1) * (b + 1) + (b + 1), (b + 2) * (b + 2) * (b + 2) + (b + 2), (b + 3) * (b + 3) * (b + 3) + (b + 3)];
        ans = (b + 4) * (b + 4) * (b + 4) + (b + 4);
        exp = "Pattern is n^3 + n. For n = " + (b + 4) + ": " + ((b + 4) * (b + 4) * (b + 4)) + " + " + (b + 4) + " = " + ans + ".";
      } else if (m3 === 1) {
        var p = int(rand, 3, 8), q = int(rand, 2, 6);
        seq = [p, p * q - 1, (p * q - 1) * q - 1, ((p * q - 1) * q - 1) * q - 1];
        ans = seq[3] * q - 1;
        exp = "Rule: multiply by " + q + " and subtract 1 -> " + seq[3] + " x " + q + " - 1 = " + ans + ".";
      } else {
        var x = int(rand, 1, 6), y = int(rand, 20, 40);
        seq = [x, y, x + 3, y - 4, x + 6];
        ans = y - 8;
        exp = "Two alternating series: odd places " + x + ", " + (x + 3) + ", " + (x + 6) + " (+3) and even places " + y + ", " + (y - 4) + " (-4), so the next even-place term is " + ans + ".";
      }
    }
    var wrong = [ans + int(rand, 1, 4), ans - int(rand, 1, 4), ans + int(rand, 5, 12)];
    return mcq(rand, "Find the missing term in the series: " + seq.join(", ") + ", ?", ans, wrong, exp);
  }

  /* ------------------------------------------------------------------ *
   * 2. Alphabet Series                                                  *
   * ------------------------------------------------------------------ */
  function alphabetSeries(level, i, rand) {
    var start, step, seq = [], ans, exp, n;
    if (level === "Easy") {
      start = int(rand, 0, 12); step = int(rand, 1, 4);
      for (n = 0; n < 4; n++) seq.push(A[(start + n * step) % 26]);
      ans = A[(start + 4 * step) % 26];
      exp = "Each letter moves " + step + " place(s) forward in the alphabet, so after " + seq[3] + " comes " + ans + ".";
    } else if (level === "Medium") {
      if (i % 2 === 0) {
        start = int(rand, 0, 10); step = int(rand, 2, 4);
        for (n = 0; n < 4; n++) seq.push(A[(start + n * step) % 26] + A[(start + n * step + 2) % 26]);
        ans = A[(start + 4 * step) % 26] + A[(start + 4 * step + 2) % 26];
        exp = "Each pair jumps " + step + " letters forward, and the second letter is always 2 ahead of the first, giving " + ans + ".";
      } else {
        start = int(rand, 4, 20);
        for (n = 0; n < 4; n++) seq.push(A[(start - n * 2 + 26) % 26]);
        ans = A[(start - 8 + 26) % 26];
        exp = "The letters move 2 places backwards each time, so after " + seq[3] + " comes " + ans + ".";
      }
    } else {
      if (i % 2 === 0) {
        start = int(rand, 0, 8);
        var pos = start, gaps = [1, 2, 3, 4];
        seq.push(A[pos % 26]);
        for (n = 0; n < 3; n++) { pos += gaps[n]; seq.push(A[pos % 26]); }
        ans = A[(pos + 4) % 26];
        exp = "The gaps increase 1, 2, 3, 4. From " + seq[3] + " move 4 places forward to reach " + ans + ".";
      } else {
        start = int(rand, 0, 9); step = int(rand, 2, 3);
        for (n = 0; n < 4; n++) seq.push(A[(start + n * step) % 26] + String(n + 1));
        ans = A[(start + 4 * step) % 26] + "5";
        exp = "Letters advance " + step + " places while the numbers count 1, 2, 3, 4, so the next term is " + ans + ".";
      }
    }
    var wrong = [A[(A.indexOf(seq[3][0]) + 1) % 26] + (ans.length > 1 ? ans.slice(1) : ""),
      A[(A.indexOf(seq[3][0]) + 7) % 26] + (ans.length > 1 ? ans.slice(1) : ""),
      A[(A.indexOf(seq[3][0]) + 25) % 26] + (ans.length > 1 ? ans.slice(1) : "")];
    return mcq(rand, "Complete the letter series: " + seq.join(", ") + ", ?", ans, wrong, exp);
  }

  /* ------------------------------------------------------------------ *
   * 3. Coding-Decoding                                                  *
   * ------------------------------------------------------------------ */
  function codingDecoding(level, i, rand) {
    var w1 = pick(rand, WORDS), w2 = pick(rand, WORDS);
    if (w2 === w1) w2 = WORDS[(WORDS.indexOf(w1) + 3) % WORDS.length];
    var k, ans, exp, question, wrong;
    if (level === "Easy") {
      k = int(rand, 1, 4);
      ans = code(w2, k);
      question = "In a certain code, " + w1 + " is written as " + code(w1, k) + ". How is " + w2 + " written in that code?";
      exp = "Every letter moves " + k + " place(s) forward: " + w2.split("").map(function (c) { return c + "->" + shift(c, k); }).join(", ") + " giving " + ans + ".";
      wrong = [code(w2, k + 1), code(w2, k - 1), code(w2, k + 2)];
    } else if (level === "Medium") {
      k = int(rand, 1, 3);
      ans = code(w2.split("").reverse().join(""), k);
      question = "If " + w1 + " is coded as " + code(w1.split("").reverse().join(""), k) + ", then " + w2 + " is coded as:";
      exp = "The word is first reversed and then every letter is shifted " + k + " place(s) forward. " + w2 + " reversed is " + w2.split("").reverse().join("") + ", which becomes " + ans + ".";
      wrong = [code(w2, k), w2.split("").reverse().join(""), code(w2.split("").reverse().join(""), k + 1)];
    } else {
      var sum = w2.split("").reduce(function (t, c) { return t + A.indexOf(c) + 1; }, 0);
      var sum1 = w1.split("").reduce(function (t, c) { return t + A.indexOf(c) + 1; }, 0);
      ans = sum;
      question = "In a coding system the code of a word is the sum of the alphabetical positions of its letters. If " + w1 + " = " + sum1 + ", what is the code for " + w2 + "?";
      exp = w2.split("").map(function (c) { return c + "=" + (A.indexOf(c) + 1); }).join(" + ") + " = " + sum + ".";
      wrong = [sum + int(rand, 1, 5), sum - int(rand, 1, 5), sum + int(rand, 6, 14)];
    }
    return mcq(rand, question, ans, wrong, exp);
  }

  /* ------------------------------------------------------------------ *
   * 4. Blood Relations                                                  *
   * ------------------------------------------------------------------ */
  function bloodRelations(level, i, rand) {
    var m = NAMES[i % NAMES.length], f = NAMES[(i * 3 + 7) % NAMES.length];
    if (f === m) f = NAMES[(i * 3 + 8) % NAMES.length];
    var question, ans, wrong, exp;
    if (level === "Easy") {
      var t = i % 3;
      if (t === 0) {
        question = m + " said, \"" + f + " is the son of my father's only son.\" How is " + f + " related to " + m + "?";
        ans = "Son"; exp = "My father's only son is " + m + " himself, so " + f + " is his son.";
        wrong = ["Brother", "Nephew", "Cousin"];
      } else if (t === 1) {
        question = "Pointing to a woman, " + m + " said, \"She is the daughter of my grandfather's only child.\" How is the woman related to " + m + "?";
        ans = "Sister"; exp = "The grandfather's only child is " + m + "'s parent, so the woman is " + m + "'s sister.";
        wrong = ["Aunt", "Cousin", "Niece"];
      } else {
        question = f + " is the mother of " + m + ". " + m + " is the father of a girl. How is " + f + " related to that girl?";
        ans = "Grandmother"; exp = m + "'s daughter is the granddaughter of " + m + "'s mother " + f + ".";
        wrong = ["Mother", "Aunt", "Sister"];
      }
    } else if (level === "Medium") {
      if (i % 2 === 0) {
        question = "Pointing to a photograph, " + m + " said, \"He is the only son of the mother of my sister's brother.\" Who is in the photograph?";
        ans = "Himself"; exp = "The mother of his sister's brother is his own mother, and her only son is " + m + " himself.";
        wrong = ["His father", "His uncle", "His cousin"];
      } else {
        question = f + " is the sister of " + m + ". " + m + "'s wife's only brother is " + pick(rand, NAMES) + ". How is " + f + " related to that brother?";
        ans = "Sister-in-law"; exp = f + " is the sister of the man married to the brother's sister, making her his sister-in-law.";
        wrong = ["Sister", "Cousin", "Aunt"];
      }
    } else {
      if (i % 2 === 0) {
        question = "A is the father of B. C is the daughter of B. D is the brother of C. E is the mother of D. How is A related to E?";
        ans = "Father-in-law"; exp = "D and C are B's children, so E is B's wife. A, being B's father, is E's father-in-law.";
        wrong = ["Father", "Brother-in-law", "Grandfather"];
      } else {
        question = "P is the son of Q. R, the sister of P, is married to S. T is the only child of S and R. How is Q related to T?";
        ans = "Maternal grandfather"; exp = "R is Q's daughter and T is R's child, so Q is T's maternal grandfather.";
        wrong = ["Paternal grandfather", "Uncle", "Father"];
      }
    }
    return mcq(rand, question, ans, wrong, exp);
  }

  /* ------------------------------------------------------------------ *
   * 5. Direction Sense                                                  *
   * ------------------------------------------------------------------ */
  function directionSense(level, i, rand) {
    var p = pick(rand, NAMES), a, b, c, question, ans, wrong, exp;
    if (level === "Easy") {
      a = int(rand, 3, 12); b = int(rand, 3, 12);
      question = p + " walks " + a + " km towards the north, then turns right and walks " + b + " km. In which direction is " + p + " now facing?";
      ans = "East"; exp = "Facing north and turning right means turning clockwise by 90 degrees, which points east.";
      wrong = ["West", "North", "South"];
    } else if (level === "Medium") {
      a = int(rand, 3, 9); b = int(rand, 2, 8); c = int(rand, 1, a - 1);
      var net = a - c;
      question = p + " walks " + a + " km south, then " + b + " km east, then " + c + " km north. How far is " + p + " from the starting point in the north-south direction?";
      ans = net + " km"; exp = "Walking " + a + " km south and " + c + " km north leaves a net " + net + " km to the south of the start.";
      wrong = [(a + c) + " km", b + " km", (a - c + 2) + " km"];
    } else {
      var legs = [[3, 4], [6, 8], [5, 12], [9, 12], [8, 15]];
      var L = legs[i % legs.length];
      var dist = Math.round(Math.sqrt(L[0] * L[0] + L[1] * L[1]));
      question = p + " starts from home, walks " + L[0] + " km towards the west and then turns south and walks " + L[1] + " km. What is the shortest distance from home?";
      ans = dist + " km";
      exp = "The two legs form a right angle, so distance = sqrt(" + L[0] + "^2 + " + L[1] + "^2) = sqrt(" + (L[0] * L[0] + L[1] * L[1]) + ") = " + dist + " km.";
      wrong = [(L[0] + L[1]) + " km", (dist + 2) + " km", Math.abs(L[1] - L[0]) + " km"];
    }
    return mcq(rand, question, ans, wrong, exp);
  }

  /* ------------------------------------------------------------------ *
   * 6. Seating Arrangement                                              *
   * ------------------------------------------------------------------ */
  function seating(level, i, rand) {
    var n, left, right, question, ans, wrong, exp;
    if (level === "Easy") {
      n = int(rand, 20, 45); left = int(rand, 4, 12);
      ans = n - left + 1;
      question = "In a row of " + n + " students, " + pick(rand, NAMES) + " is " + ord(left) + " from the left end. What is the position from the right end?";
      exp = "Position from right = total - position from left + 1 = " + n + " - " + left + " + 1 = " + ans + ".";
      wrong = [n - left, n - left + 2, left + 1];
    } else if (level === "Medium") {
      left = int(rand, 5, 15); right = int(rand, 5, 15);
      ans = left + right - 1;
      question = pick(rand, NAMES) + " is " + ord(left) + " from the left end and " + ord(right) + " from the right end of a row. How many people are in the row?";
      exp = "Total = left position + right position - 1 = " + left + " + " + right + " - 1 = " + ans + ".";
      wrong = [left + right, left + right + 1, left + right - 2];
    } else {
      n = 8;
      var seatA = int(rand, 1, 4), gap = int(rand, 2, 4);
      ans = "" + (seatA + gap);
      question = "Eight friends sit in a straight row facing north. " + pick(rand, NAMES) + " occupies seat number " + seatA +
        " counted from the left, and " + pick(rand, NAMES) + " sits exactly " + gap + " seats to the right. Which seat number does the second friend occupy?";
      exp = "Moving " + gap + " seats to the right from seat " + seatA + " gives seat " + (seatA + gap) + ".";
      wrong = [String(seatA + gap + 1), String(seatA - gap > 0 ? seatA - gap : seatA + 1), String(seatA + gap + 2)];
    }
    return mcq(rand, question, ans, wrong, exp);
  }

  /* ------------------------------------------------------------------ *
   * 7. Syllogism                                                        *
   * ------------------------------------------------------------------ */
  function syllogism(level, i, rand) {
    var x = GROUPS[i % GROUPS.length], y = GROUPS[(i * 2 + 3) % GROUPS.length], z = GROUPS[(i * 3 + 7) % GROUPS.length];
    if (y === x) y = GROUPS[(GROUPS.indexOf(x) + 4) % GROUPS.length];
    if (z === x || z === y) z = GROUPS[(GROUPS.indexOf(y) + 5) % GROUPS.length];
    var xs = sing(x), ys = sing(y), zs = sing(z);
    var question, ans, wrong, exp;
    if (level === "Easy") {
      question = "Statements: All " + x + " are " + y + ". All " + y + " are " + z + ".\nConclusion: All " + x + " are " + z + ".\nDoes the conclusion follow?";
      ans = "Yes, it definitely follows";
      exp = "The two universal statements chain together: " + x + " sit inside " + y + ", and " + y + " sit inside " + z + ", so all " + x + " must be " + z + ".";
      wrong = ["No, it does not follow", "Cannot be determined", "Only partially follows"];
    } else if (level === "Medium") {
      question = "Statements: Some " + x + " are " + y + ". All " + y + " are " + z + ".\nConclusion: Some " + x + " are " + z + ".\nDoes the conclusion follow?";
      ans = "Yes, it definitely follows";
      exp = "The " + x + " that are " + y + " must also be " + z + " because every " + y + " is a " + z + ", so at least some " + x + " are " + z + ".";
      wrong = ["No, it does not follow", "Cannot be determined", "Only the converse follows"];
    } else {
      if (i % 2 === 0) {
        question = "Statements: All " + x + " are " + y + ". Some " + z + " are " + y + ".\nConclusion: Some " + z + " are " + x + ".\nDoes the conclusion follow?";
        ans = "No, it does not follow";
        exp = "The " + z + " that are " + y + " need not belong to the " + x + " group, so no definite link can be drawn between " + z + " and " + x + ".";
        wrong = ["Yes, it definitely follows", "Yes, by conversion", "Both conclusions follow"];
      } else {
        question = "Statements: No " + x + " are " + y + ". Some " + y + " are " + z + ".\nConclusion: Some " + z + " are not " + x + ".\nDoes the conclusion follow?";
        ans = "Yes, it definitely follows";
        exp = "The " + z + " that are " + y + " cannot be " + x + ", because no " + x + " is a " + y + ". Hence some " + z + " are definitely not " + x + ".";
        wrong = ["No, it does not follow", "Cannot be determined", "Only if all " + z + " are " + y];
      }
    }
    return mcq(rand, question, ans, wrong, exp);
  }

  /* ------------------------------------------------------------------ *
   * 8. Analogy                                                          *
   * ------------------------------------------------------------------ */
  var WORD_PAIRS = [
    ["Doctor", "Hospital", "Teacher", "School", "the place where the professional works"],
    ["Pen", "Write", "Knife", "Cut", "the tool and the action it performs"],
    ["Bird", "Nest", "Bee", "Hive", "the creature and its dwelling"],
    ["Author", "Book", "Composer", "Symphony", "the creator and the work created"],
    ["Fire", "Ashes", "Explosion", "Debris", "the event and what it leaves behind"],
    ["Hunger", "Food", "Thirst", "Water", "the need and what satisfies it"],
    ["Cobbler", "Leather", "Carpenter", "Wood", "the craftsman and the raw material"],
    ["Ostrich", "Bird", "Whale", "Mammal", "the species and its biological class"],
    ["Sculptor", "Statue", "Poet", "Poem", "the artist and the creation"],
    ["Clock", "Time", "Thermometer", "Temperature", "the instrument and what it measures"]
  ];
  function analogy(level, i, rand) {
    var question, ans, wrong, exp, n;
    if (level === "Easy") {
      var p = WORD_PAIRS[i % WORD_PAIRS.length];
      question = p[0] + " : " + p[1] + " :: " + p[2] + " : ?";
      ans = p[3];
      exp = "The relationship is " + p[4] + ", so " + p[2] + " pairs with " + p[3] + ".";
      wrong = [WORD_PAIRS[(i + 1) % WORD_PAIRS.length][1], WORD_PAIRS[(i + 2) % WORD_PAIRS.length][3], WORD_PAIRS[(i + 3) % WORD_PAIRS.length][1]];
    } else if (level === "Medium") {
      n = int(rand, 3, 12);
      var m = int(rand, 3, 12);
      question = n + " : " + (n * n) + " :: " + m + " : ?";
      ans = m * m;
      exp = "The second number is the square of the first: " + m + "^2 = " + (m * m) + ".";
      wrong = [m * 2, m * m + m, m * m - m];
    } else {
      n = int(rand, 2, 9);
      var k = int(rand, 2, 9);
      question = n + " : " + (n * n * n + 1) + " :: " + k + " : ?";
      ans = k * k * k + 1;
      exp = "The rule is n^3 + 1. For " + k + ": " + (k * k * k) + " + 1 = " + ans + ".";
      wrong = [k * k * k, k * k * k - 1, k * k + 1];
    }
    return mcq(rand, question, ans, wrong, exp);
  }

  /* ------------------------------------------------------------------ *
   * 9. Statement and Conclusion                                         *
   * ------------------------------------------------------------------ */
  var SC = [
    ["The institute has announced that only candidates scoring above 60% will be called for the placement drive.",
      "Candidates scoring below 60% will not be called for the drive.", true,
      "The statement sets 60% as a strict cut-off, so anyone below it is excluded."],
    ["Heavy rainfall has been forecast for the city over the weekend.",
      "People should carry umbrellas over the weekend.", true,
      "A reasonable precaution follows directly from the forecast."],
    ["The company has increased the salary of its engineers by 20%.",
      "The company is making record profits.", false,
      "A salary revision may have many causes; profitability is not stated."],
    ["Admission to the training programme is open to all final-year students.",
      "Second-year students are also eligible for the programme.", false,
      "Eligibility is limited to final-year students, so the conclusion contradicts the statement."],
    ["The college conducts weekly mock aptitude tests for placement aspirants.",
      "Regular practice is considered useful for placement preparation.", true,
      "Conducting weekly tests implies the college values regular practice."],
    ["Registrations for the campus drive close on Friday at 5 pm.",
      "Applications received on Saturday will be rejected.", true,
      "A firm closing time implies later applications are not accepted."],
    ["The library will remain closed for renovation for two weeks.",
      "Students will not be able to borrow books from the library during those two weeks.", true,
      "A closed library cannot issue books during the closure."],
    ["Most recruiters shortlist candidates on the basis of aptitude test scores.",
      "Aptitude test scores are the only criterion used by recruiters.", false,
      "'Most' and 'on the basis of' do not mean it is the sole criterion."],
    ["The training cell has advised students to revise reasoning topics daily.",
      "Daily revision improves retention of reasoning concepts.", true,
      "The advice rests on the assumption that daily revision helps retention."],
    ["Company X has stopped hiring freshers this year.",
      "Company X will never hire freshers again.", false,
      "A pause in hiring this year says nothing about future years."]
  ];
  function statementConclusion(level, i, rand) {
    var base = SC[i % SC.length];
    var ctx = ["At Sunrise Institute of Technology", "At the district training centre", "At Nova Engineering College",
      "At the campus placement cell", "At Horizon Skills Academy"][Math.floor(i / SC.length) % 5];
    var follows = base[2];
    var question = "Statement: " + ctx + ", " + base[0].charAt(0).toLowerCase() + base[0].slice(1) + "\nConclusion: " + base[1] + "\nDecide whether the conclusion logically follows.";
    var ans = follows ? "The conclusion follows" : "The conclusion does not follow";
    var wrong = follows
      ? ["The conclusion does not follow", "The conclusion is contradicted", "Data is insufficient"]
      : ["The conclusion follows", "The conclusion is implied", "Both are equally valid"];
    if (level === "Hard") {
      question = "Statement: " + ctx + ", " + base[0].charAt(0).toLowerCase() + base[0].slice(1) + "\nConclusion I: " + base[1] + "\nConclusion II: " + SC[(i + 3) % SC.length][1] +
        "\nWhich of the conclusions follows from the statement?";
      var secondFollows = false;
      ans = follows ? "Only Conclusion I follows" : "Neither conclusion follows";
      wrong = ["Only Conclusion II follows", "Both conclusions follow",
        follows ? "Neither conclusion follows" : "Only Conclusion I follows"];
      return mcq(rand, question, ans, wrong,
        base[3] + " Conclusion II refers to an unrelated situation, so it cannot be drawn from this statement." + (secondFollows ? "" : ""));
    }
    return mcq(rand, question, ans, wrong, base[3]);
  }

  /* ------------------------------------------------------------------ *
   * 10. Logical Puzzles                                                 *
   * ------------------------------------------------------------------ */
  var DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  function logicalPuzzles(level, i, rand) {
    var question, ans, wrong, exp, a, b, d1;
    if (level === "Easy") {
      if (i % 2 === 0) {
        d1 = int(rand, 0, 6); var add = int(rand, 2, 6);
        ans = DAYS[(d1 + add) % 7];
        question = "If today is " + DAYS[d1] + ", what day will it be after " + add + " days?";
        exp = "Counting " + add + " days forward from " + DAYS[d1] + " lands on " + ans + ".";
        wrong = [DAYS[(d1 + add + 1) % 7], DAYS[(d1 + add + 2) % 7], DAYS[(d1 + add + 6) % 7]];
      } else {
        var odd = [["Rose", "Lily", "Jasmine", "Mango", "Mango is a fruit while the others are flowers."],
          ["Copper", "Iron", "Silver", "Plastic", "Plastic is not a metal."],
          ["Square", "Rectangle", "Cube", "Rhombus", "A cube is three-dimensional; the rest are plane figures."],
          ["Eagle", "Sparrow", "Bat", "Parrot", "A bat is a mammal, not a bird."]];
        var o = odd[i % odd.length];
        question = "Choose the odd one out: " + o[0] + ", " + o[1] + ", " + o[2] + ", " + o[3] + ".";
        ans = o[3]; exp = o[4]; wrong = [o[0], o[1], o[2]];
      }
    } else if (level === "Medium") {
      a = int(rand, 4, 12); b = int(rand, 2, 5);
      ans = a * b;
      question = "The present age of a father is " + b + " times that of his son. If the son is " + a + " years old, what is the father's age?";
      exp = "Father's age = " + b + " x " + a + " = " + ans + " years.";
      wrong = [a * b + a, a * b - a, a + b];
    } else {
      if (i % 2 === 0) {
        var son = int(rand, 8, 16), yrs = int(rand, 4, 10);
        var father = 3 * son;
        ans = (father + yrs) + " years";
        question = "A father is three times as old as his son who is " + son + " years old. What will be the father's age after " + yrs + " years?";
        exp = "Father is 3 x " + son + " = " + father + " now, so after " + yrs + " years he will be " + (father + yrs) + " years old.";
        wrong = [(father) + " years", (father + 2 * yrs) + " years", (son + yrs) + " years"];
      } else {
        var total = int(rand, 30, 60), rank = int(rand, 8, 20), fails = int(rand, 3, 9);
        ans = "" + (total - rank - fails + 1);
        question = "In a class of " + total + " students, " + pick(rand, NAMES) + " ranks " + ord(rank) + " from the top. If " + fails +
          " students failed the examination, what is " + "the rank from the bottom among all students?";
        exp = "Rank from the bottom = " + total + " - " + rank + " + 1 = " + (total - rank + 1) + "; excluding the " + fails +
          " students who failed, the position becomes " + (total - rank - fails + 1) + ".";
        wrong = [String(total - rank + 1), String(total - rank - fails), String(rank + fails)];
      }
    }
    return mcq(rand, question, ans, wrong, exp);
  }

  var GENERATORS = {
    "Number Series": numberSeries,
    "Alphabet Series": alphabetSeries,
    "Coding-Decoding": codingDecoding,
    "Blood Relations": bloodRelations,
    "Direction Sense": directionSense,
    "Seating Arrangement": seating,
    "Syllogism": syllogism,
    "Analogy": analogy,
    "Statement and Conclusion": statementConclusion,
    "Logical Puzzles": logicalPuzzles
  };

  function build() {
    var all = [];
    CATEGORIES.forEach(function (cat, ci) {
      LEVELS.forEach(function (level, li) {
        for (var i = 0; i < PER_LEVEL; i++) {
          var rand = rng((ci + 1) * 7919 + (li + 1) * 104729 + i * 1301 + 17);
          var item = GENERATORS[cat](level, i, rand);
          all.push({
            id: cat.replace(/[^A-Za-z]/g, "").slice(0, 6).toUpperCase() + "-" + level[0] + "-" + (i + 1),
            category: cat, level: level,
            q: item.q, options: item.options, ans: item.ans, exp: item.exp
          });
        }
      });
    });
    return all;
  }

  var BANK = build();
  root.ReasoningBank = {
    CATEGORIES: CATEGORIES,
    LEVELS: LEVELS,
    all: BANK,
    count: BANK.length,
    filter: function (category, level) {
      return BANK.filter(function (q) {
        return (!category || category === "Mixed" || q.category === category) &&
          (!level || level === "Mixed" || q.level === level);
      });
    },
    byId: function (id) {
      for (var i = 0; i < BANK.length; i++) if (BANK[i].id === id) return BANK[i];
      return null;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
