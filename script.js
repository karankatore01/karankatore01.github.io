const P = PROFILE;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SVG_NS = "http://www.w3.org/2000/svg";

// Tiny DOM builder. Strings become text nodes, so user/profile text is never parsed as HTML.
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k);
  return e;
}
function s(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.tid);
  toast.tid = setTimeout(() => t.classList.remove("show"), 1800);
}

function copyEmail() {
  navigator.clipboard?.writeText(P.email).then(
    () => toast(`copied ${P.email}`),
    () => toast(P.email),
  );
}

/* ── STATIC CONTENT ─────────────────────────── */
function renderContent() {
  document.title = `${P.name} — ${P.roles[0]}`;
  $$("[data-name]").forEach((e) => (e.textContent = P.name));
  $$("[data-handle]").forEach((e) => (e.textContent = P.handle));
  $$("[data-initials]").forEach((e) => (e.textContent = P.initials));
  $$("[data-mailto]").forEach((a) => (a.href = `mailto:${P.email}`));
  $("#status-text").textContent = `${P.status} · ${P.location}`;
  $("#sb-status").textContent = P.status;
  $("#tagline").textContent = P.tagline;
  $("#copy-email").addEventListener("click", copyEmail);

  $("#stats").append(
    ...P.stats.map((st) => h("div", { class: "stat" }, h("span", { class: "stat-v", text: st.value }), h("span", { class: "stat-l", text: st.label }))),
  );

  $("#about-paras").append(...P.about.paragraphs.map((p) => h("p", { text: p })));
  $("#config-json").append(jsonView(P.about.config));

  $("#socials").append(
    ...Object.entries(P.links).map(([k, v]) => h("a", { href: v, target: "_blank", rel: "noopener", text: `${k} ↗` })),
  );

  // Mobile fallback for the embedding chart
  $("#stack-list").append(
    ...Object.entries(P.categories).map(([k, c]) =>
      h("div", { class: "stack-group", style: `--c:${c.color}` },
        h("h3", { text: c.label }),
        h("p", { text: P.skills.filter((sk) => sk[1] === k).map((sk) => sk[0]).join(" · ") })),
    ),
  );

  renderModels();
  renderLog();
}

function jsonView(obj) {
  const pre = h("pre", { class: "json" });
  const add = (t, c) => pre.append(c ? h("span", { class: c, text: t }) : t);
  const val = (v) => {
    if (typeof v === "number") add(String(v), "j-num");
    else if (typeof v === "boolean") add(String(v), "j-bool");
    else add(JSON.stringify(v), "j-str");
  };
  const keys = Object.keys(obj);
  add("{\n");
  keys.forEach((k, i) => {
    add("  ");
    add(JSON.stringify(k), "j-key");
    add(": ");
    const v = obj[k];
    if (Array.isArray(v)) {
      add("[");
      v.forEach((x, j) => { val(x); if (j < v.length - 1) add(", "); });
      add("]");
    } else val(v);
    add(i < keys.length - 1 ? ",\n" : "\n");
  });
  add("}");
  return pre;
}

