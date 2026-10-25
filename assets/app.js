/* ============================================================
   Gas Leak SVM project defence — site behaviour
   Vanilla JS, no build step. The only network dependency is
   Pyodide, fetched from jsDelivr the first time a cell is run.
   ============================================================ */
(function () {
  "use strict";

  var NS = "gasvm.";
  var root = document.documentElement;

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(NS + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(NS + k, v); } catch (e) {} }
  };

  /* Fallback only — the inline script in each <head> applies these before the
     first paint. Repeating them here keeps the file self-contained. */
  var savedTheme = store.get("theme", null);
  if (savedTheme === "dark" || savedTheme === "light") root.setAttribute("data-theme", savedTheme);
  if (store.get("nav", "") === "collapsed") root.setAttribute("data-nav", "collapsed");

  /* ---------------------------------------------------------
     1. The one place the site structure is written down
     --------------------------------------------------------- */
  var NAV = [
    ["Orientation", [
      ["index.html", "00", "Start here"],
      ["report.html", "01", "The report, chapter by chapter"],
      ["glossary.html", "02", "Key terms, defined"]
    ]],
    ["The problem & the data", [
      ["problem.html", "03", "Gas leaks and gas sensors"],
      ["data.html", "04", "The dataset and what it shows"]
    ]],
    ["The mathematics", [
      ["svm.html", "05", "The SVM idea: margins"],
      ["derivation.html", "06", "The derivation, line by line"],
      ["tuning.html", "07", "Scaling, tuning and metrics"],
      ["results.html", "08", "The results, figure by figure"]
    ]],
    ["The interview", [
      ["qa-project.html", "09", "Q&A — your project"],
      ["qa-math.html", "10", "Q&A — the mathematics"],
      ["qa-weakspots.html", "11", "Hard questions & honest gaps"],
      ["cheatsheet.html", "12", "Cheat sheet"]
    ]],
    ["Programming", [
      ["lab.html", "13", "Python lab — train the SVM here"],
      ["vscode.html", "14", "Run it in VS Code"],
      ["colab.html", "15", "Run it in Google Colab"],
      ["qa-python.html", "16", "Q&A — programming"]
    ]]
  ];

  var FOLD_KEY = "folded";

  function loadFolded() {
    try { return JSON.parse(store.get(FOLD_KEY, "[]")); } catch (e) { return []; }
  }
  function saveFolded(list) { store.set(FOLD_KEY, JSON.stringify(list)); }

  function here() { return location.pathname.split("/").pop() || "index.html"; }

  function renderNav() {
    var mount = document.querySelector(".sidebar");
    if (!mount) return;
    var cur = here();
    var folded = loadFolded();

    var html =
      '<a class="brand" href="index.html">' +
        '<span class="brand-sub">M.S. project defence</span>' +
        '<span class="brand-name">Real-Time Gas Leak Detection Using Support Vector Machine</span>' +
      "</a>" +
      '<div class="dl-row">' +
        '<a class="btn" href="GasLeakSVM.pdf" target="_blank" rel="noopener">&#8615; PDF</a>' +
        '<a class="btn" href="GasLeakSVM.docx" download>&#8615; DOCX</a>' +
      "</div>";

    NAV.forEach(function (group) {
      var title = group[0];
      var hasCurrent = group[1].some(function (i) { return i[0] === cur; });
      var isFolded = !hasCurrent && folded.indexOf(title) !== -1;
      html += '<div class="navgroup' + (isFolded ? " is-folded" : "") +
              '" data-group="' + title.replace(/"/g, "&quot;") + '">' +
              '<button class="navlabel" type="button" aria-expanded="' + (!isFolded) + '">' +
                "<span>" + title + "</span><span class=\"fold\" aria-hidden=\"true\">&#9662;</span>" +
              "</button>";
      group[1].forEach(function (item) {
        html += '<a class="navlink" href="' + item[0] + '"' +
                (item[0] === cur ? ' aria-current="page"' : "") + ">" +
                '<span class="n">' + item[1] + "</span><span>" + item[2] + "</span></a>";
      });
      html += "</div>";
    });

    html += '<div class="sidebar-foot">' +
              '<button class="btn" type="button" data-theme-toggle></button>' +
              '<button class="btn" type="button" data-nav-collapse ' +
                'title="Hide the menu (press [ )">&#8676; Hide menu</button>' +
            "</div>";
    mount.innerHTML = html;
  }

  /* the floating button that brings the rail back once it is hidden */
  function renderNavShow() {
    if (document.querySelector(".navshow")) return;
    var b = document.createElement("button");
    b.className = "btn navshow";
    b.type = "button";
    b.setAttribute("data-nav-expand", "");
    b.setAttribute("title", "Show the menu (press [ )");
    b.setAttribute("aria-label", "Show navigation");
    b.innerHTML = "&#9776; Menu";
    document.body.appendChild(b);
  }

  function setRail(collapsed) {
    if (collapsed) root.setAttribute("data-nav", "collapsed");
    else root.removeAttribute("data-nav");
    store.set("nav", collapsed ? "collapsed" : "open");
  }

  function renderPageNav() {
    var mount = document.querySelector("[data-pagenav]");
    if (!mount) return;
    var flat = [];
    NAV.forEach(function (g) { g[1].forEach(function (i) { flat.push(i); }); });
    var cur = here();
    var idx = -1;
    for (var i = 0; i < flat.length; i++) if (flat[i][0] === cur) { idx = i; break; }
    if (idx < 0) return;
    var html = "";
    if (idx > 0) {
      html += '<a href="' + flat[idx - 1][0] + '"><span class="dir">← Previous</span>' +
              '<span class="ttl">' + flat[idx - 1][2] + "</span></a>";
    } else { html += "<span></span>"; }
    if (idx < flat.length - 1) {
      html += '<a class="next" href="' + flat[idx + 1][0] + '"><span class="dir">Next →</span>' +
              '<span class="ttl">' + flat[idx + 1][2] + "</span></a>";
    }
    mount.className = "pagenav";
    mount.innerHTML = html;
  }

  /* ---------------------------------------------------------
     2. Theme, drawer, folding — one delegated listener
     --------------------------------------------------------- */
  function currentTheme() {
    return root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  function paintThemeButtons() {
    var t = currentTheme();
    Array.prototype.forEach.call(document.querySelectorAll("[data-theme-toggle]"), function (b) {
      b.textContent = t === "dark" ? "☀ Light" : "☾ Dark";
      b.setAttribute("aria-label", "Switch to " + (t === "dark" ? "light" : "dark") + " theme");
    });
  }

  function closeDrawer() {
    var side = document.querySelector(".sidebar");
    if (side) side.classList.remove("open");
    var btn = document.querySelector("[data-menu]");
    if (btn) btn.setAttribute("aria-expanded", "false");
    var scrim = document.querySelector(".scrim");
    if (scrim) scrim.remove();
  }

  document.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-theme-toggle]")) {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store.set("theme", next);
      paintThemeButtons();
      document.dispatchEvent(new CustomEvent("themechange"));
      return;
    }

    var m = ev.target.closest("[data-menu]");
    if (m) {
      var side = document.querySelector(".sidebar");
      if (!side) return;
      if (side.classList.contains("open")) { closeDrawer(); return; }
      side.classList.add("open");
      m.setAttribute("aria-expanded", "true");
      var scrim = document.createElement("div");
      scrim.className = "scrim";
      scrim.addEventListener("click", closeDrawer);
      document.body.appendChild(scrim);
      return;
    }

    if (ev.target.closest(".scrim")) { closeDrawer(); return; }

    if (ev.target.closest("[data-nav-collapse]")) { setRail(true); return; }
    if (ev.target.closest("[data-nav-expand]")) { setRail(false); return; }

    var lab = ev.target.closest(".navlabel");
    if (lab) {
      var grp = lab.closest(".navgroup");
      var nowFolded = grp.classList.toggle("is-folded");
      lab.setAttribute("aria-expanded", nowFolded ? "false" : "true");
      var name = grp.getAttribute("data-group");
      var list = loadFolded().filter(function (n) { return n !== name; });
      if (nowFolded) list.push(name);
      saveFolded(list);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeDrawer(); return; }
    /* "[" toggles the rail — but never while typing in a code cell or the search box */
    if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      setRail(root.getAttribute("data-nav") !== "collapsed");
    }
  });

  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var onScheme = function () { if (!root.getAttribute("data-theme")) paintThemeButtons(); };
  mq.addEventListener ? mq.addEventListener("change", onScheme) : mq.addListener(onScheme);

  /* The pages are written with real Greek letters, but nobody types ω into a
     search box — they type "omega". Index both. */
  var GREEK = {
    "α": "alpha", "β": "beta", "γ": "gamma", "Γ": "gamma", "δ": "delta", "Δ": "delta",
    "ε": "epsilon", "ζ": "zeta", "θ": "theta", "λ": "lambda", "μ": "mu", "ξ": "xi",
    "π": "pi", "ρ": "rho", "σ": "sigma", "τ": "tau", "υ": "upsilon", "φ": "phi",
    "χ": "chi", "ψ": "psi", "ω": "omega", "Ω": "omega"
  };

  function haystack(el) {
    if (el.__hay) return el.__hay;
    var text = el.textContent;
    var extra = [];
    for (var ch in GREEK) {
      if (text.indexOf(ch) !== -1 && extra.indexOf(GREEK[ch]) === -1) extra.push(GREEK[ch]);
    }
    el.__hay = (text + " " + extra.join(" ")).toLowerCase();
    return el.__hay;
  }

  /* ---------------------------------------------------------
     3. Q&A — quiz mode, search, reviewed-count
     --------------------------------------------------------- */
  function wireQA() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".qa"));
    if (!cards.length) return;

    var pageKey = "done-" + (document.body.dataset.page || here());
    var done = {};
    try { done = JSON.parse(store.get(pageKey, "{}")) || {}; } catch (e) { done = {}; }

    var sections = Array.prototype.slice.call(document.querySelectorAll("[data-qa-sec]"));
    function refreshSections() {
      sections.forEach(function (sec) {
        var any = false, n = sec.nextElementSibling;
        while (n && !n.hasAttribute("data-qa-sec")) {
          if (n.classList.contains("qa") && !n.classList.contains("hidden")) { any = true; break; }
          n = n.nextElementSibling;
        }
        sec.hidden = !any;
      });
    }

    var counter = document.querySelector("[data-counter]");
    function refreshCount() {
      if (!counter) return;
      var visible = cards.filter(function (c) { return !c.classList.contains("hidden"); });
      var n = visible.filter(function (c) { return c.dataset.done === "1"; }).length;
      counter.textContent = n + " / " + visible.length + " reviewed";
    }

    cards.forEach(function (card) {
      var id = card.id || "";
      if (done[id]) card.dataset.done = "1";
      var box = card.querySelector(".qa-done");
      if (box) {
        box.checked = card.dataset.done === "1";
        box.addEventListener("change", function () {
          card.dataset.done = box.checked ? "1" : "0";
          done[id] = box.checked;
          store.set(pageKey, JSON.stringify(done));
          refreshCount();
        });
        box.addEventListener("click", function (e) { e.stopPropagation(); });
      }
      var head = card.querySelector(".qa-head");
      if (head) {
        head.addEventListener("click", function () {
          if (document.body.classList.contains("quiz")) card.classList.toggle("revealed");
        });
      }
    });

    var quizBtn = document.querySelector("[data-quiz]");
    if (quizBtn) {
      var on = store.get("quiz", "0") === "1";
      var applyQuiz = function () {
        document.body.classList.toggle("quiz", on);
        quizBtn.setAttribute("aria-pressed", on ? "true" : "false");
        quizBtn.textContent = on ? "✓ Quiz mode" : "Quiz mode";
        if (!on) cards.forEach(function (c) { c.classList.remove("revealed"); });
      };
      applyQuiz();
      quizBtn.addEventListener("click", function () {
        on = !on; store.set("quiz", on ? "1" : "0"); applyQuiz();
      });
    }

    var revealAll = document.querySelector("[data-reveal-all]");
    if (revealAll) {
      revealAll.addEventListener("click", function () {
        var anyHidden = cards.some(function (c) { return !c.classList.contains("revealed"); });
        cards.forEach(function (c) { c.classList.toggle("revealed", anyHidden); });
      });
    }

    var search = document.querySelector("[data-search]");
    if (search) {
      search.addEventListener("input", function () {
        var q = search.value.trim().toLowerCase();
        cards.forEach(function (card) {
          var hit = !q || haystack(card).indexOf(q) !== -1;
          card.classList.toggle("hidden", !hit);
        });
        refreshSections();
        refreshCount();
      });
    }

    refreshSections();
    refreshCount();
  }

  /* ---------------------------------------------------------
     4. Pyodide — one interpreter per page, shared by every cell.
        scikit-learn ships with Pyodide, so the real SVM trains in the tab
     --------------------------------------------------------- */
  var PYODIDE_VERSION = "0.26.4";
  var PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";

  var pyodide = null;
  var pyodidePromise = null;
  var mplReady = false;
  var listeners = [];

  function announce(msg, state) { listeners.forEach(function (fn) { fn(msg, state); }); }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Could not download Python. Check the internet connection.")); };
      document.head.appendChild(s);
    });
  }

  function bootPython() {
    if (pyodidePromise) return pyodidePromise;
    announce("Downloading Python…", "loading");
    pyodidePromise = loadScript(PYODIDE_URL + "pyodide.js")
      .then(function () { return globalThis.loadPyodide({ indexURL: PYODIDE_URL }); })
      .then(function (py) { pyodide = py; announce("Python ready", "ready"); return py; })
      .catch(function (err) {
        pyodidePromise = null;
        announce("Python could not load — offline?", "error");
        throw err;
      });
    return pyodidePromise;
  }

  var MPL_SETUP = [
    "import matplotlib",
    "matplotlib.use('AGG')",
    "import matplotlib.pyplot as plt",
    "plt.show = lambda *a, **k: None",
    "matplotlib.rcParams.update({",
    "    'figure.figsize': (7.4, 4.5),",
    "    'figure.dpi': 110,",
    "    'font.size': 11,",
    "    'axes.grid': True,",
    "    'grid.alpha': 0.25,",
    "    'axes.spines.top': False,",
    "    'axes.spines.right': False,",
    "    'lines.linewidth': 2.0,",
    "    'figure.autolayout': True,",
    "})"
  ].join("\n");

  /* Re-applied before every run: the theme can be flipped mid-session and a
     white rectangle in a dark page is unpleasant. */
  function themeRc() {
    var dark = currentTheme() === "dark";
    var p = dark
      ? { bg: "#141827", fg: "#E5E8F2", grid: "#3A4058",
          cycle: "['#5FD3C1','#F5A06B','#A5B4FC','#DFA65B','#C4A5F5']" }
      : { bg: "#FFFFFF", fg: "#161A2C", grid: "#C9CDE0",
          cycle: "['#0F766E','#C2410C','#4338CA','#8A5A06','#6B4EA8']" };
    return [
      "import matplotlib as _m",
      "from cycler import cycler as _cy",
      "_m.rcParams.update({",
      "  'figure.facecolor': '" + p.bg + "', 'axes.facecolor': '" + p.bg + "',",
      "  'savefig.facecolor': '" + p.bg + "',",
      "  'text.color': '" + p.fg + "', 'axes.labelcolor': '" + p.fg + "',",
      "  'axes.titlecolor': '" + p.fg + "',",
      "  'xtick.color': '" + p.fg + "', 'ytick.color': '" + p.fg + "',",
      "  'axes.edgecolor': '" + p.grid + "', 'grid.color': '" + p.grid + "',",
      "  'legend.facecolor': '" + p.bg + "', 'legend.edgecolor': '" + p.grid + "',",
      "  'axes.prop_cycle': _cy(color=" + p.cycle + "),",
      "})"
    ].join("\n");
  }

  var FIG_CAPTURE = [
    "def __grab_figures():",
    "    import sys, io, base64",
    "    out = []",
    "    if 'matplotlib.pyplot' in sys.modules:",
    "        plt = sys.modules['matplotlib.pyplot']",
    "        for n in plt.get_fignums():",
    "            f = plt.figure(n)",
    "            buf = io.BytesIO()",
    "            f.savefig(buf, format='png', dpi=140, bbox_inches='tight')",
    "            out.append(base64.b64encode(buf.getvalue()).decode())",
    "        plt.close('all')",
    "    return out",
    "__grab_figures()"
  ].join("\n");

  /* --- friendly error translation ------------------------- */
  var HINTS = [
    [/NameError: name '(.+?)' is not defined/, function (m) {
      return "Python has not seen \u201c" + m[1] + "\u201d yet.\n" +
             "\u2022 If it is defined in an earlier cell on this page, run that cell first \u2014 all cells share one interpreter.\n" +
             "\u2022 Otherwise check the spelling; Python is case-sensitive.";
    }],
    [/ModuleNotFoundError: No module named '(.+?)'/, function (m) {
      return "The library \u201c" + m[1] + "\u201d is not in this browser Python. numpy, pandas, matplotlib and scikit-learn are available.";
    }],
    [/IndentationError|TabError/, function () {
      return "A spacing problem, not a maths problem. Every line inside a def / if / for starts with the same number of spaces (use 4).";
    }],
    [/SyntaxError: expected ':'/, function () {
      return "A colon is missing at the end of that line.";
    }],
    [/KeyError: '(.+?)'/, function (m) {
      return "There is no column called \u201c" + m[1] + "\u201d. The columns are MQ2, MQ3, MQ5, MQ6, MQ7, MQ8, MQ135 and Gas.";
    }],
    [/could not convert string to float/, function () {
      return "A text column slipped into the features. Use only the seven sensor columns: df[SENSORS].";
    }],
    [/InvalidParameterError|must be a float in the range|must be a str among/, function () {
      return "An SVC setting is out of range. C and gamma must be positive numbers, for example C=100, gamma=10.";
    }],
    [/operands could not be broadcast|Expected 2D array/, function () {
      return "A shape problem. One sensor reading must be shaped (1, 7): use x.reshape(1, -1).";
    }]
  ];

  function friendlyHint(text) {
    for (var i = 0; i < HINTS.length; i++) {
      var m = text.match(HINTS[i][0]);
      if (m) return HINTS[i][1](m);
    }
    return null;
  }

  function trimTraceback(text) {
    var lines = String(text).replace(/\s+$/, "").split("\n");
    var lastExec = -1;
    for (var i = 0; i < lines.length; i++) if (lines[i].indexOf("<exec>") !== -1) lastExec = i;
    var keep = lastExec >= 0 ? lines.slice(lastExec) : lines.slice(-5);
    keep = keep.filter(function (l) {
      return !/CodeRunner|coroutine = eval|self\.code|_pyodide|site-packages\/pyodide|importlib\._bootstrap/.test(l);
    }).map(function (l) {
      return l.replace(/^\s*File "<exec>", line (\d+).*$/, "In your code, line $1:");
    });
    keep = keep.filter(function (l, i) {
      if (!/^[\s^~]+$/.test(l) || !l.trim()) return true;
      return i > 0 && !/^In your code, line/.test(keep[i - 1]);
    });
    if (keep.length > 10) keep = keep.slice(-10);
    return keep.join("\n");
  }

  /* Every cell shares one interpreter and therefore one stdout buffer, so two
     runs in flight at once interleave their output into the wrong cell. Queue
     them instead, and grey out every Run button while any run is active. */
  var queue = Promise.resolve();
  var runButtons = [];

  function setRunnersBusy(busy) {
    runButtons.forEach(function (b) { b.disabled = busy; });
  }

  /* --- wire one .runner ----------------------------------- */
  function setupRunner(box) {
    var editor = box.querySelector(".editor");
    var runBtn = box.querySelector(".btn-run");
    var out = box.querySelector(".out");
    var figs = box.querySelector(".figs");
    if (!editor || !runBtn) return;
    var original = editor.value;

    function autoGrow() {
      editor.style.height = "auto";
      editor.style.height = (editor.scrollHeight + 4) + "px";
    }
    autoGrow();
    editor.addEventListener("input", autoGrow);

    editor.addEventListener("keydown", function (ev) {
      if (ev.key === "Tab") {
        ev.preventDefault();
        var s = editor.selectionStart, e = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + "    " + editor.value.slice(e);
        editor.selectionStart = editor.selectionEnd = s + 4;
        autoGrow();
      } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        run();
      }
    });

    var resetBtn = box.querySelector("[data-reset]");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        editor.value = original;
        autoGrow();
        out.textContent = "";
        out.className = "out";
        figs.innerHTML = "";
      });
    }

    function say(text, cls) {
      out.textContent = text;
      out.className = "out" + (cls ? " " + cls : "");
    }

    function run() {
      var code = editor.value;
      figs.innerHTML = "";
      setRunnersBusy(true);
      say("queued…", "is-wait");

      var wait = pyodide
        ? Promise.resolve(pyodide)
        : (say("Starting Python for the first time — about 15 seconds.\nAfter this every cell on the page runs instantly.", "is-wait"), bootPython());

      return wait.then(function (py) {
        var buffer = [];
        py.setStdout({ batched: function (s) { buffer.push(s); } });
        py.setStderr({ batched: function (s) { buffer.push(s); } });
        say("running…", "is-wait");

        return py.loadPackagesFromImports(code)
          .then(function () {
            if (!/matplotlib/.test(code)) return;
            if (mplReady) return py.runPythonAsync(themeRc());
            return py.runPythonAsync(MPL_SETUP)
              .then(function () { mplReady = true; })
              .then(function () { return py.runPythonAsync(themeRc()); });
          })
          .then(function () { return py.runPythonAsync(code); })
          .then(function (result) {
            var text = buffer.join("\n");
            if (result !== undefined && result !== null) {
              var repr = "";
              try { repr = result.toString(); } catch (e) { repr = ""; }
              if (result && typeof result.destroy === "function") result.destroy();
              if (repr) text += (text ? "\n" : "") + repr;
            }
            return py.runPythonAsync(FIG_CAPTURE).then(function (pngs) {
              var arr = pngs && pngs.toJs ? pngs.toJs() : (pngs || []);
              if (pngs && pngs.destroy) pngs.destroy();
              arr.forEach(function (b64) {
                var img = new Image();
                img.src = "data:image/png;base64," + b64;
                img.alt = "figure produced by this code";
                figs.appendChild(img);
              });
              if (!text && arr.length) say("", "");
              else say(text || "✓ ran without errors — nothing printed. Add a print(…) to see a value.", "");
            });
          })
          .catch(function (err) {
            var raw = (err && err.message) ? err.message : String(err);
            say(trimTraceback(raw), "is-err");
            var hint = friendlyHint(raw);
            if (hint) {
              var span = document.createElement("span");
              span.className = "hint-fix";
              span.textContent = hint;
              out.appendChild(span);
            }
          });
      }).catch(function (err) {
        say(String(err && err.message ? err.message : err), "is-err");
      }).then(function () {
        setRunnersBusy(false);
      });
    }

    runButtons.push(runBtn);
    runBtn.addEventListener("click", function () {
      /* chain onto the queue so runs never overlap */
      queue = queue.then(run, run);
    });
  }

  /* ---------------------------------------------------------
     5. Hero canvas — two classes of readings, the maximum-margin line
        between them, the two dashed margin lines and the circled support
        vectors. Fixed seed, so the picture is the same on every visit.
     --------------------------------------------------------- */
  function wireHero() {
    var cv = document.querySelector("[data-wave]");
    if (!cv) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var raf = null, safety = null, t0 = null;

    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function gauss() { return Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd()); }
    var SLOPE = 0.35, M = 0.13;
    var pts = [];
    while (pts.length < 72) {
      var cls = pts.length % 2;
      var u = (rnd() - 0.5) * 1.9;
      var d = (cls ? 1 : -1) * (M + 0.04 + Math.abs(gauss()) * 0.2);
      pts.push([u, SLOPE * u + d, cls]);
    }
    var sv = [[-0.55, SLOPE * -0.55 + M, 1], [0.45, SLOPE * 0.45 + M, 1], [-0.05, SLOPE * -0.05 - M, 0]];
    sv.forEach(function (p) { pts.push(p); });

    function draw(progress) {
      var dpr = window.devicePixelRatio || 1;
      var w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      var g = cv.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      var cs = getComputedStyle(root);
      var c0 = cs.getPropertyValue("--accent").trim() || "#0F766E";
      var c1 = cs.getPropertyValue("--accent-2").trim() || "#C2410C";
      var cl = cs.getPropertyValue("--text-dim").trim() || "#555";
      var X = function (u) { return w / 2 + u * w * 0.48; };
      var Y = function (v) { return h / 2 - v * h * 0.9; };

      var n = Math.floor(pts.length * Math.min(1, progress * 1.7));
      for (var i = 0; i < n; i++) {
        var p = pts[i];
        g.fillStyle = p[2] ? c1 : c0;
        g.beginPath();
        if (p[2]) g.rect(X(p[0]) - 3.5, Y(p[1]) - 3.5, 7, 7);
        else g.arc(X(p[0]), Y(p[1]), 3.8, 0, 2 * Math.PI);
        g.fill();
      }
      var lp = Math.max(0, (progress - 0.45) / 0.55);
      if (lp > 0) {
        var a = -1.05, b = -1.05 + 2.1 * lp;
        [[0, [], 2.2], [M, [5, 5], 1.3], [-M, [5, 5], 1.3]].forEach(function (L) {
          g.strokeStyle = cl; g.lineWidth = L[2]; g.setLineDash(L[1]);
          g.beginPath(); g.moveTo(X(a), Y(SLOPE * a + L[0])); g.lineTo(X(b), Y(SLOPE * b + L[0])); g.stroke();
        });
        g.setLineDash([]);
        if (lp >= 1) {
          sv.forEach(function (p) {
            g.strokeStyle = cl; g.lineWidth = 1.6;
            g.beginPath(); g.arc(X(p[0]), Y(p[1]), 8.5, 0, 2 * Math.PI); g.stroke();
          });
        }
      }
    }

    function finish() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (safety) { clearTimeout(safety); safety = null; }
      draw(1);
    }
    function animate(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / 1400);
      if (p >= 1) { finish(); return; }
      draw(1 - Math.pow(1 - p, 2));
      raf = requestAnimationFrame(animate);
    }
    if (reduce || document.hidden) draw(1);
    else { safety = setTimeout(finish, 2200); raf = requestAnimationFrame(animate); }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) finish(); });
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { draw(1); }, 120); });
    document.addEventListener("themechange", function () { draw(1); });
  }

  /* KaTeX is loaded with `defer` in each <head>, so it is ready by DOMContentLoaded. */
  function renderMath() {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(document.querySelector(".main") || document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\(", right: "\\)", display: false }
      ],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      throwOnError: false
    });
  }

  /* ---------------------------------------------------------
     6. Boot
     --------------------------------------------------------- */
  function init() {
    renderNav();
    renderNavShow();
    renderPageNav();
    paintThemeButtons();
    wireQA();
    wireHero();
    renderMath();

    var runners = document.querySelectorAll(".runner");
    Array.prototype.forEach.call(runners, setupRunner);

    var status = document.querySelector("[data-py-status]");
    if (status) {
      listeners.push(function (msg, state) {
        status.textContent = msg;
        status.className = "chip " + (state === "ready" ? "chip-accent" : state === "error" ? "chip-warn" : "chip-2");
      });
    }

    /* Start fetching Python quietly so the first Run feels instant. */
    if (runners.length) {
      var kick = function () { bootPython().catch(function () {}); };
      if (window.requestIdleCallback) requestIdleCallback(kick, { timeout: 3000 });
      else setTimeout(kick, 1500);
    }
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
