// Page-wide WebGL particle field. Each section morphs the particles into a new shape.
(() => {
  const canvas = $("#gl");
  if (!window.THREE || !canvas) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  } catch {
    return; // no WebGL — the page still works without the background
  }

  const mobile = innerWidth < 760;
  const N = mobile ? 3500 : 9000;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = 10;
  const group = new THREE.Group();
  scene.add(group);

  // Particles start as a wide random cloud, then fly into the first shape.
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    speed[i] = 0.02 + Math.random() * 0.05;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const sx = sprite.getContext("2d");
  const rg = sx.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, "rgba(255,255,255,1)");
  rg.addColorStop(0.25, "rgba(255,255,255,.75)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  sx.fillStyle = rg;
  sx.fillRect(0, 0, 64, 64);

  const mat = new THREE.PointsMaterial({
    size: mobile ? 0.1 : 0.085,
    map: new THREE.CanvasTexture(sprite),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 1,
  });
  const points = new THREE.Points(geo, mat);
  group.add(points);

  /* ── SHAPES ──────────────────────────────── */
  const C = (hex) => new THREE.Color(hex);
  const pal = { a: C("#3ef0a8"), b: C("#5ab4ff"), c: C("#b18cff"), d: C("#ffb86b") };
  const tmp = new THREE.Color();
  const rand = (a = 1) => (Math.random() * 2 - 1) * a;
  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  function build(fn) {
    const p = new Float32Array(N * 3), c = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const [x, y, z, color] = fn(i);
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
      c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b;
    }
    return { p, c };
  }

  const shapes = {
    // "neural core": fibonacci sphere with a rippled shell and a sparse inner cloud
    sphere: () => build((i) => {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
      const shell = Math.random() < 0.82 ? 1 : 0.3 + Math.random() * 0.55;
      const R = 3.5 * (1 + 0.07 * Math.sin(y * 10 + th * 0.4)) * shell;
      tmp.copy(pal.a).lerp(pal.b, (y + 1) / 2);
      if (Math.random() < 0.07) tmp.copy(pal.c);
      return [Math.cos(th) * r * R, y * R, Math.sin(th) * r * R, tmp];
    }),
    // initials rendered to an offscreen canvas and sampled
    text: (str) => {
      const W = 460, H = 220;
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const x = cv.getContext("2d");
      x.fillStyle = "#fff";
      x.font = "700 190px 'Space Grotesk', sans-serif";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(str, W / 2, H / 2 + 8);
      const d = x.getImageData(0, 0, W, H).data;
      const pts = [];
      for (let yy = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2) if (d[(yy * W + xx) * 4 + 3] > 128) pts.push([xx, yy]);
      if (!pts.length) return shapes.sphere();
      const s = 7.5 / W;
      return build(() => {
        const [px, py] = pts[(Math.random() * pts.length) | 0];
        tmp.copy(pal.a).lerp(pal.c, px / W);
        return [(px - W / 2) * s + rand(0.03), -(py - H / 2) * s + rand(0.03), rand(0.35), tmp];
      });
    },
    // one gaussian blob per skill category, in the category's color
    clusters: () => {
      const cats = Object.values(P.categories);
      const centers = cats.map((c, k) => {
        const a = (k / cats.length) * Math.PI * 2 + 0.4;
        return [Math.cos(a) * 3.8, Math.sin(a) * 2.2, rand(1), C(c.color)];
      });
      return build((i) => {
        const c = centers[i % centers.length];
        return [c[0] + gauss() * 0.5, c[1] + gauss() * 0.5, c[2] + gauss() * 0.5, c[3]];
      });
    },
    lattice: () => {
      const n = Math.round(Math.cbrt(N)), s = 5.6 / (n - 1);
      return build((i) => {
        const xi = i % n, yi = ((i / n) | 0) % n, zi = ((i / (n * n)) | 0) % n;
        tmp.copy(pal.b).lerp(pal.a, yi / (n - 1));
        return [xi * s - 2.8, yi * s - 2.8, zi * s - 2.8, tmp];
      });
    },
    wave: () => {
      const n = Math.round(Math.sqrt(N));
      return build((i) => {
        const x = ((i % n) / (n - 1) - 0.5) * 14, z = ((((i / n) | 0) % n) / (n - 1) - 0.5) * 9;
        const y = Math.sin(x * 0.7) * 0.7 + Math.cos(z * 1.1) * 0.45 - 1.2;
        tmp.copy(pal.b).lerp(pal.c, (y + 2.4) / 2.6);
        return [x, y, z, tmp];
      });
    },
    // double helix with rungs
    helix: () => build((i) => {
      const t = (i / N) * Math.PI * 9, strand = i % 2, x = (i / N - 0.5) * 13;
      const rung = Math.random() < 0.12;
      const r = rung ? 1.3 * rand(1) : 1.3;
      const a = t + strand * Math.PI;
      tmp.copy(rung ? pal.b : strand ? pal.a : pal.c);
      return [x, Math.cos(a) * r + rand(0.05), Math.sin(a) * r + rand(0.05), tmp];
    }),
    torus: () => build(() => {
      const u = Math.random() * Math.PI * 2, v = Math.random() * Math.PI * 2;
      const R = 4.6, r = 0.7 + rand(0.1);
      tmp.copy(pal.a).lerp(pal.c, (Math.cos(u) + 1) / 2);
      if (Math.random() < 0.05) tmp.copy(pal.d);
      return [(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v), tmp];
    }),
  };

  // section id → shape, horizontal offset (desktop), opacity behind content
  const plan = {
    top: { shape: "sphere", x: 3.4, op: 1 },
    about: { shape: "text", arg: P.initials, x: 3.2, op: 0.6 },
    stack: { shape: "clusters", x: 0, op: 0.35 },
    models: { shape: "lattice", x: 0, op: 0.28 },
    lab: { shape: "wave", x: 0, op: 0.35 },
    log: { shape: "helix", x: 0, op: 0.45 },
    contact: { shape: "torus", x: 0, op: 0.55, spin: false },
  };
  const cache = {};
  let target = null, tOp = 1, tX = 0, spin = true;

  function setSection(id) {
    const p = plan[id];
    if (!p) return;
    const key = p.shape + (p.arg || "");
    cache[key] ||= p.shape === "text" ? shapes.text(p.arg) : shapes[p.shape]();
    target = cache[key];
    tOp = p.op;
    spin = p.spin !== false;
    tX = mobile ? 0 : p.x;
    if (reduceMotion) { pos.set(target.p); col.set(target.c); mat.opacity = tOp; group.position.x = tX; }
  }

  /* ── LOOP ────────────────────────────────── */
  const mouse = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX / innerWidth - 0.5;
    mouse.y = e.clientY / innerHeight - 0.5;
  });

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    // portrait screens: keep shapes readable instead of shrinking to fit the width
    group.scale.setScalar(camera.aspect < 1 ? 0.62 : Math.min(1, camera.aspect / 1.3));
  }
  addEventListener("resize", resize);
  resize();

  const fpsEl = $("#sb-fps");
  let frames = 0, lastFps = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    if (target) {
      const tp = target.p, tc = target.c;
      for (let i = 0; i < N; i++) {
        const k = speed[i], j = i * 3;
        pos[j] += (tp[j] - pos[j]) * k;
        pos[j + 1] += (tp[j + 1] - pos[j + 1]) * k;
        pos[j + 2] += (tp[j + 2] - pos[j + 2]) * k;
        col[j] += (tc[j] - col[j]) * k;
        col[j + 1] += (tc[j + 1] - col[j + 1]) * k;
        col[j + 2] += (tc[j + 2] - col[j + 2]) * k;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
    if (spin) group.rotation.y += 0.0016 + mouse.x * 0.004;
    else {
      // settle facing the camera (nearest full turn), still following the mouse a little
      const face = Math.round(group.rotation.y / (Math.PI * 2)) * Math.PI * 2 + mouse.x * 0.5;
      group.rotation.y += (face - group.rotation.y) * 0.04;
    }
    group.rotation.x += (mouse.y * 0.35 - group.rotation.x) * 0.04;
    group.position.x += (tX - group.position.x) * 0.04;
    points.scale.setScalar(1 + Math.sin(now * 0.0012) * 0.025);
    mat.opacity += (tOp - mat.opacity) * 0.05;
    renderer.render(scene, camera);

    frames++;
    if (now - lastFps > 1000) {
      fpsEl.textContent = `webgl ${Math.round((frames * 1000) / (now - lastFps))} fps`;
      frames = 0;
      lastFps = now;
    }
  }

  if (reduceMotion) {
    setSection("top");
    renderer.render(scene, camera);
  } else {
    // build the text shape after fonts load so it uses Space Grotesk
    document.fonts?.ready.then(() => { delete cache[`text${P.initials}`]; });
    setSection("top");
    requestAnimationFrame(frame);
  }

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { setSection(e.target.id); if (reduceMotion) renderer.render(scene, camera); } });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => spy.observe(s));
})();