/* ── MODEL CARDS ────────────────────────────── */
function renderModels() {
  const grid = $("#models-grid");
  P.projects.forEach((p) => {
    const cat = P.categories[p.cat] || { label: p.cat, color: "#3ef0a8" };
    const card = h("article", { class: "model-card reveal", "data-cat": p.cat, style: `--c:${cat.color}` },
      h("div", { class: "mc-head" }, h("span", { class: "mc-id", text: p.id }), h("span", { class: "mc-cat", text: cat.label })),
      h("h3", { text: p.title }),
      h("p", { class: "mc-desc", text: p.desc }),
      h("div", { class: "mc-pipe" },
        p.pipeline.flatMap((st, i) => [i ? h("span", { class: "arrow", text: "→" }) : null, h("span", { class: "stage", text: st })])),
      h("dl", { class: "mc-metrics" }, p.metrics.map(([k, v]) => h("div", {}, h("dt", { text: k }), h("dd", { text: v })))),
      h("div", { class: "mc-foot" },
        h("div", { class: "tags" }, p.tags.map((t) => h("span", { text: t }))),
        h("div", { class: "mc-links" },
          p.github ? h("a", { href: p.github, target: "_blank", rel: "noopener", text: "code ↗" }) : null,
          p.demo ? h("a", { href: p.demo, target: "_blank", rel: "noopener", text: "demo ↗" }) : null)),
    );
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
    grid.append(card);
  });

  const cats = ["all", ...new Set(P.projects.map((p) => p.cat))];
  const filters = $("#filters");
  cats.forEach((c) => {
    const label = c === "all" ? "all" : P.categories[c]?.label || c;
    filters.append(h("button", {
      class: `filter${c === "all" ? " active" : ""}`, text: label,
      onclick: (e) => {
        $$(".filter").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        $$(".model-card").forEach((m) => m.classList.toggle("hidden", c !== "all" && m.dataset.cat !== c));
      },
    }));
  });
}

/* ── TRAINING LOG ───────────────────────────── */
function renderLog() {
  const log = $("#train-log");
  const total = Math.max(...P.experience.map((e) => e.epoch));
  P.experience.forEach((e) => {
    log.append(h("div", { class: "epoch reveal" },
      h("div", { class: "ep-head" }, h("span", { class: "ep-tag", text: `[epoch ${e.epoch}/${total}]` }), h("span", { class: "ep-date", text: e.date })),
      h("h3", {}, `${e.title} `, h("span", { class: "accent", text: `@ ${e.org}` })),
      h("ul", { class: "tick-list" }, e.points.map((x) => h("li", { text: x }))),
      h("div", { class: "ep-loss" }, "loss: ", h("span", { class: "j-num", text: e.loss.toFixed(2) }), "  ↓  converging"),
    ));
  });
  drawLossCurve();
}

