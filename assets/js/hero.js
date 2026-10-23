/* First-screen wall effects. Inlined by scripts/build-hero.py. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const hero = $('#top');
  const K = { path: (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('') };
  const T = {
      "acc": "#e85d2a",
      "acc2": "#c44a1c",
      "left": "#3f6fb5",
      "glow": "rgba(232,93,42,.55)",
      "tint": "rgba(128,128,128,0.82)",
      "dim": "rgba(246,245,241,0.58)",
      "stripPast": "rgba(21,24,28,0.62)",
      "stripFut": "rgba(21,24,28,0.2)",
      "head": "#e85d2a",
      "hatch": "rgba(21,24,28,.08)",
      "execFill": "rgba(232,93,42,.07)",
      "dotFill": "#ffffff",
      "faint": "rgba(21,24,28,.45)",
      "faint2": "rgba(21,24,28,.62)",
      "faint3": "rgba(21,24,28,.22)",
      "prog": "#15181c"
  };

  K.wallTileState = (tile, t) => {
    const s = (tile.offset + 2 * t) % tile.period;
    const step = Math.floor(s * 10 + 1e-6);
    if (step >= tile.steps) return { step: tile.steps, i: tile.query_steps.length - 1, done: true };
    let i = 0; while (i + 1 < tile.query_steps.length && step >= tile.query_steps[i + 1]) i++;
    return { step, i, done: false };
  };

  // Decode only the selected query, then reuse it. Stored samples are lossless.
  const decoded = new Map();
  K.episodeChunks = (t) => window.PACE_HERO.sim[t.key];
  K.chunkProfile = (ch) => {
    if (decoded.has(ch)) return decoded.get(ch);
    const bytes = atob(ch[4]);
    let offset = 0;
    const arm = () => {
      let prev = 0;
      return Array.from({ length: 49 }, () => {
        let n = 0, shift = 0, byte;
        do { byte = bytes.charCodeAt(offset++); n |= (byte & 127) << shift; shift += 7; } while (byte & 128);
        prev += n & 1 ? -(n + 1) / 2 : n / 2;
        return prev / 1000;
      });
    };
    const prof = { _p: true, t: ch[0], H: ch[1], trig: ch[2], contrast: ch[3] === null ? null : ch[3] / 10000, L: arm(), R: arm() };
    decoded.set(ch, prof);
    return prof;
  };
  /* SVG path strings for a chunk (raw or profiled) in a w x h box; each arm scaled to its own peak.
     x(k) = k / 50 * w so the valley at index k sits on the boundary after k actions. */
  K.chunkPaths = (ch, w, h, pad = 2) => {
    const prof = ch._p ? ch : K.chunkProfile(ch);
    const x = (k) => (k / 50) * w;
    const mk = (arr) => {
      const mx = Math.max(...arr, 1e-9);
      return arr.map((v, k) => [x(k), h - pad - (v / mx) * (h - 2 * pad)]);
    };
    return { L: K.path(mk(prof.L)), R: K.path(mk(prof.R)), cut: x(prof.H), H: prof.H, trig: prof.trig, peakL: Math.max(...prof.L), peakR: Math.max(...prof.R) };
  };

  /* ---------------------------------------------------------------- video wall */
  const wall = $('#wall'), cv = $('#strips'), ctx = cv.getContext('2d'), tint = $('#tint'), tctx = tint.getContext('2d'), spot = $('#spot');
  const W = window.PACE_HERO.wall, tiles = W.tiles, card = $('.hero-card');
  let showStrips = true, spotIdx = -1, hoverIdx = -1, nextSpotAt = 0, heroVisible = true, tintKey = '';
  let G = { w: 0, h: 0, s: 1, ox: 0, oy: 0, tw: 0, th: 0 };

  function layout() {
    const r = hero.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const [c, x] of [[cv, ctx], [tint, tctx]]) {
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const s = Math.max(r.width / 1920, r.height / 1080);
    G = { w: r.width, h: r.height, s, ox: (r.width - 1920 * s) / 2, oy: (r.height - 1080 * s) / 2, tw: W.tile[0] * s, th: W.tile[1] * s };
    tintKey = '';
  }
  const rectOf = (t) => [G.ox + t.col * G.tw, G.oy + t.row * G.th, G.tw, G.th];
  function cardRect() {
    const a = card.getBoundingClientRect(), b = hero.getBoundingClientRect();
    return [a.left - b.left - 12, a.top - b.top - 12, a.width + 24, a.height + 24];
  }
  const overlaps = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
  function pickSpot() {
    const cr = cardRect(), foot = [0, G.h - 150, G.w, 150], top = [0, 0, G.w, 70];
    const ok = tiles.filter((t) => {
      if (!K.episodeChunks(t)) return false;
      const r = rectOf(t);
      return r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= G.w && r[1] + r[3] <= G.h && !overlaps(r, cr) && !overlaps(r, foot) && !overlaps(r, top);
    });
    if (!ok.length) return -1;
    let t; do { t = ok[Math.floor(Math.random() * ok.length)]; } while (ok.length > 1 && t.i === spotIdx);
    return t.i;
  }
  const fmtC = (c) => (c == null ? '–' : c < 1 ? c.toFixed(3) : c.toFixed(2));
  function stateText(t, st) {
    const n = t.query_steps.length;
    return st.done ? `task complete · ${n} queries` : `query ${st.i + 1}/${n} · H = ${t.H[st.i]}`;
  }

  /* spotlight sparkline: the spotlit clip's current chunk, recomputed from its log */
  const SP = { svg: $('svg', spot), ex: $('.ex', spot), other: $('.other', spot), trig: $('.trig', spot), cut: $('.cut', spot), dot: $('.dot', spot), note: $('.note', spot), q: $('.q', spot), b: $('b', spot) };
  const SW = 192, SH = 44;
  let sparkKey = '', sparkP = null;
  function setSpark(tl, st) {
    const ep = K.episodeChunks(tl);
    if (!ep) { sparkKey = ''; SP.svg.style.display = 'none'; SP.note.textContent = ''; return; }
    SP.svg.style.display = '';
    const ci = st.done ? ep.length - 1 : Math.min(st.i, ep.length - 1);
    const key = tl.i + ':' + ci;
    if (key !== sparkKey) {
      sparkKey = key;
      const prof = K.chunkProfile(ep[ci]), paths = K.chunkPaths(prof, SW, SH, 3), trigR = prof.trig !== 'L';
      SP.trig.setAttribute('d', trigR ? paths.R : paths.L);
      SP.other.setAttribute('d', trigR ? paths.L : paths.R);
      SP.cut.setAttribute('x1', paths.cut); SP.cut.setAttribute('x2', paths.cut);
      SP.ex.setAttribute('width', paths.cut);
      const arr = trigR ? prof.R : prof.L;
      sparkP = { prof, arr, mx: Math.max(...arr, 1e-9) };
      SP.note.textContent = prof.trig
        ? `${prof.trig === 'R' ? 'right' : 'left'}-arm valley · Δ ${fmtC(prof.contrast)} ≥ δ · cut ${prof.H} of 50`
        : `no accepted valley · H = ${prof.H} (full chunk)`;
    }
    const p = sparkP, k = st.done ? p.prof.H : Math.max(0, Math.min(p.prof.H, st.step - p.prof.t)), kk = Math.min(p.arr.length - 1, k);
    SP.dot.setAttribute('cx', ((k / 50) * SW).toFixed(1));
    SP.dot.setAttribute('cy', (SH - 3 - (p.arr[kk] / p.mx) * (SH - 6)).toFixed(1));
  }

  function drawTint(focus) {
    const key = `${G.w}x${G.h}:${focus}`;
    if (key === tintKey) return;
    tintKey = key;
    tctx.clearRect(0, 0, G.w, G.h);
    tctx.fillStyle = T.tint; tctx.fillRect(0, 0, G.w, G.h);
    if (focus >= 0) { const r = rectOf(tiles[focus]); tctx.clearRect(r[0], r[1], r[2], r[3]); }
  }
  function draw(now) {
    const t = wall.currentTime || 0;
    const focus = hoverIdx >= 0 ? hoverIdx : spotIdx;
    drawTint(focus);
    ctx.clearRect(0, 0, G.w, G.h);
    ctx.fillStyle = T.dim;
    ctx.fillRect(0, 0, G.w, G.h);
    if (focus >= 0) { const r = rectOf(tiles[focus]); ctx.clearRect(r[0], r[1], r[2], r[3]); }
    if (showStrips) {
      const pad = Math.max(5, G.tw * 0.06), sh = Math.max(2, G.th * 0.022);
      for (const tl of tiles) {
        const [x, y, w, h] = rectOf(tl);
        if (x + w < 0 || x > G.w || y + h < 0 || y > G.h) continue;
        const st = K.wallTileState(tl, t), q = tl.query_steps, sw = w - 2 * pad, sy = y + h - pad - sh;
        for (let j = 0; j < q.length; j++) {
          const s0 = q[j], s1 = j + 1 < q.length ? q[j + 1] : tl.steps;
          const x0 = x + pad + (sw * s0) / tl.steps, x1 = x + pad + (sw * s1) / tl.steps - 1.5;
          ctx.fillStyle = st.done || j < st.i ? T.stripPast : j === st.i ? T.acc : T.stripFut;
          ctx.fillRect(x0, sy, Math.max(1, x1 - x0), sh);
        }
        if (!st.done) {
          ctx.fillStyle = T.head;
          ctx.beginPath(); ctx.arc(x + pad + (sw * st.step) / tl.steps, sy + sh / 2, sh * 1.25, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    if (focus >= 0) {
      const tl = tiles[focus], r = rectOf(tl), st = K.wallTileState(tl, t);
      ctx.save(); ctx.strokeStyle = T.acc; ctx.lineWidth = 1.5; ctx.shadowColor = T.glow; ctx.shadowBlur = 16;
      ctx.strokeRect(r[0] + .75, r[1] + .75, r[2] - 1.5, r[3] - 1.5); ctx.restore();
      SP.b.textContent = tl.label;
      SP.q.textContent = stateText(tl, st);
      setSpark(tl, st);
      const sw = spot.offsetWidth || 214, sh = spot.offsetHeight || 110, cr = cardRect();
      const clampY = (y) => Math.max(8, Math.min(G.h - sh - 8, y)), clampX = (x) => Math.max(8, Math.min(G.w - sw - 8, x));
      const cands = [[r[0] + r[2] + 10, clampY(r[1] + 4)], [r[0] - sw - 10, clampY(r[1] + 4)], [clampX(r[0]), r[1] + r[3] + 8], [clampX(r[0]), r[1] - sh - 8]];
      const fits = (c) => c[0] >= 8 && c[0] + sw <= G.w - 8 && c[1] >= 8 && c[1] + sh <= G.h - 8 && !overlaps([c[0], c[1], sw, sh], cr);
      const pos = cands.find(fits) || [clampX(r[0] + r[2] + 10), clampY(r[1] + 4)];
      spot.style.left = pos[0] + 'px'; spot.style.top = pos[1] + 'px';
      spot.classList.add('is-on');
    } else spot.classList.remove('is-on');
    if (hoverIdx < 0 && now > nextSpotAt) { spotIdx = pickSpot(); nextSpotAt = now + 3200; }
  }
  function loop(now) { if (heroVisible) draw(now || 0); requestAnimationFrame(loop); }
  layout(); window.addEventListener('resize', layout);
  wall.addEventListener('timeupdate', () => { if (document.hidden && heroVisible) draw(performance.now()); });
  new IntersectionObserver((es) => { heroVisible = es[0].isIntersecting; }, { threshold: 0.02 }).observe(hero);
  // Draw at the current video time before replacing the CSS fallback layers.
  spotIdx = pickSpot();
  nextSpotAt = performance.now() + 3200;
  draw(performance.now());
  hero.classList.add('effects-ready');
  requestAnimationFrame(loop);

  hero.addEventListener('mousemove', (e) => {
    if (e.target.closest('.hero-card, .hero-foot .ctrl')) { hoverIdx = -1; hero.style.cursor = ''; return; }
    const b = hero.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    const col = Math.floor((x - G.ox) / G.tw), row = Math.floor((y - G.oy) / G.th);
    const t = tiles.find((tl) => tl.col === col && tl.row === row);
    hoverIdx = t ? t.i : -1; hero.style.cursor = t ? 'pointer' : '';
  });
  hero.addEventListener('mouseleave', () => { hoverIdx = -1; });
  hero.addEventListener('click', (e) => {
    if (hoverIdx < 0 || e.target.closest('.hero-card, .hero-foot')) return;
    const c = $('#task-' + tiles[hoverIdx].task);
    if (!c) {
      document.dispatchEvent(new CustomEvent('pace:navigate', { detail: { id: 'task-' + tiles[hoverIdx].task } }));
      return;
    }
    c.classList.remove('is-hidden'); c.scrollIntoView({ behavior: 'smooth', block: 'center' });
    c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1800);
  });
})();
