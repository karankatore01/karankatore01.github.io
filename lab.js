// Neural playground: a small multilayer perceptron trained live in the browser.
// Forward pass, backprop and SGD with momentum are all hand-written — no ML libraries.
(() => {
  const plot = $("#lab-plot"), net = $("#lab-net"), spark = $("#lab-spark");
  if (!plot) return;
  const pctx = plot.getContext("2d"), nctx = net.getContext("2d"), sctx = spark.getContext("2d");

  const COL = [[177, 140, 255], [62, 240, 168]]; // class 0 violet, class 1 green
  const BG = [10, 14, 21];
  const RES = 64;  // decision-map resolution
  const NRES = 22; // per-neuron map resolution
  const STEPS_PER_FRAME = 6;

  let data = [], hidden = [8, 8], dataset = "spiral", lr = 0.03;
  let model, maps, epoch = 0, losses = [], last = { loss: NaN, acc: NaN };
  let running = !reduceMotion, visible = false, raf = 0, frame = 0;

  const rnd = (a = 1) => (Math.random() * 2 - 1) * a;
  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const clip = (v) => Math.max(-0.98, Math.min(0.98, v));

  /* ── DATASETS (points in [-1, 1]²) ───────── */
  const DATA = {
    spiral: () => {
      const out = [], n = 150;
      for (let c = 0; c < 2; c++)
        for (let i = 0; i < n; i++) {
          const r = (i / n) * 0.9 + 0.06, t = 1.6 * (i / n) * 2 * Math.PI + c * Math.PI;
          out.push({ x: clip(r * Math.sin(t) + rnd(0.03)), y: clip(r * Math.cos(t) + rnd(0.03)), c });
        }
      return out;
    },
    circles: () => Array.from({ length: 300 }, (_, i) => {
      const c = i % 2, r = c ? Math.random() * 0.38 : 0.62 + Math.random() * 0.3, a = Math.random() * 2 * Math.PI;
      return { x: r * Math.cos(a), y: r * Math.sin(a), c };
    }),
    xor: () => Array.from({ length: 300 }, () => {
      let x = rnd(0.92), y = rnd(0.92);
      x += Math.sign(x) * 0.06; y += Math.sign(y) * 0.06;
      return { x, y, c: x * y > 0 ? 1 : 0 };
    }),
    gaussian: () => Array.from({ length: 300 }, (_, i) => {
      const c = i % 2, m = c ? 0.42 : -0.42;
      return { x: clip(m + gauss() * 0.22), y: clip(m + gauss() * 0.22), c };
    }),
  };

  /* ── MLP ─────────────────────────────────── */
  const IN = new Float64Array(2);

  function makeModel(h) {
    const sizes = [2, ...h, 1];
    const L = [];
    for (let l = 1; l < sizes.length; l++) {
      const nin = sizes[l - 1], nout = sizes[l];
      const W = new Float64Array(nout * nin), s = Math.sqrt(2 / (nin + nout)) * 1.4;
      for (let i = 0; i < W.length; i++) W[i] = gauss() * s;
      L.push({
        nin, nout, W, b: new Float64Array(nout),
        vW: new Float64Array(W.length), vb: new Float64Array(nout),
        gW: new Float64Array(W.length), gb: new Float64Array(nout),
        a: new Float64Array(nout), d: new Float64Array(nout),
      });
    }
    return { sizes, L };
  }

  // tanh hidden layers, sigmoid output
  function forward(m, x, y) {
    IN[0] = x; IN[1] = y;
    let input = IN;
    const last = m.L.length - 1;
    for (let l = 0; l <= last; l++) {
      const ly = m.L[l];
      for (let o = 0; o < ly.nout; o++) {
        let z = ly.b[o];
        const row = o * ly.nin;
        for (let i = 0; i < ly.nin; i++) z += ly.W[row + i] * input[i];
        ly.a[o] = l === last ? 1 / (1 + Math.exp(-z)) : Math.tanh(z);
      }
      input = ly.a;
    }
    return m.L[last].a[0];
  }

  // one full-batch step of binary cross-entropy + SGD with momentum
  function trainStep(m, batch) {
    for (const ly of m.L) { ly.gW.fill(0); ly.gb.fill(0); }
    let loss = 0, correct = 0;
    const last = m.L.length - 1;
    for (const p of batch) {
      const yhat = forward(m, p.x, p.y);
      loss -= p.c ? Math.log(yhat + 1e-9) : Math.log(1 - yhat + 1e-9);
      if (yhat > 0.5 === (p.c === 1)) correct++;
      for (let l = last; l >= 0; l--) {
        const ly = m.L[l];
        if (l === last) ly.d[0] = yhat - p.c; // dL/dz for sigmoid + BCE
        else {
          const nx = m.L[l + 1];
          for (let i = 0; i < ly.nout; i++) {
            let s = 0;
            for (let o = 0; o < nx.nout; o++) s += nx.W[o * nx.nin + i] * nx.d[o];
            ly.d[i] = s * (1 - ly.a[i] * ly.a[i]); // tanh'
          }
        }
        const input = l ? m.L[l - 1].a : IN;
        for (let o = 0; o < ly.nout; o++) {
          const d = ly.d[o], row = o * ly.nin;
          ly.gb[o] += d;
          for (let i = 0; i < ly.nin; i++) ly.gW[row + i] += d * input[i];
        }
      }
    }
    const n = batch.length || 1;
    for (const ly of m.L) {
      for (let i = 0; i < ly.W.length; i++) { ly.vW[i] = 0.9 * ly.vW[i] - (lr * ly.gW[i]) / n; ly.W[i] += ly.vW[i]; }
      for (let i = 0; i < ly.nout; i++) { ly.vb[i] = 0.9 * ly.vb[i] - (lr * ly.gb[i]) / n; ly.b[i] += ly.vb[i]; }
    }
    return { loss: loss / n, acc: correct / n };
  }

  /* ── RENDERING ───────────────────────────── */
  const off = Object.assign(document.createElement("canvas"), { width: RES, height: RES });
  const octx = off.getContext("2d");
  const img = octx.createImageData(RES, RES);
  const offN = Object.assign(document.createElement("canvas"), { width: NRES, height: NRES });
  const nctxOff = offN.getContext("2d");
  const imgN = nctxOff.createImageData(NRES, NRES);
  const inputMaps = [new Float32Array(NRES * NRES), new Float32Array(NRES * NRES)];
  for (let j = 0; j < NRES; j++)
    for (let i = 0; i < NRES; i++) {
      inputMaps[0][j * NRES + i] = ((i + 0.5) / NRES) * 2 - 1;
      inputMaps[1][j * NRES + i] = 1 - ((j + 0.5) / NRES) * 2;
    }

  function computeMaps() {
    const D = img.data;
    for (let j = 0; j < RES; j++)
      for (let i = 0; i < RES; i++) {
        const p = forward(model, ((i + 0.5) / RES) * 2 - 1, 1 - ((j + 0.5) / RES) * 2);
        const t = 0.1 + 0.5 * Math.abs(p - 0.5) * 2, k = (j * RES + i) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const c = COL[0][ch] * (1 - p) + COL[1][ch] * p;
          D[k + ch] = BG[ch] + (c - BG[ch]) * t;
        }
        D[k + 3] = 255;
      }
    octx.putImageData(img, 0, 0);

    for (let j = 0; j < NRES; j++)
      for (let i = 0; i < NRES; i++) {
        forward(model, inputMaps[0][j * NRES + i], inputMaps[1][j * NRES + i]);
        model.L.forEach((ly, l) => { for (let o = 0; o < ly.nout; o++) maps[l][o][j * NRES + i] = ly.a[o]; });
      }
  }

  function px(x, W) { return ((x + 1) / 2) * W; }
  function py(y, H) { return (1 - (y + 1) / 2) * H; }

  function drawPlot() {
    const W = plot.width, H = plot.height, dpr = W / plot.clientWidth || 1;
    pctx.imageSmoothingEnabled = true;
    pctx.drawImage(off, 0, 0, W, H);
    // axes
    pctx.strokeStyle = "rgba(255,255,255,.06)";
    pctx.lineWidth = 1;
    pctx.beginPath(); pctx.moveTo(W / 2, 0); pctx.lineTo(W / 2, H); pctx.moveTo(0, H / 2); pctx.lineTo(W, H / 2); pctx.stroke();
    const r = 3.6 * dpr;
    for (const p of data) {
      pctx.beginPath();
      pctx.arc(px(p.x, W), py(p.y, H), r, 0, 6.283);
      pctx.fillStyle = `rgb(${COL[p.c]})`;
      pctx.fill();
      pctx.lineWidth = 1.4 * dpr;
      pctx.strokeStyle = "#07090d";
      pctx.stroke();
    }
  }

  // paint one activation map (values in [-1, 1] or [0, 1]) into a box on the network canvas
  function paintMap(arr, x, y, s, unit) {
    const D = imgN.data;
    for (let k = 0; k < arr.length; k++) {
      const a = unit ? arr[k] * 2 - 1 : arr[k];
      const v = (a + 1) / 2, t = 0.18 + 0.7 * Math.abs(a);
      for (let ch = 0; ch < 3; ch++) {
        const c = COL[0][ch] * (1 - v) + COL[1][ch] * v;
        D[k * 4 + ch] = BG[ch] + (c - BG[ch]) * t;
      }
      D[k * 4 + 3] = 255;
    }
    nctxOff.putImageData(imgN, 0, 0);
    nctx.imageSmoothingEnabled = true;
    nctx.drawImage(offN, x, y, s, s);
  }

  function drawNet() {
    const W = net.width, H = net.height, dpr = W / net.clientWidth || 1;
    nctx.clearRect(0, 0, W, H);
    const sizes = model.sizes, cols = sizes.length;
    const padX = 34 * dpr, padTop = 16 * dpr, padBot = 30 * dpr;
    const maxN = Math.max(...sizes);
    const box = Math.min(34 * dpr, ((H - padTop - padBot) / maxN) * 0.78);
    const big = Math.min(64 * dpr, (H - padTop - padBot) * 0.42);
    const colX = (l) => padX + ((W - 2 * padX) * l) / (cols - 1);
    const nodes = sizes.map((n, l) => {
      const s = l === cols - 1 ? big : l === 0 ? Math.min(box * 1.4, big) : box;
      const gap = (H - padTop - padBot) / n;
      return Array.from({ length: n }, (_, i) => ({ x: colX(l), y: padTop + gap * (i + 0.5), s }));
    });

    // edges: color = sign, width/opacity = |w|
    model.L.forEach((ly, l) => {
      for (let o = 0; o < ly.nout; o++)
        for (let i = 0; i < ly.nin; i++) {
          const w = ly.W[o * ly.nin + i], aw = Math.min(Math.abs(w), 3);
          const a = nodes[l][i], b = nodes[l + 1][o];
          nctx.strokeStyle = `rgba(${w > 0 ? COL[1] : COL[0]},${0.08 + aw * 0.22})`;
          nctx.lineWidth = (0.4 + aw * 0.9) * dpr;
          nctx.beginPath();
          nctx.moveTo(a.x + a.s / 2, a.y);
          nctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x - b.s / 2, b.y);
          nctx.stroke();
        }
    });

    // nodes: each neuron drawn as its own activation map over the input plane
    nodes.forEach((layer, l) => layer.forEach((nd, i) => {
      const x = nd.x - nd.s / 2, y = nd.y - nd.s / 2;
      if (l === 0) paintMap(inputMaps[i], x, y, nd.s, false);
      else if (l === cols - 1) { nctx.imageSmoothingEnabled = true; nctx.drawImage(off, x, y, nd.s, nd.s); }
      else paintMap(maps[l - 1][i], x, y, nd.s, false);
      nctx.strokeStyle = "rgba(255,255,255,.18)";
      nctx.lineWidth = 1 * dpr;
      nctx.strokeRect(x, y, nd.s, nd.s);
    }));

    nctx.fillStyle = "#56627a";
    nctx.font = `${10 * dpr}px "JetBrains Mono", monospace`;
    nctx.textAlign = "center";
    sizes.forEach((n, l) => {
      const label = l === 0 ? "input" : l === cols - 1 ? "output" : `hidden ${l}`;
      nctx.fillText(label, colX(l), H - 10 * dpr);
    });
  }

  function drawSpark() {
    const W = spark.width, H = spark.height;
    sctx.clearRect(0, 0, W, H);
    if (losses.length < 2) return;
    const max = Math.max(...losses, 0.1);
    sctx.beginPath();
    losses.forEach((v, i) => {
      const x = (i / (losses.length - 1)) * W, y = H - (v / max) * (H - 4) - 2;
      i ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
    });
    sctx.strokeStyle = "#3ef0a8";
    sctx.lineWidth = 1.5 * (W / spark.clientWidth || 1);
    sctx.stroke();
    sctx.lineTo(W, H); sctx.lineTo(0, H); sctx.closePath();
    sctx.fillStyle = "rgba(62,240,168,.08)";
    sctx.fill();
  }

  function stats() {
    $("#lab-epoch").textContent = epoch.toLocaleString();
    $("#lab-loss").textContent = isNaN(last.loss) ? "—" : last.loss.toFixed(3);
    $("#lab-acc").textContent = isNaN(last.acc) ? "—" : `${(last.acc * 100).toFixed(1)}%`;
  }

  function renderAll() { computeMaps(); drawPlot(); drawNet(); drawSpark(); stats(); }

  /* ── LOOP / STATE ────────────────────────── */
  function loop() {
    if (!running || !visible) { raf = 0; return; }
    for (let s = 0; s < STEPS_PER_FRAME; s++) { last = trainStep(model, data); epoch++; }
    losses.push(last.loss);
    if (losses.length > 300) losses.shift();
    if (frame++ % 2 === 0) renderAll();
    raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && running && visible) raf = requestAnimationFrame(loop); };

  function reset() {
    model = makeModel(hidden);
    maps = model.L.map((ly) => Array.from({ length: ly.nout }, () => new Float32Array(NRES * NRES)));
    epoch = 0; losses = []; last = { loss: NaN, acc: NaN };
    renderAll();
  }
  function newData() { data = DATA[dataset](); reset(); }

  function setPlaying(on) {
    running = on;
    $("#lab-play").textContent = on ? "⏸ pause" : "▶ train";
    kick();
  }

  /* ── CONTROLS ────────────────────────────── */
  const seg = (id, fn) => $$(`#${id} button`).forEach((b) => b.addEventListener("click", () => {
    $$(`#${id} button`).forEach((x) => x.classList.toggle("on", x === b));
    fn(b.dataset.v);
  }));
  seg("lab-data", (v) => { dataset = v; newData(); setPlaying(true); });
  seg("lab-arch", (v) => { hidden = v.split(",").map(Number); reset(); setPlaying(true); });

  const lrInput = $("#lab-lr");
  const setLr = () => {
    lr = Math.pow(10, -3 + (2.5 * lrInput.value) / 100);
    $("#lab-lr-v").textContent = lr < 0.01 ? lr.toFixed(4) : lr.toFixed(3);
  };
  lrInput.addEventListener("input", setLr);
  setLr();

  $("#lab-play").addEventListener("click", () => setPlaying(!running));
  $("#lab-reset").addEventListener("click", () => { reset(); setPlaying(true); });
  $("#lab-shuffle").addEventListener("click", () => { newData(); setPlaying(true); });

  plot.addEventListener("contextmenu", (e) => e.preventDefault());
  plot.addEventListener("pointerdown", (e) => {
    const r = plot.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = 1 - ((e.clientY - r.top) / r.height) * 2;
    data.push({ x, y, c: e.shiftKey || e.button === 2 ? 1 : 0 });
    if (!running) renderAll();
  });

  // keep canvases crisp at any size
  const fit = (c) => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(c.clientWidth * dpr);
    c.height = Math.round(c.clientHeight * dpr);
  };
  new ResizeObserver(() => { [plot, net, spark].forEach(fit); if (model) renderAll(); }).observe(plot.parentElement.parentElement.parentElement);

  // only train while the section is on screen
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { threshold: 0.15 }).observe($("#lab"));

  [plot, net, spark].forEach(fit);
  setPlaying(running);
  newData();
})();