function drawLossCurve() {
  const svg = $("#loss-curve");
  const W = 600, H = 150, pad = 14;
  const losses = [...P.experience].sort((a, b) => a.epoch - b.epoch).map((e) => e.loss);
  const start = Math.min(1, losses[0] + 0.25);
  const anchors = [start, ...losses];
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  // loss 1 → top of chart, loss 0 → bottom
  const y = (v) => pad + (1 - Math.min(1, v)) * (H - pad * 2);
  const N = 120;
  const pts = [], val = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * (anchors.length - 1);
    const k = Math.min(Math.floor(t), anchors.length - 2);
    const ease = 1 - Math.pow(1 - (t - k), 2.2);
    const base = anchors[k] + (anchors[k + 1] - anchors[k]) * ease;
    const x = (i / N) * W;
    pts.push([x, y(base) + rnd() * 8 * base]);
    val.push([x, y(base * 1.1 + 0.04) + rnd() * 12 * base]);
  }
  const toPath = (arr) => arr.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`).join("");
  const defs = s("defs");
  const grad = s("linearGradient", { id: "lossFill", x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.append(s("stop", { offset: "0%", "stop-color": "#3ef0a8", "stop-opacity": ".22" }), s("stop", { offset: "100%", "stop-color": "#3ef0a8", "stop-opacity": "0" }));
  defs.append(grad);
  svg.append(defs);
  for (let i = 1; i < anchors.length - 1; i++) {
    const x = (i / (anchors.length - 1)) * W;
    svg.append(s("line", { class: "grid", x1: x, x2: x, y1: 0, y2: H }));
  }
  svg.append(s("path", { class: "area", d: `${toPath(pts)}L${W},${H}L0,${H}Z` }));
  svg.append(s("path", { class: "val", d: toPath(val) }));
  const curve = s("path", { class: "curve", d: toPath(pts) });
  svg.append(curve);

  if (!reduceMotion) {
    const len = curve.getTotalLength();
    curve.style.strokeDasharray = len;
    curve.style.strokeDashoffset = len;
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      curve.style.transition = "stroke-dashoffset 2.2s cubic-bezier(.3,.7,.2,1)";
      curve.style.strokeDashoffset = 0;
      o.disconnect();
    }, { threshold: 0.4 }).observe(svg);
  }
}

/* ── TYPED ROLES ────────────────────────────── */
function typedRoles() {
  const el = $("#typed");
  if (reduceMotion) { el.textContent = P.roles[0]; return; }
  let r = 0, c = 0, del = false;
  (function tick() {
    const word = P.roles[r];
    c += del ? -1 : 1;
    el.textContent = word.slice(0, c);
    let d = del ? 35 : 80;
    if (!del && c === word.length) { d = 1800; del = true; }
    else if (del && c === 0) { del = false; r = (r + 1) % P.roles.length; d = 300; }
    setTimeout(tick, d);
  })();
}

/* ── AGENT TERMINAL ─────────────────────────── */
function agent() {
  const outEl = $("#term-out"), input = $("#term-input"), form = $("#term-form");
  const hist = [];
  let hi = 0, busy = false;

  const line = (text = "", cls = "") => {
    const d = h("div", { class: `tl ${cls}`, text });
    outEl.append(d);
    outEl.scrollTop = outEl.scrollHeight;
    return d;
  };

  async function stream(lines) {
    for (const l of lines) {
      const [text, cls] = Array.isArray(l) ? l : [l, ""];
      const d = line("", cls);
      if (reduceMotion) { d.textContent = text; continue; }
      for (let i = 0; i < text.length; i += 3) {
        d.textContent = text.slice(0, i + 3);
        outEl.scrollTop = outEl.scrollHeight;
        await sleep(8);
      }
    }
  }

  const goto = (id) => setTimeout(() => $(id).scrollIntoView({ behavior: "smooth" }), 700);

  const cmds = {
    help: () => [
      ["commands:", "dim"],
      "  whoami       who is this",
      "  skills       tech stack",
      "  projects     things I've shipped",
      "  experience   training log",
      "  contact      get in touch",
      "  lab          train a neural net live",
      "  nvidia-smi   check the GPU",
      "  clear        clear screen",
      ["…or just ask a question in plain english.", "dim"],
    ],
    whoami: () => [[`${P.name} — ${P.roles[0]}, ${P.location}`, "hl"], P.tagline],
    skills: () =>
      Object.entries(P.categories).map(([k, c]) => `${c.label.padEnd(14)} ${P.skills.filter((x) => x[1] === k).map((x) => x[0]).join(", ")}`),
    projects: (cat) => [
      ...P.projects.filter((p) => !cat || p.cat === cat).map((p) => `▹ ${p.title}  [${p.metrics.map((m) => m.join(" ")).join(" · ")}]`),
      ["→ details in section 03 / models", "dim"],
    ],
    experience: () => P.experience.map((e) => `[${e.date}] ${e.title} @ ${e.org}`),
    contact: () => [`email      ${P.email}`, ...Object.entries(P.links).map(([k, v]) => `${k.padEnd(10)} ${v}`), ["tip: try `sudo hire-me`", "dim"]],
    ls: () => ["about.md  stack.json  models/  playground.js  training_log.txt  contact.sh"],
    pwd: () => [`/home/${P.handle}/portfolio`],
    lab: () => { goto("#lab"); return ["scrolling to the neural playground — it trains while you watch"]; },
    resume: () => {
      if (!P.resume) return ["resume is being updated — reach me via `contact` meanwhile."];
      open(P.resume, "_blank");
      return ["opening resume…"];
    },
    "nvidia-smi": () => [
      "+---------------------------------------------------+",
      "| GPU  Name              Memory-Usage        Util  |",
      `|  0   ${(P.handle + "-brain").padEnd(16)}  23.9GiB / 24GiB    99%  |`,
      "+---------------------------------------------------+",
      "| Processes:  coffee.exe  ideas.py  ship_it.sh      |",
      "+---------------------------------------------------+",
    ],
    "sudo hire-me": () => {
      setTimeout(() => (location.href = `mailto:${P.email}`), 1200);
      return [["[sudo] permission granted ✓", "ok"], "opening mail client…"];
    },
    "rm -rf /": () => [["nice try. this portfolio is immutable.", "ok"]],
  };

  function route(q) {
    const has = (re) => re.test(q);
    if (has(/^(hi|hello|hey|yo|sup)\b/)) return [`hey 👋 I'm ${P.handle}'s portfolio agent. try: "what have you built?"`];
    if (has(/\b(llm|rag|agent|gpt|claude|genai|langchain|prompt)/)) return ["yes — LLM systems are a big part of what I do:", ...cmds.projects("llm")];
    if (has(/\b(vision|cv|yolo|detect|camera|image|video|opencv)/)) return ["computer vision is home turf:", ...cmds.projects("cv")];
    if (has(/project|built|build|ship|portfolio|made|work on/)) return cmds.projects();
    if (has(/skill|stack|tech|tool|language|framework|know|use/)) return cmds.skills();
    if (has(/experience|job|career|company|worked|background|education/)) return cmds.experience();
    if (has(/contact|email|reach|hire|available|resume|linkedin|github/)) return cmds.contact();
    if (has(/who|about|yourself|name|\byou\b/)) return cmds.whoami();
    return [
      ["I'm a small rule-based agent (no LLM behind me — yet), so I didn't catch that.", "dim"],
      "try: projects · skills · experience · contact — or type help",
    ];
  }

  async function run(raw) {
    const q = raw.trim();
    if (!q || busy) return;
    hist.push(q); hi = hist.length;
    line(`❯ ${q}`, "cmd");
    const key = q.toLowerCase();
    if (key === "clear") { outEl.textContent = ""; return; }
    busy = true;
    const t0 = performance.now();
    let res;
    if (cmds[key]) res = cmds[key]();
    else {
      const think = line("thinking", "think");
      await sleep(350 + Math.random() * 400);
      think.remove();
      res = route(key);
    }
    await stream(res);
    if (!cmds[key]) {
      const words = res.map((l) => (Array.isArray(l) ? l[0] : l)).join(" ").split(/\s+/).length;
      line(`— ${words} tokens · ${Math.round(performance.now() - t0)} ms`, "dim");
    }
    busy = false;
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; run(v); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && hi > 0) { hi--; input.value = hist[hi]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ""; e.preventDefault(); }
  });
  $("#agent").addEventListener("click", (e) => { if (!e.target.closest("button, a")) input.focus({ preventScroll: true }); });

  const chips = ["help", "what have you built?", "your stack?", "nvidia-smi", "sudo hire-me"];
  $("#term-chips").append(...chips.map((c) => h("button", { class: "chip", type: "button", text: c, onclick: () => run(c) })));

  (async () => {
    await sleep(600);
    await stream([[`hi, I'm ${P.handle}'s portfolio agent 🤖`, "ok"], ["type `help`, click a chip, or ask me anything.", "dim"]]);
  })();

  return { run, focus: () => input.focus() };
}

/* ── EMBEDDING SPACE ────────────────────────── */
function embedding() {
  const svg = $("#embed");
  const W = 800, H = 460;
  const keys = Object.keys(P.categories);
  // Cluster centers spread around an ellipse
  const centers = {};
  keys.forEach((k, i) => {
    const a = -Math.PI / 2 + (i / keys.length) * Math.PI * 2 + 0.35;
    centers[k] = [W / 2 + Math.cos(a) * 270, H / 2 + Math.sin(a) * 140];
  });

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nodes = P.skills.map(([name, cat]) => {
    const [cx, cy] = centers[cat] || [W / 2, H / 2];
    const a = rnd() * 6.28, r = 10 + rnd() * 40;
    return { name, cat, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, cx, cy };
  });

  // Relax: separate label bounding boxes (dot + text below), gentle pull to cluster center
  const halfW = (n) => Math.max(10, n.name.length * 4.1) + 6; // ~8.2px per mono char at 13px
  const BOX_H = 36;
  for (let it = 0; it < 300; it++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const ox = halfW(a) + halfW(b) - Math.abs(dx);
        const oy = BOX_H - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox < oy * 3) { const p = (ox / 2) * Math.sign(dx || rnd() - 0.5); a.x -= p; b.x += p; }
          else { const p = (oy / 2) * Math.sign(dy || rnd() - 0.5); a.y -= p; b.y += p; }
        }
      }
      a.x += (a.cx - a.x) * 0.01; a.y += (a.cy - a.y) * 0.01;
      a.x = Math.max(halfW(a), Math.min(W - halfW(a), a.x));
      a.y = Math.max(14, Math.min(H - 30, a.y));
    }
  }

  const defs = s("defs");
  keys.forEach((k) => {
    const g = s("radialGradient", { id: `halo-${k}` });
    g.append(s("stop", { offset: "0%", "stop-color": P.categories[k].color, "stop-opacity": ".16" }),
      s("stop", { offset: "100%", "stop-color": P.categories[k].color, "stop-opacity": "0" }));
    defs.append(g);
  });
  svg.append(defs);

  const halos = keys.map((k) => {
    const mine = nodes.filter((n) => n.cat === k);
    const mx = mine.reduce((t, n) => t + n.x, 0) / mine.length;
    const my = mine.reduce((t, n) => t + n.y, 0) / mine.length;
    const c = s("circle", { class: "halo", cx: mx, cy: my, r: 120, fill: `url(#halo-${k})`, "data-cat": k });
    svg.append(c);
    return c;
  });

  // kNN edges inside each cluster
  const seen = new Set();
  const edges = [];
  nodes.forEach((n, i) => {
    nodes.map((m, j) => ({ j, d: m.cat === n.cat && j !== i ? Math.hypot(m.x - n.x, m.y - n.y) : Infinity }))
      .sort((a, b) => a.d - b.d).slice(0, 2)
      .forEach(({ j, d }) => {
        if (!isFinite(d)) return;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) return;
        seen.add(key);
        const m = nodes[j];
        const l = s("line", { class: "edge", x1: n.x, y1: n.y, x2: m.x, y2: m.y, stroke: P.categories[n.cat].color, "data-cat": n.cat });
        svg.append(l);
        edges.push(l);
      });
  });

  const gs = nodes.map((n, i) => {
    const color = P.categories[n.cat].color;
    const g = s("g", { class: "node", "data-cat": n.cat, style: `animation-delay:${-(i * 0.37) % 6}s` });
    const title = s("title");
    title.textContent = `${n.name} · ${P.categories[n.cat].label}`;
    g.append(title,
      s("circle", { cx: n.x, cy: n.y, r: 5.5, fill: color, style: `filter: drop-shadow(0 0 6px ${color})` }),
      Object.assign(s("text", { x: n.x, y: n.y + 20, "text-anchor": "middle" }), { textContent: n.name }));
    g.addEventListener("mouseenter", () => focus(n.cat));
    g.addEventListener("mouseleave", () => focus(locked));
    svg.append(g);
    return g;
  });

  let locked = null;
  function focus(cat) {
    [...gs, ...edges, ...halos].forEach((el) => el.classList.toggle("dim", !!cat && el.dataset.cat !== cat));
    $$(".legend-item").forEach((b) => b.classList.toggle("on", b.dataset.cat === cat));
  }

  const legend = $("#embed-legend");
  keys.forEach((k) => {
    const b = h("button", { class: "legend-item", "data-cat": k, style: `--c:${P.categories[k].color}` }, h("i"), P.categories[k].label);
    b.addEventListener("mouseenter", () => focus(k));
    b.addEventListener("mouseleave", () => focus(locked));
    b.addEventListener("click", () => { locked = locked === k ? null : k; focus(locked); });
    legend.append(b);
  });
}

