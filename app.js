/* W2 · Daylight — page logic. Data: window.PACE_DATA / PACE_CHUNKS via PACEKit. */
(function () {
  const K = window.PACEKit, D = K.data, $ = K.$, $$ = K.$$;
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

  /* ---------------------------------------------------------------- header */
  $('#authors').innerHTML = K.authorsHTML();
  $('#affs').innerHTML = K.affiliationsHTML();

  const nav = $('#topnav'), hero = $('#top');
  const onScroll = () => nav.classList.toggle('is-shown', window.scrollY > hero.offsetHeight - 90);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const navLinks = $$('.topnav nav a');
  const secIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => secIO.observe(s));

  /* ---------------------------------------------------------------- video wall */
  const wall = $('#wall'), cv = $('#strips'), ctx = cv.getContext('2d'), tint = $('#tint'), tctx = tint.getContext('2d'), spot = $('#spot');
  const W = D.showcase ? D.showcase.wall : D.walls.w108, tiles = W.tiles, card = $('.hero-card');
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
    if (!ep) { SP.svg.style.display = 'none'; SP.note.textContent = ''; return; }
    SP.svg.style.display = '';
    const ci = st.done ? ep.chunks.length - 1 : Math.min(st.i, ep.chunks.length - 1);
    const key = tl.i + ':' + ci;
    if (key !== sparkKey) {
      sparkKey = key;
      const prof = K.chunkProfile(ep.chunks[ci]), paths = K.chunkPaths(prof, SW, SH, 3), trigR = prof.trig !== 'L';
      SP.trig.setAttribute('d', trigR ? paths.R : paths.L);
      SP.other.setAttribute('d', trigR ? paths.L : paths.R);
      SP.cut.setAttribute('x1', paths.cut); SP.cut.setAttribute('x2', paths.cut);
      SP.ex.setAttribute('width', paths.cut);
      const arr = trigR ? prof.R : prof.L;
      sparkP = { prof, arr, mx: Math.max(...arr, 1e-9) };
      const vv = (trigR ? prof.vR : prof.vL).find((v) => v[0] === prof.H);
      SP.note.textContent = prof.trig
        ? `${prof.trig === 'R' ? 'right' : 'left'}-arm valley · Δ ${fmtC(vv && vv[1])} ≥ δ · cut ${prof.H} of 50`
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
  new IntersectionObserver((es) => { heroVisible = es[0].isIntersecting; if (!heroVisible) wall.pause(); else if (!K.reducedMotion() && !wall.dataset.userPaused) wall.play().catch(() => {}); }, { threshold: 0.02 }).observe(hero);
  if (!K.reducedMotion()) wall.play().catch(() => {});
  else { $('#toggleWall').textContent = 'Play wall'; $('#toggleWall').setAttribute('aria-pressed', 'true'); wall.dataset.userPaused = '1'; }
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
    if (!c) return;
    c.classList.remove('is-hidden'); c.scrollIntoView({ behavior: 'smooth', block: 'center' });
    c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1800);
  });
  $('#toggleWall').addEventListener('click', (e) => {
    const b = e.currentTarget;
    if (wall.paused) { delete wall.dataset.userPaused; wall.play().catch(() => {}); b.textContent = 'Pause wall'; b.setAttribute('aria-pressed', 'false'); }
    else { wall.dataset.userPaused = '1'; wall.pause(); b.textContent = 'Play wall'; b.setAttribute('aria-pressed', 'true'); }
  });

  /* ---------------------------------------------------------------- film */
  const film = $('#film-video');
  K.chapters(film, $('#chapters'), D.films.overview.chapters.slice(0, 10));

  /* ---------------------------------------------------------------- rule replay */
  const F = D.fig3, shoe = $('#shoe'), chips = $('#qchips'), cells = $('#cells'), tl = $('#tl');
  const total = F.total_steps;
  let ci = -1, replayOn = true, pauseTimer = null;
  F.chunks.forEach((c) => {
    const b = K.el('button', { class: 'chip', type: 'button', role: 'tab', 'aria-selected': 'false' }, `Q${c.query}`);
    b.addEventListener('click', () => seekStep(c.step, true)); chips.appendChild(b);
  });
  for (let i = 0; i < 50; i++) cells.appendChild(document.createElement('i'));
  F.chunks.forEach((c) => {
    const s = K.el('div', { class: 'seg', style: `left:${(100 * c.step) / total}%;width:${(100 * c.executed) / total}%` }, c.executed >= 12 ? `Q${c.query} · ${c.executed}` : `${c.executed}`);
    tl.appendChild(s);
  });
  const head = K.el('div', { class: 'head' }); tl.appendChild(head);

  function why(c) {
    const parts = c.arms.slice().reverse().map((a) => {
      const name = a.arm === 'right' ? 'Right arm' : 'Left arm';
      const acc = a.valleys.find((v) => v.k === a.accepted);
      const rej = a.valleys.filter((v) => a.accepted == null || v.k < a.accepted).filter((v) => v.contrast != null);
      const rejTxt = rej.length ? `, after rejecting ${rej.map((v) => `${v.k} (Δ ${v.contrast.toFixed(3)})`).join(', ')}` : '';
      return acc ? `<b>${name}</b>: valley at <span class="em">${acc.k}</span>, Δ ${acc.contrast.toFixed(acc.contrast < 1 ? 3 : 2)} ≥ δ${rejTxt}.`
        : `<b>${name}</b>: no accepted valley${rejTxt}.`;
    });
    let tail = ` Earliest boundary: <b>H = ${c.H}</b>.`;
    if (c.executed < c.H) tail += ` The task succeeded after <b>${c.executed}</b> of them.`;
    return parts.join(' ') + tail;
  }

  function chart(c) {
    const Wd = 760, lane = 104, gap = 34, top = 8, Ht = top + 2 * lane + gap + 26;
    const x = (k) => (k / 50) * Wd;
    const svg = K.svg('svg', { viewBox: `0 0 ${Wd} ${Ht}`, role: 'img', 'aria-label': `Predicted speed for query ${c.query}; selected horizon ${c.H}` });
    const defs = K.svg('defs');
    defs.innerHTML = `<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${T.hatch}" stroke-width="2"/></pattern>`;
    svg.appendChild(defs);
    const order = [c.arms.find((a) => a.arm === 'right'), c.arms.find((a) => a.arm === 'left')];
    order.forEach((a, li) => {
      const y0 = top + li * (lane + gap), col = a.arm === 'right' ? T.acc : T.left;
      const mx = Math.max(...a.smooth, ...a.raw) * 1.08;
      const y = (v) => y0 + lane - (v / mx) * lane;
      svg.appendChild(K.svg('rect', { x: x(c.H), y: y0, width: x(49) - x(c.H), height: lane, fill: 'url(#hatch)' }));
      svg.appendChild(K.svg('rect', { x: 0, y: y0, width: x(c.H), height: lane, fill: T.execFill }));
      svg.appendChild(K.svg('line', { x1: 0, x2: x(49), y1: y0 + lane, y2: y0 + lane, class: 'axis' }));
      const lbl = K.svg('text', { x: x(49), y: y0 + 10, class: 'lane-label', 'text-anchor': 'end' }); lbl.textContent = `${a.arm.toUpperCase()} ARM · peak ${Math.max(...a.smooth).toFixed(2)} rad/s`;
      svg.appendChild(lbl);
      const raw = a.raw.map((v, k) => [x(k), y(v)]), sm = a.smooth.map((v, k) => [x(k), y(v)]);
      svg.appendChild(K.svg('path', { d: K.path(raw), fill: 'none', stroke: col, 'stroke-opacity': .28, 'stroke-width': 1 }));
      const pre = sm.filter((p, k) => k <= c.H), post = sm.filter((p, k) => k >= c.H);
      svg.appendChild(K.svg('path', { d: K.path(pre), fill: 'none', stroke: col, 'stroke-width': 2.4, 'stroke-linejoin': 'round', class: 'draw' }));
      svg.appendChild(K.svg('path', { d: K.path(post), fill: 'none', stroke: col, 'stroke-opacity': .5, 'stroke-width': 1.6, 'stroke-dasharray': '4 4' }));
      a.valleys.forEach((v) => {
        if (v.contrast == null) return;
        const accepted = v.k === a.accepted, used = accepted && v.k === c.H;
        if (a.accepted != null && v.k > a.accepted) {
          svg.appendChild(K.svg('circle', { cx: x(v.k), cy: y(a.smooth[v.k]), r: 3, fill: 'none', stroke: T.faint3, 'stroke-width': 1 }));
          return;
        }
        const cx = x(v.k), cy = y(a.smooth[v.k]);
        svg.appendChild(K.svg('circle', { cx, cy, r: accepted ? 5.5 : 4, fill: accepted ? col : T.dotFill, stroke: accepted ? col : T.faint, 'stroke-width': 1.5, opacity: accepted && !used ? .65 : 1 }));
        const tx = K.svg('text', { x: cx, y: cy - 10, 'text-anchor': 'middle', class: 'tick', fill: accepted ? (used ? col : T.faint2) : T.faint });
        tx.textContent = accepted ? (used ? `Δ ${v.contrast < 1 ? v.contrast.toFixed(3) : v.contrast.toFixed(2)} ✓` : `${v.k} · later`) : `Δ ${v.contrast.toFixed(3)}`;
        svg.appendChild(tx);
      });
    });
    const yb = top + 2 * lane + gap;
    svg.appendChild(K.svg('line', { x1: x(c.H), x2: x(c.H), y1: top - 2, y2: yb + 4, stroke: T.acc, 'stroke-width': 1.5 }));
    const ht = K.svg('text', { x: x(c.H) + 6, y: top + 22, class: 'tick', fill: T.acc2, 'font-weight': 600 }); ht.textContent = `H = ${c.H}`; svg.appendChild(ht);
    [0, 10, 20, 30, 40, 50].forEach((k) => { const t = K.svg('text', { x: Math.min(x(k), Wd - 8), y: Ht - 4, class: 'tick', 'text-anchor': k === 0 ? 'start' : 'middle' }); t.textContent = k; svg.appendChild(t); });
    const prog = K.svg('line', { x1: 0, x2: 0, y1: top, y2: yb, stroke: T.prog, 'stroke-opacity': .7, 'stroke-width': 1 });
    svg.appendChild(prog);
    $('#chart').innerHTML = ''; $('#chart').appendChild(svg);
    if (!K.reducedMotion()) $$('#chart .draw').forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); p.style.transition = 'stroke-dashoffset .9s ease'; p.style.strokeDashoffset = 0; });
    return { x, prog };
  }

  let ch = null;
  function setChunk(i) {
    if (i === ci) return;
    ci = i; const c = F.chunks[i];
    $$('.chip', chips).forEach((b, k) => { b.classList.toggle('is-on', k === i); b.setAttribute('aria-selected', String(k === i)); });
    $('#hval').innerHTML = `${c.H}<small>${c.executed < c.H ? `selected · ${c.executed} executed` : 'actions executed'}</small>`;
    $('#why').innerHTML = why(c);
    $('#cells-note').textContent = c.executed < c.H ? `${c.H} selected · ${c.executed} executed · task complete` : `${c.H} selected · ${50 - c.H} discarded`;
    $$('.seg', tl).forEach((s, k) => s.classList.toggle('is-on', k === i));
    ch = chart(c);
  }
  function update() {
    const step = Math.min(total, Math.floor(shoe.currentTime * 10 + 1e-6));
    const i = K.fig3ChunkAt(step), c = F.chunks[i];
    setChunk(i);
    const prog = Math.max(0, Math.min(c.executed, step - c.step));
    $$('i', cells).forEach((e, k) => { e.className = k < prog ? 'on' : k < c.H ? 'sel' : 'cut'; });
    if (ch) { ch.prog.setAttribute('x1', ch.x(prog)); ch.prog.setAttribute('x2', ch.x(prog)); }
    head.style.left = `calc(${(100 * step) / total}% - 1px)`;
    $('#shoe-step').textContent = step >= total ? `step ${total} · success` : `step ${step}`;
    tl.setAttribute('aria-valuenow', step);
  }
  function seekStep(step, play) {
    shoe.currentTime = step / 10 + 0.001; update();
    if (play && replayOn) shoe.play().catch(() => {});
  }
  shoe.addEventListener('timeupdate', update);
  shoe.addEventListener('seeked', update);
  shoe.addEventListener('ended', () => { clearTimeout(pauseTimer); pauseTimer = setTimeout(() => { if (replayOn) seekStep(0, true); }, 1600); });
  tl.addEventListener('click', (e) => { const b = tl.getBoundingClientRect(); seekStep(Math.round(((e.clientX - b.left) / b.width) * total), true); });
  tl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') seekStep(F.chunks[Math.min(F.chunks.length - 1, ci + 1)].step, true);
    if (e.key === 'ArrowLeft') seekStep(F.chunks[Math.max(0, ci - 1)].step, true);
  });
  $('#play').addEventListener('click', (e) => {
    replayOn = !replayOn; e.currentTarget.textContent = replayOn ? 'Pause' : 'Play'; e.currentTarget.classList.toggle('is-on', replayOn);
    if (replayOn) { if (shoe.ended) seekStep(0, true); else shoe.play().catch(() => {}); } else shoe.pause();
  });
  setChunk(0); update();
  new IntersectionObserver((es) => {
    if (es[0].isIntersecting && replayOn && !K.reducedMotion()) shoe.play().catch(() => {}); else shoe.pause();
  }, { threshold: 0.35 }).observe($('.replay'));
  if (K.reducedMotion()) { replayOn = false; $('#play').textContent = 'Play'; $('#play').classList.remove('is-on'); }

  /* ---------------------------------------------------------------- results */
  const ov = D.full50.overall;
  const order = ['H = 5', 'H = 50', 'H = 25', 'AutoHorizon', 'AAC', 'PACE'];
  const pct = (v) => (100 * v) / 70;
  $('#overall').innerHTML = order.map((m) => {
    const [v, sd] = ov[m];
    return `<div class="barrow ${m === 'PACE' ? 'pace' : ''}"><span class="lbl">${m === 'H = 5' || m === 'H = 25' || m === 'H = 50' ? 'Fixed ' + m : m}</span>
      <span class="track"><span class="fill" style="width:${pct(v)}%;transform:scaleX(0)"></span><span class="sd" style="left:${pct(v - sd)}%;width:${pct(2 * sd)}%"></span></span>
      <span class="val">${v.toFixed(2)}%</span></div>`;
  }).join('') + `<div class="legend" style="justify-content:space-between"><span>0%</span><span>axis to 70%</span></div>`;
  const barIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { $$('.fill', e.target).forEach((f) => { f.style.transform = 'scaleX(1)'; }); barIO.disconnect(); } }), { threshold: .3 });
  barIO.observe($('#overall'));

  const M = D.matched, gains = [1.6, 2.6, 10.6, 4.3, 1.9, 7.2];
  const mx = (v) => ((v - 40) / 60) * 100;
  $('#matched').innerHTML = M.tasks.map((t, i) => {
    const a = M.fixed[i], b = M.pace[i];
    return `<div class="row"><span>${t} <span class="mono" style="color:var(--ink3);font-size:11px">H ${M.fixed_h[i]}</span></span>
      <span class="line"><span class="seg" style="left:${mx(a)}%;width:${mx(b) - mx(a)}%"></span><span class="a" style="left:${mx(a)}%" title="Fixed H = ${M.fixed_h[i]}: ${a}%"></span><span class="b" style="left:${mx(b)}%" title="PACE: ${b}% (mean H ${M.pace_mean_h[i]})"></span></span>
      <span class="gain">+${gains[i].toFixed(1)}</span></div>`;
  }).join('') + `<div class="row" style="margin-top:2px"><span></span><span class="mono" style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink3)"><span>40%</span><span>70%</span><span>100%</span></span><span></span></div>`;

  $('#phase').innerHTML = D.phase.rows.map((r) => `<div class="row"><span>${r[0]}</span><span class="t"><span class="p e" style="width:${r[4]}%"></span><span class="r" style="left:${r[6]}%" title="uniform random ${r[6]}%"></span></span><span class="v e">${r[4]}% <span style="color:var(--ink3)">/ ${r[6]}</span></span></div>`).join('')
    + `<div class="hbar-legend"><span><i></i>uniform-random boundaries (same count)</span><span>${D.phase.overall.aligned} of ${D.phase.overall.valleys} boundaries matched</span></div>`;
  const fq = D.real.franka_queries, qmax = Math.max(...fq.map((r) => r[3]));
  $('#queries').innerHTML = fq.map((r) => `<div class="row"><span>${r[0].replace('Fixed ', '')} <span class="mono" style="color:var(--ink3);font-size:11px">${r[1]}/100</span></span><span class="t"><span class="p ${r[0] === 'PACE' ? 'e' : ''}" style="width:${(100 * r[3]) / qmax}%"></span></span><span class="v ${r[0] === 'PACE' ? 'e' : ''}">${r[3].toFixed(2)}</span></div>`).join('');
  $('#ablation').innerHTML = D.ablation.profile.map((r) => { const d = r[0].includes('default'); return `<div class="row"><span>${r[0].replace(' (default)', '')}</span><span class="t"><span class="p ${d ? 'e' : ''}" style="width:${(100 * r[2]) / 28}%"></span></span><span class="v ${d ? 'e' : ''}">${r[1]}% · ${r[2]}</span></div>`; }).join('')
    + `<div class="hbar-legend"><span>bar = mean selected H (steps) · value = success · mean H</span></div>`;

  /* ---------------------------------------------------------------- gallery */
  const rows = Object.fromEntries(D.full50.rows.map((r) => [r.task, r]));
  const gal = $('#gallery');
  const cards = (D.showcase ? D.showcase.clips : D.clips).map((c) => {
    const r = rows[c.task], v = r.v, fixed = [[v[0], 5], [v[1], 25], [v[2], 50]].sort((a, b) => b[0] - a[0])[0];
    const gain = +(v[5] - fixed[0]).toFixed(1);
    const q = c.query_steps, spans = q.map((s, j) => (j + 1 < q.length ? q[j + 1] : c.steps) - s);
    const el = K.el('article', { class: 'tcard', id: 'task-' + c.task, 'data-gain': gain, 'data-steps': c.steps, 'data-label': c.label });
    el.innerHTML = `<div class="v"><video muted playsinline loop preload="none" data-src="${c.file}" poster="${c.poster.replace('.jpg', '@2x.jpg')}" aria-label="${c.label}, recorded PACE rollout"></video>
        <div class="strip">${spans.map((s) => `<i style="flex:${s}"></i>`).join('')}</div><span class="hq">Q1/${q.length} · H <em>${c.H[0]}</em></span></div>
      <div class="meta"><b>${c.label}</b><span class="nums"><span>PACE <em>${v[5].toFixed(1)}%</em></span><span class="${gain >= 0 ? 'pos' : 'neg'}">${gain >= 0 ? '+' : '−'}${Math.abs(gain).toFixed(1)}</span></span><span>best fixed ${fixed[0].toFixed(1)}% at H = ${fixed[1]}</span></div>`;
    gal.appendChild(el);
    const vid = $('video', el), segs = $$('.strip i', el), hq = $('.hq', el);
    let last = -1;
    const update = () => {
      const st = K.simChunkAt(c, vid.currentTime);
      const k = st.done ? q.length : st.i;
      if (k !== last) {
        last = k;
        segs.forEach((s, j) => { s.className = j < k ? '' : j === k ? 'cur' : 'fut'; });
        hq.innerHTML = st.done ? `done · ${q.length} queries` : `Q${st.i + 1}/${q.length} · H <em>${c.H[st.i]}</em>`;
      }
    };
    const tick = () => { update(); if (!vid.paused) requestAnimationFrame(tick); };
    vid.addEventListener('play', () => requestAnimationFrame(tick));
    vid.addEventListener('timeupdate', update);
    vid.addEventListener('seeked', update);
    return el;
  });
  K.autoplayVisible($$('video', gal), { rate: 2, threshold: 0.4 });

  /* ---------------------------------------------------------------- real robots */
  const RW = 520, RH = 64;
  $$('.rclip').forEach((box) => {
    const name = box.dataset.clip, clip = D.real_clips[name], rc = K.realChunks(name);
    const vid = $('video', box), rib = $('.ribbon', box), tag = $('.tag', box);
    const cv2 = { svg: $('.rcurve svg', box), ex: $('.rcurve .ex', box), other: $('.rcurve .other', box), trig: $('.rcurve .trig', box), cut: $('.rcurve .cut', box), l: $('.rnote .l', box), r: $('.rnote .r', box) };
    const qs = clip.queries;
    qs.forEach((q, k) => {
      const dur = (k + 1 < qs.length ? qs[k + 1].t : clip.duration) - q.t;
      const i = K.el('i', { style: `width:calc(${(100 * dur) / clip.duration}% - 3px)`, title: `Query ${q.q} · H = ${q.H}` }, String(q.H));
      i.addEventListener('click', () => { vid.currentTime = q.t + 0.02; vid.play().catch(() => {}); });
      rib.appendChild(i);
    });
    const items = $$('i', rib);
    const curve = (k) => {
      const idx = Math.max(0, k), c0 = rc && rc.chunks[idx];
      if (!c0) return;
      const prof = K.chunkProfile(c0), paths = K.chunkPaths(prof, RW, RH, 4), trigR = prof.trig !== 'L';
      cv2.trig.setAttribute('d', trigR ? paths.R : paths.L);
      cv2.other.setAttribute('d', trigR ? paths.L : paths.R);
      cv2.cut.setAttribute('x1', paths.cut); cv2.cut.setAttribute('x2', paths.cut);
      cv2.ex.setAttribute('width', paths.cut);
      cv2.svg.style.opacity = k < 0 ? 0.45 : 1;
      cv2.l.textContent = `${k < 0 ? 'Query 1 (next)' : 'Query ' + (idx + 1)} · predicted speed, both arms, 30 Hz`;
      cv2.r.innerHTML = prof.trig ? `${prof.trig === 'R' ? 'right' : 'left'}-arm valley → <b>H = ${prof.H}</b>` : `no accepted valley → <b>H = ${prof.H}</b>`;
    };
    K.syncReal(vid, clip, (k, q) => {
      items.forEach((e, j) => { e.className = j < k ? 'past' : j === k ? 'cur' : ''; });
      tag.innerHTML = q ? `Query ${q.q}/${qs.length} · H <em>${q.H}</em>` : `real time · ${qs.length} queries`;
      curve(k);
    });
  });
  K.autoplayVisible($$('.rclip video'), { threshold: 0.5 });

  const R = D.real;
  $('#realtable').innerHTML = `<thead><tr><th>Task</th><th>Setup</th><th>Score · H = 50</th><th>Score · PACE</th><th>Success · H = 50</th><th>Success · PACE</th></tr></thead><tbody>` +
    R.tasks.map((t) => `<tr><td>${t.name}</td><td style="font-family:var(--sans);color:var(--ink3)">${t.robot} · ${t.trials}</td><td>${t.base[0].toFixed(1)}</td><td class="hi">${t.pace[0].toFixed(1)}</td><td>${t.base[1].toFixed(1)}%</td><td class="hi">${t.pace[1].toFixed(1)}%</td></tr>`).join('') +
    `<tr class="pace"><td>Average (equal weight)</td><td></td><td>${R.average.score[0]}</td><td class="best">${R.average.score[1]}</td><td>${R.average.success[0]}%</td><td class="best">${R.average.success[1]}%</td></tr></tbody>`;
  $('#objects').innerHTML = R.franka_objects.map((o) => `<div class="row"><span>${o[0]}</span><span class="t"><i class="b" style="width:${(100 * o[1]) / 20}%"></i><i class="p" style="width:${(100 * o[2]) / 20}%"></i></span><span class="val">${o[1]} → ${o[2]} /20</span></div>`).join('');
  $('#frankaq').innerHTML = `<thead><tr><th>Execution</th><th>Success</th><th>H</th><th>Queries</th></tr></thead><tbody>` +
    R.franka_queries.map((r) => `<tr class="${r[0] === 'PACE' ? 'pace' : ''}"><td>${r[0]}</td><td>${r[1]}/100</td><td>${r[0] === 'PACE' ? 'mean ' + r[2] : r[2]}</td><td>${r[3].toFixed(2)}</td></tr>`).join('') + '</tbody>';

  /* ---------------------------------------------------------------- LIBERO */
  const L = D.libero, best = L.suites.map((_, j) => Math.max(...Object.values(L.rows).map((r) => r[j][0])));
  $('#libero').innerHTML = `<thead><tr><th>GR00T N1.7</th>${L.suites.map((s) => `<th>${s}</th>`).join('')}</tr></thead><tbody>` +
    Object.entries(L.rows).map(([m, r]) => `<tr class="${m === 'PACE' ? 'pace' : ''}"><td>${m.startsWith('H') ? 'Fixed ' + m : m}</td>${r.map((c, j) => `<td class="${c[0] === best[j] ? 'best' : ''}">${c[0].toFixed(2)}<span class="sd">±${c[1].toFixed(2)}</span></td>`).join('')}</tr>`).join('') + '</tbody>';

  /* ---------------------------------------------------------------- limits, code, cite */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const hl = (s) => esc(s)
    .replace(/(#.*)$/gm, '<span class="c">$1</span>')
    .replace(/\b(from|import|for|in)\b/g, '<span class="k">$1</span>')
    .replace(/(https:\/\/\S+)/g, '<span class="s">$1</span>');
  $('#install').innerHTML = hl(D.install);
  $('#usage').innerHTML = hl(D.usage);
  K.bindBibtex();
  K.reveal();
})();
