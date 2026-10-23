/* pace-kit.js — small shared helpers for the PACE homepage variants.
   Data lives in window.PACE_DATA (assets/data/pace-data.js). Every page styles and draws itself;
   this file only holds logic that must stay identical everywhere (data access, PACE's selection
   rule, video sync, copy buttons). */
(function () {
  const D = window.PACE_DATA;
  const K = { data: D };

  K.$ = (s, r = document) => r.querySelector(s);
  K.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  K.el = (tag, attrs = {}, html = '') => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v);
    }
    if (html) e.innerHTML = html;
    return e;
  };
  K.svg = (tag, attrs = {}) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  K.fmt = (v, d = 1) => (v == null ? '–' : Number(v).toFixed(d));
  K.time = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  K.scale = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
  K.reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Polyline / smooth path through [x, y] points. */
  K.path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('');
  K.smoothPath = (pts, t = 0.18) => {
    if (pts.length < 3) return K.path(pts);
    let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
      const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
      d += `C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    return d;
  };

  /* Authors in paper order. opts: {sup: true, mark: '✉'} */
  K.authorsHTML = (opts = {}) => {
    const { sup = true, mark = '✉', sep = '' } = opts;
    return D.meta.authors.map((a) => {
      const s = sup ? `<sup>${a.aff.join(',')}${a.corresponding ? ',' + mark : ''}</sup>` : '';
      return `<span class="author">${a.name}${s}</span>`;
    }).join(sep);
  };
  K.affiliationsHTML = () => Object.entries(D.meta.affiliations).map(([k, v]) => `<span class="aff"><sup>${k}</sup>${v}</span>`).join('');

  /* PACE's rule on precomputed valleys (pace.core.select_horizon):
     per arm, the first valley (in time order) whose contrast >= threshold; H = min over arms, else H_max. */
  K.select = (chunk, threshold = D.fig3.threshold, hmax = 50) => {
    const perArm = chunk.arms.map((a) => {
      const v = a.valleys.find((c) => !c.beyond && c.contrast != null && c.k <= hmax && c.contrast >= threshold);
      return { arm: a.arm, accepted: v ? v.k : null };
    });
    const ks = perArm.map((p) => p.accepted).filter((k) => k != null);
    return { H: ks.length ? Math.min(hmax, ...ks) : hmax, perArm };
  };

  /* Figure 3 global timeline helpers. */
  K.fig3 = D.fig3;
  K.fig3Segments = () => D.fig3.chunks.map((c) => ({ q: c.query, start: c.step, H: c.H, executed: c.executed, end: c.step + c.executed }));
  K.fig3ChunkAt = (step) => {
    const cs = D.fig3.chunks;
    let i = 0;
    while (i + 1 < cs.length && step >= cs[i + 1].step) i++;
    return i;
  };

  /* Copy to clipboard with a visible confirmation. */
  K.copy = async (text, btn, done = 'Copied') => {
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const ta = K.el('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    if (btn) { const old = btn.textContent; btn.textContent = done; btn.classList.add('is-copied'); setTimeout(() => { btn.textContent = old; btn.classList.remove('is-copied'); }, 1600); }
  };
  K.bindBibtex = (preSel = '[data-bibtex]', btnSel = '[data-copy-bibtex]') => {
    K.$$(preSel).forEach((p) => { p.textContent = D.bibtex; });
    K.$$(btnSel).forEach((b) => b.addEventListener('click', () => K.copy(D.bibtex, b)));
  };

  /* Videos: play only while visible; respect reduced motion; keep a playback rate. */
  K.keepRate = (v, rate) => {
    const apply = () => { v.playbackRate = rate; };
    v.addEventListener('loadedmetadata', apply); v.addEventListener('play', apply); apply();
  };
  K.autoplayVisible = (videos, { threshold = 0.25, rate = null } = {}) => {
    const list = Array.from(videos);
    list.forEach((v) => { v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); if (rate) K.keepRate(v, rate); });
    if (K.reducedMotion()) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting && e.intersectionRatio >= threshold) { if (v.dataset.src && !v.src) { v.src = v.dataset.src; } v.play().catch(() => {}); } else v.pause();
    }), { threshold });
    list.forEach((v) => io.observe(v));
    return io;
  };

  /* Chapter buttons for a film; calls render(chapter, index, active) or builds <button>s. */
  K.chapters = (video, container, chapters, { label = (c) => `<b>${K.time(c[0])}</b><span>${c[1]}</span>` } = {}) => {
    container.innerHTML = '';
    const btns = chapters.map((c, i) => {
      const b = K.el('button', { type: 'button', class: 'chapter', 'data-t': c[0] }, label(c, i));
      b.addEventListener('click', () => { window.PACESeekVideo(video, c[0] + 0.05, true); });
      container.appendChild(b);
      return b;
    });
    const sync = () => {
      const t = video.currentTime;
      let k = 0; chapters.forEach((c, i) => { if (t >= c[0] - 0.01) k = i; });
      btns.forEach((b, i) => b.classList.toggle('is-active', i === k));
    };
    video.addEventListener('timeupdate', sync); sync();
    return btns;
  };

  /* Real-robot clip: which logged query is active at the video's current time. */
  K.realQueryAt = (clip, t) => {
    let i = -1; clip.queries.forEach((q, k) => { if (t >= q.t) i = k; });
    return i;
  };
  K.syncReal = (video, clip, cb) => {
    let last = -2;
    const tick = () => {
      const i = K.realQueryAt(clip, video.currentTime);
      if (i !== last) { last = i; cb(i, clip.queries[i] || null); }
      if (!video.paused) requestAnimationFrame(tick);
    };
    const once = () => {
      const i = K.realQueryAt(clip, video.currentTime);
      if (i !== last) { last = i; cb(i, clip.queries[i] || null); }
    };
    video.addEventListener('play', () => requestAnimationFrame(tick));
    video.addEventListener('timeupdate', once);
    video.addEventListener('seeked', () => { last = -2; once(); });
    cb(-1, null);
  };

  /* Simulation clip (10 fps, frame n = env step n): active chunk index at the video's time. */
  K.simChunkAt = (clip, t) => {
    const step = Math.min(clip.steps, Math.floor(t * 10 + 1e-6));
    let i = 0; while (i + 1 < clip.query_steps.length && step >= clip.query_steps[i + 1]) i++;
    return { step, i, done: step >= clip.steps };
  };

  /* Video wall: tile i shows source time s = (offset + 2t) mod period. */
  K.wallTileState = (tile, t) => {
    const s = (tile.offset + 2 * t) % tile.period;
    const step = Math.floor(s * 10 + 1e-6);
    if (step >= tile.steps) return { step: tile.steps, i: tile.query_steps.length - 1, done: true };
    let i = 0; while (i + 1 < tile.query_steps.length && step >= tile.query_steps[i + 1]) i++;
    return { step, i, done: false };
  };

  /* Per-chunk predicted speed for wall / band / real clips (needs assets/data/pace-chunks.js).
     episodeChunks(tile) -> {task, episode, steps, thr, chunks:[{t, H, trig, L, R, vL, vR, aL, aR}]} or null.
     L/R are milli-rad/s integers; use chunkProfile() to get plain numbers. */
  K.episodeChunks = (t) => {
    const C = window.PACE_CHUNKS;
    return C ? C.sim[t.key || `${t.task}|${t.episode}|${t.steps}`] || null : null;
  };
  K.realChunks = (name) => (window.PACE_CHUNKS ? window.PACE_CHUNKS.real[name] || null : null);
  K.chunkProfile = (ch) => (ch._p ? ch : {
    _p: true, t: ch.t, H: ch.H, trig: ch.trig, aL: ch.aL, aR: ch.aR,
    L: ch.L.map((v) => v / 1000), R: ch.R.map((v) => v / 1000),
    vL: ch.vL.map(([k, c]) => [k, c / 10000]), vR: ch.vR.map(([k, c]) => [k, c / 10000]),
  });
  /* SVG path strings for a chunk (raw or profiled) in a w x h box; each arm scaled to its own peak.
     x(k) = k / 50 * w so the valley at index k sits on the boundary after k actions. */
  K.chunkPaths = (ch, w, h, pad = 2) => {
    const prof = K.chunkProfile(ch);
    const x = (k) => (k / 50) * w;
    const mk = (arr) => {
      const mx = Math.max(...arr, 1e-9);
      return arr.map((v, k) => [x(k), h - pad - (v / mx) * (h - 2 * pad)]);
    };
    return { L: K.path(mk(prof.L)), R: K.path(mk(prof.R)), cut: x(prof.H), H: prof.H, trig: prof.trig, peakL: Math.max(...prof.L), peakR: Math.max(...prof.R) };
  };

  /* Scroll reveal: adds .is-in when an element enters the viewport. */
  K.reveal = (sel = '[data-reveal]', cls = 'is-in') => {
    const els = K.$$(sel);
    if (!('IntersectionObserver' in window) || K.reducedMotion()) { els.forEach((e) => e.classList.add(cls)); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add(cls); io.unobserve(e.target); } }), { threshold: 0.15 });
    els.forEach((e) => io.observe(e));
  };

  window.PACEKit = K;
})();