/* ── COMMAND PALETTE ────────────────────────── */
function palette(agentApi) {
  const pal = $("#palette"), input = $("#pal-input"), list = $("#pal-list");
  const go = (id) => () => $(id).scrollIntoView({ behavior: "smooth" });
  const actions = [
    { label: "go to about", hint: "section", run: go("#about") },
    { label: "go to stack", hint: "section", run: go("#stack") },
    { label: "go to models", hint: "section", run: go("#models") },
    { label: "go to neural playground", hint: "section", run: go("#lab") },
    { label: "go to training log", hint: "section", run: go("#log") },
    { label: "go to contact", hint: "section", run: go("#contact") },
    { label: "ask the agent", hint: "terminal", run: () => { $("#top").scrollIntoView({ behavior: "smooth" }); setTimeout(agentApi.focus, 500); } },
    { label: "train on spiral dataset", hint: "playground", run: () => { go("#lab")(); setTimeout(() => $('#lab-data [data-v="spiral"]').click(), 600); } },
    { label: "copy email", hint: P.email, run: copyEmail },
    { label: "send email", hint: "mailto", run: () => (location.href = `mailto:${P.email}`) },
    ...(P.resume ? [{ label: "open resume", hint: "pdf", run: () => open(P.resume, "_blank") }] : []),
    ...Object.entries(P.links).map(([k, v]) => ({ label: `open ${k}`, hint: "link", run: () => open(v, "_blank", "noopener") })),
  ];
  let shown = [], sel = 0;

  function render() {
    const q = input.value.toLowerCase().trim();
    shown = actions.filter((a) => !q || q.split(/\s+/).every((w) => a.label.includes(w)));
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.replaceChildren(...(shown.length
      ? shown.map((a, i) => h("li", {
          class: i === sel ? "sel" : "", role: "option",
          onclick: () => exec(a), onmousemove: () => { if (sel !== i) { sel = i; render(); } },
        }, h("span", { text: a.label }), h("span", { text: a.hint })))
      : [h("li", { class: "empty", text: "no matching command" })]));
    list.querySelector(".sel")?.scrollIntoView({ block: "nearest" });
  }
  function openPal() { pal.hidden = false; input.value = ""; sel = 0; render(); input.focus(); }
  function close() { pal.hidden = true; }
  function exec(a) { close(); a.run(); }

  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openPal() : close(); }
    else if (!pal.hidden) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown") { sel = (sel + 1) % Math.max(1, shown.length); render(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = (sel - 1 + shown.length) % Math.max(1, shown.length); render(); e.preventDefault(); }
      else if (e.key === "Enter" && shown[sel]) exec(shown[sel]);
    }
  });
  input.addEventListener("input", () => { sel = 0; render(); });
  pal.addEventListener("click", (e) => { if (e.target === pal) close(); });
  $("#open-palette").addEventListener("click", openPal);
  $("#sb-palette").addEventListener("click", openPal);

  // Show ⌘ on Mac
  if (/Mac|iPhone|iPad/.test(navigator.platform)) {
    $("#open-palette kbd").textContent = "⌘";
    $("#sb-palette").textContent = "⌘K commands";
  }
}

/* ── MISC ───────────────────────────────────── */
function chrome() {
  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  $$(".reveal").forEach((el) => io.observe(el));

  // Active nav link
  const links = $$("#nav-links a");
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((sec) => spy.observe(sec));

  // Mobile nav
  const toggle = $(".nav-toggle"), nav = $("#nav-links");
  toggle.addEventListener("click", () => toggle.setAttribute("aria-expanded", nav.classList.toggle("open")));
  links.forEach((a) => a.addEventListener("click", () => { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }));

  // Owner's local time in the status bar
  const clock = $("#sb-clock");
  const city = P.location.split(",")[0];
  const tick = () => {
    try {
      clock.textContent = `${city} ${new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit", timeZone: P.timezone }).format(new Date())}`;
    } catch { clock.textContent = city; }
  };
  tick();
  setInterval(tick, 30000);
}

renderContent();
typedRoles();
const agentApi = agent();
embedding();
palette(agentApi);
chrome();
