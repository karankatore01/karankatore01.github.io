// Visual extras: boot intro, text scramble, custom cursor, magnetic buttons,
// card tilt, marquee, count-up stats and scroll progress.
(() => {
  const fine = matchMedia("(pointer: fine)").matches;
  const root = document.documentElement;
  const GLYPHS = "!<>-_\\/[]{}=+*^?#01ABCDEFxz";

  /* ── TEXT SCRAMBLE ───────────────────────── */
  function scramble(el, dur = 900) {
    const final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    if (reduceMotion) { el.textContent = final; return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const rev = Math.floor(final.length * (1 - Math.pow(1 - p, 2)));
      let out = final.slice(0, rev);
      for (let i = rev; i < final.length; i++) out += final[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  window.scramble = scramble;

  const scrIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { scramble(e.target); scrIO.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$(".scr").forEach((el) => scrIO.observe(el));

  /* ── BOOT INTRO ──────────────────────────── */
  function boot() {
    return new Promise((resolve) => {
      const el = $("#boot");
      if (!el) return resolve();
      if (root.classList.contains("no-boot")) { el.remove(); return resolve(); }
      root.classList.add("booting");
      const log = $("#boot-log"), bar = $("#boot-bar");
      const lines = [
        [null, `booting ${P.handle}.os`],
        ["OK", "initializing CUDA context  (device 0)"],
        ["OK", `loading weights  ${P.handle}-v3.safetensors`],
        ["OK", "warming up attention heads"],
        ["OK", "compiling inference graph"],
        ["OK", "mounting /portfolio"],
        [">", "ready."],
      ];
      let i = 0, done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try { sessionStorage.setItem("booted", "1"); } catch {}
        el.classList.add("out");
        root.classList.remove("booting");
        setTimeout(() => el.remove(), 900);
        resolve();
      };
      const step = () => {
        if (done) return;
        if (i < lines.length) {
          const [tag, text] = lines[i];
          log.append(h("div", { class: tag === ">" ? "ready" : "" },
            tag === "OK" ? h("span", { class: "ok", text: "[  OK  ] " }) : tag === ">" ? h("span", { class: "accent", text: "> " }) : null,
            text));
          bar.style.width = `${((i + 1) / lines.length) * 100}%`;
          i++;
          setTimeout(step, 160 + Math.random() * 170);
        } else setTimeout(finish, 380);
      };
      step();
      addEventListener("keydown", finish, { once: true });
      el.addEventListener("click", finish);
    });
  }

  boot().then(() => {
    const name = $(".name");
    name.dataset.text = name.textContent;
    scramble(name, 1100);
    document.dispatchEvent(new Event("boot:done"));
  });

  /* ── MARQUEE ─────────────────────────────── */
  const fill = (track, items, cls) => {
    const make = () => items.flatMap((t, i) => [h("span", { class: `${cls}${i % 2 ? " outline" : ""}`, text: t }), h("span", { class: "mq-star", text: "✦" })]);
    track.append(...make(), ...make()); // two copies → seamless -50% loop
  };
  fill($("#mq1"), P.marquee, "mq-big");
  fill($("#mq2"), P.skills.map((s) => s[0]), "mq-small");

  /* ── COUNT-UP STATS ──────────────────────── */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const m = e.target.textContent.match(/^(\D*)([\d.]+)(.*)$/);
      if (!m || reduceMotion) return;
      const [, pre, num, post] = m;
      const end = parseFloat(num), dec = (num.split(".")[1] || "").length, t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 1400);
        e.target.textContent = pre + (end * (1 - Math.pow(1 - p, 3))).toFixed(dec) + post;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
  document.addEventListener("boot:done", () => $$(".stat-v").forEach((el) => countIO.observe(el)));

  /* ── SCROLL PROGRESS ─────────────────────── */
  const bar = $("#progress");
  const onScroll = () => {
    const max = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (!fine || reduceMotion) return;

  /* ── CUSTOM CURSOR ───────────────────────── */
  root.classList.add("has-cursor");
  const dot = h("div", { class: "cur-dot" });
  const label = h("span", { class: "cur-label" });
  const ring = h("div", { class: "cur-ring" }, label);
  document.body.append(dot, ring);
  let x = -100, y = -100, rx = x, ry = y;
  addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    root.classList.remove("cur-hidden");
  });
  document.addEventListener("pointerleave", () => root.classList.add("cur-hidden"));
  (function loop() {
    rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener("pointerover", (e) => {
    const t = e.target;
    const card = t.closest(".model-card");
    const txt = card ? (card.classList.contains("linked") ? "open" : "") : t.closest("#lab-plot") ? "click" : t.closest("#embed .node") ? "skill" : "";
    label.textContent = txt;
    ring.classList.toggle("labeled", !!txt);
    ring.classList.toggle("hover", !txt && !!t.closest("a, button, label, .chip, .legend-item"));
    ring.classList.toggle("text", !!t.closest("input"));
  });
  addEventListener("pointerdown", () => ring.classList.add("down"));
  addEventListener("pointerup", () => ring.classList.remove("down"));

  /* ── MAGNETIC BUTTONS ────────────────────── */
  $$(".btn, .kbd-btn, .socials a").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });

  /* ── 3D TILT CARDS ───────────────────────── */
  $$(".model-card, .term, .code-card").forEach((c) => {
    const amt = c.classList.contains("model-card") ? 1 : 0.35;
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = `perspective(1000px) rotateX(${-py * 9 * amt}deg) rotateY(${px * 11 * amt}deg) translateY(${-4 * amt}px)`;
    });
    c.addEventListener("pointerleave", () => (c.style.transform = ""));
  });
})();
