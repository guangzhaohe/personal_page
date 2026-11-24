/* Size Guessr. Each round shows a photo with one ruler drawn on an object; you guess its real length.
   Method A and Method B answer from their metric depth between the same two endpoints. The ground truth comes from
   the dataset's depth sensor. Closest guess (in log ratio) takes the round. Questions: questions.js. */
(function () {
  'use strict';
  const Q = window.SG_QUESTIONS || [];
  const ROUND_CHOICES = [5, 10, 20, 50, 100].filter((n) => n <= Q.length);
  const PLAYERS = [['you', 'You', 'c-you'], ['a', 'Method A', 'c-a'], ['b', 'Method B', 'c-b']];
  const LO = Math.log(0.01), HI = Math.log(30);           // slider: 1 cm .. 30 m, log scale
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };

  const fmt = (m) => (m < 1 ? (m * 100).toFixed(m < 0.1 ? 1 : 0) + ' cm' : m.toFixed(2) + ' m');
  const toVal = (t) => Math.exp(LO + t * (HI - LO));
  const err = (v, gt) => Math.abs(Math.log(v / gt));
  const relErr = (v, gt) => { const r = v / gt;
    if (r >= 2) return '×' + (r < 10 ? r.toFixed(1) : Math.round(r));
    if (r <= 0.5) return '÷' + (1 / r < 10 ? (1 / r).toFixed(1) : Math.round(1 / r));
    const e = (r - 1) * 100; return (e >= 0 ? '+' : '') + e.toFixed(0) + '%'; };
  const WORD = { height: 'tall', length: 'long', width: 'wide', depth: 'deep' };

  /* ------------------------------------------------------------ preloading: every image, decoded once */
  const cache = new Map();
  function preload(src) {
    if (!cache.has(src)) {
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
      cache.set(src, (im.decode ? im.decode() : new Promise((r) => { im.onload = r; })).catch(() => {}).then(() => im));
    }
    return cache.get(src);
  }
  function preloadAll(list, onProgress) {
    let done = 0;
    return Promise.all(list.map((q) => preload(q.img).then(() => onProgress && onProgress(++done / list.length))));
  }

  /* ------------------------------------------------------------ 3D tilt of the deck */
  const deck = $('deck'), world = $('world');
  const tilt = { tx: 0, ty: 0, x: 0, y: 0, on: matchMedia('(hover: hover) and (min-width: 821px)').matches &&
                 !matchMedia('(prefers-reduced-motion: reduce)').matches };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || document.body.classList.contains('dying')) return;
    tilt.tx = e.clientX / innerWidth * 2 - 1; tilt.ty = e.clientY / innerHeight * 2 - 1;
  });
  document.addEventListener('mouseleave', () => { tilt.tx = 0; tilt.ty = 0; });
  // hold the card still while a button is pressed, so press and release land on the same element
  // and while the cursor rests on a control, so it never slides out from under the pointer
  addEventListener('pointerdown', () => { tilt.press = true; }, true);
  addEventListener('pointerup', () => setTimeout(() => { tilt.press = false; }, 60), true);
  addEventListener('pointerover', (e) => { tilt.over = !!(e.target.closest && e.target.closest('button, input')); }, true);
  (function frame() {
    if (tilt.on && !tilt.press && !tilt.over) {
      tilt.x += (tilt.tx - tilt.x) * 0.07; tilt.y += (tilt.ty - tilt.y) * 0.07;
      deck.style.transform = `rotateY(${(tilt.x * 6).toFixed(3)}deg) rotateX(${(-tilt.y * 4.5).toFixed(3)}deg)`;
      deck.style.setProperty('--gx', (50 + tilt.x * 40).toFixed(1) + '%');
      deck.style.setProperty('--gy', (tilt.y * 40).toFixed(1) + '%');
      world.style.transform = `translate3d(${(-tilt.x * 26).toFixed(2)}px, ${(-tilt.y * 16).toFixed(2)}px, 0)`;
    }
    requestAnimationFrame(frame);
  })();

  // background wall of photos from the deck
  const wall = $('wall');
  const shuffled = (a, r = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wq = shuffled(Q); for (let k = 0; k < 16 * 7; k++) { const i = el('i'); i.style.backgroundImage = `url(${wq[k % wq.length].img})`; wall.append(i); }

  /* ------------------------------------------------------------ menu: rounds picker (sliding glass thumb) */
  const seg = $('seg'), thumb = seg.querySelector('.seg-thumb');
  let rounds = +(store.get('sg-rounds') || 10);
  if (!ROUND_CHOICES.includes(rounds)) rounds = ROUND_CHOICES[0];
  ROUND_CHOICES.forEach((n) => {
    const b = el('button', null, String(n));
    b.type = 'button'; b.setAttribute('role', 'radio');
    b.addEventListener('click', () => { rounds = n; store.set('sg-rounds', n); syncSeg(); });
    seg.append(b);
  });
  function syncSeg() {
    seg.querySelectorAll('button').forEach((b) => {
      const on = +b.textContent === rounds;
      b.setAttribute('aria-checked', on);
      if (on) { thumb.style.left = b.offsetLeft + 'px'; thumb.style.width = b.offsetWidth + 'px'; }
    });
  }
  addEventListener('resize', syncSeg);

  // start preloading the whole bank right away (about 3 MB); the start button waits only for the chosen deck
  const bar = $('preload');
  preloadAll(Q, (f) => { bar.firstElementChild.style.width = (f * 100).toFixed(0) + '%'; if (f >= 1) bar.classList.add('done'); });

  /* ------------------------------------------------------------ game */
  const S = { deck: [], k: 0, score: null, revealed: false, guess: 1, log: [] };
  const screens = { menu: $('menu'), play: $('play'), result: $('result') };
  function show(name) { Object.entries(screens).forEach(([k, e]) => { e.hidden = k !== name; }); if (name === 'menu') requestAnimationFrame(syncSeg); }

  function pickDeck(n) {
    // prefer questions this browser has not seen yet
    let seen = new Set();
    try { seen = new Set(JSON.parse(store.get('sg-seen') || '[]')); } catch (e) { /* ignore */ }
    const ids = Q.map((_, i) => i);
    let fresh = shuffled(ids.filter((i) => !seen.has(i)));
    if (fresh.length < n) { seen = new Set(); fresh = fresh.concat(shuffled(ids.filter((i) => !fresh.includes(i)))); }
    const pick = fresh.slice(0, n);
    pick.forEach((i) => seen.add(i));
    store.set('sg-seen', JSON.stringify([...seen]));
    return pick.map((i) => Q[i]);
  }

  $('start').addEventListener('click', async () => {
    const btn = $('start');
    btn.disabled = true; btn.textContent = 'Loading';
    S.deck = pickDeck(rounds);
    await preloadAll(S.deck);
    btn.disabled = false; btn.textContent = 'Start';
    S.k = -1; S.score = { you: 0, a: 0, b: 0 }; S.log = [];
    show('play');
    nextRound();
  });

  const board = $('board'), stage = $('stage'), svg = $('ruler'), slider = $('slider'), go = $('go'), ans = $('ans');
  let front = $('imgA'), back = $('imgB');

  function renderBoard(target, winners = [], bump = false) {
    target.innerHTML = '';
    PLAYERS.forEach(([k, name, cls]) => {
      const p = el('div', `player ${cls}` + (winners.includes(k) ? ' won' + (bump ? ' bump' : '') : ''));
      p.append(el('span', 'pname', name), el('span', 'pscore', String(S.score[k])));
      target.append(p);
    });
  }

  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  function drawRuler(q) {
    svg.innerHTML = '';
    const [x0, y0] = [q.p0[0] * 960, q.p0[1] * 640], [x1, y1] = [q.p1[0] * 960, q.p1[1] * 640];
    const len = Math.hypot(x1 - x0, y1 - y0);
    svg.append(sv('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'ruler-halo' }));
    const ln = sv('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'ruler-line' });
    ln.style.setProperty('--len', len.toFixed(1));
    svg.append(ln);
    [[x0, y0], [x1, y1]].forEach(([x, y], i) => { const c = sv('circle', { cx: x, cy: y, r: 9, class: 'ruler-end' }); c.style.animationDelay = (i * 0.5) + 's'; svg.append(c); });
  }
  function gtLabel(q) {
    const mx = (q.p0[0] + q.p1[0]) / 2 * 960, my = (q.p0[1] + q.p1[1]) / 2 * 640;
    const txt = fmt(q.gt), w = 22 + txt.length * 13.5, h = 40;
    const x = Math.min(Math.max(mx - w / 2, 8), 960 - w - 8), y = my - h - 18 < 8 ? my + 18 : my - h - 18;
    const g = sv('g', { class: 'gt-label' });
    g.append(sv('rect', { x, y, width: w, height: h, rx: 20 }));
    const t = sv('text', { x: x + w / 2, y: y + 28, 'text-anchor': 'middle' }); t.textContent = txt;
    g.append(t); svg.append(g);
  }

  function showGuess() { S.guess = toVal(slider.value / 1000); $('val').textContent = fmt(S.guess); }
  slider.addEventListener('input', showGuess);

  async function nextRound() {
    S.k += 1; S.revealed = false;
    const q = S.deck[S.k];
    $('roundtag').textContent = `Round ${S.k + 1} of ${S.deck.length}`;
    renderBoard(board);
    ans.innerHTML = '';
    // cross-fade between two stacked images of identical size (all crops are 960 x 640), no layout change
    const im = await preload(q.img);
    back.src = im.src;
    back.style.opacity = 1; front.style.opacity = 0;
    [front, back] = [back, front];
    drawRuler(q);
    $('dstag').textContent = q.dataset;
    $('q').textContent = `How ${WORD[q.dimension] || 'long'} is the ${q.object}?`;
    slider.disabled = false; slider.value = 500; showGuess();
    go.textContent = 'Lock in'; go.disabled = false;
    if (S.k + 1 < S.deck.length) preload(S.deck[S.k + 1].img);
  }

  function reveal() {
    S.revealed = true; slider.disabled = true;
    const q = S.deck[S.k];
    const g = { you: S.guess, a: q.a, b: q.b };
    const best = Math.min(...Object.values(g).map((v) => err(v, q.gt)));
    const winners = Object.keys(g).filter((k) => err(g[k], q.gt) <= best + 1e-9);
    winners.forEach((k) => { S.score[k] += 1; });
    S.log.push({ q, g, winners });
    renderBoard(board, winners, true);
    gtLabel(q);
    const rows = [['gt', 'Truth', 'c-gt', q.gt]].concat(PLAYERS.map(([k, n, c]) => [k, n, c, g[k]]));
    // log axis around the values so a wild guess does not flatten the others
    const lv = rows.map((r) => Math.log(r[3]));
    const lo = Math.min(...lv) - 0.35, hi = Math.max(...lv) + 0.08;
    ans.innerHTML = '';
    const bars = [];
    rows.forEach(([k, n, c, v]) => {
      const name = el('span', `n ${c}` + (winners.includes(k) ? ' win' : ''), n);
      const b = el('span', `bar ${c}`); const i = el('i'); b.append(i); bars.push([i, (Math.log(v) - lo) / (hi - lo)]);
      const val = el('span', 'v', fmt(v));
      if (k !== 'gt') val.append(el('small', null, relErr(v, q.gt)));
      ans.append(name, b, val);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach(([i, f]) => { i.style.width = (f * 100).toFixed(1) + '%'; })));
    go.textContent = S.k + 1 >= S.deck.length ? 'See who won' : 'Next';
  }

  go.addEventListener('click', () => { if (!S.revealed) reveal(); else if (S.k + 1 >= S.deck.length) finish(); else nextRound(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !screens.play.hidden && !go.disabled && document.activeElement !== go) { e.preventDefault(); go.click(); }
  });

  /* ------------------------------------------------------------ end of game */
  function finish() {
    const s = S.score, top = Math.max(s.a, s.b);
    const mean = (k) => Math.exp(S.log.reduce((a, r) => a + err(r.g[k], r.q.gt), 0) / S.log.length) - 1;
    $('rstats').textContent = `Average error: you ${(mean('you') * 100).toFixed(0)}%, Method A ${(mean('a') * 100).toFixed(0)}%, Method B ${(mean('b') * 100).toFixed(0)}%`;
    renderBoard($('board2'), PLAYERS.map(([k]) => k).filter((k) => s[k] === Math.max(s.you, top)));
    $('roundtag').textContent = `${S.deck.length} rounds`;
    if (s.you > top) {
      $('rtitle').textContent = 'You beat both methods!';
      $('rsub').textContent = 'Sharp eyes. Very few people manage that.';
      show('result'); confetti();
    } else if (s.you === top) {
      $('rtitle').textContent = 'A draw!';
      $('rsub').textContent = 'You kept up with the machines. Can you break the tie?';
      show('result');
    } else {
      $('rtitle').textContent = s.a === s.b ? 'Methods A and B tie for the win' : `${s.a > s.b ? 'Method A' : 'Method B'} wins`;
      $('rsub').textContent = 'Size from a single photo is hard. Ours makes it look easy.';
      wasted(`You ${s.you}  ·  Method A ${s.a}  ·  Method B ${s.b}`);
    }
  }

  function wasted(line) {
    const w = $('wasted');
    $('wsub').textContent = line;
    tilt.tx = 0; tilt.ty = 0;
    document.body.classList.add('dying');
    w.hidden = false;
    // restart the CSS animations if this runs twice in a session
    w.querySelectorAll('*').forEach((e) => { e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; });
    w.style.animation = 'none'; void w.offsetWidth; w.style.animation = '';
    setTimeout(() => $('retry').focus(), 3300);
  }
  $('retry').addEventListener('click', () => {
    $('wasted').hidden = true;
    document.body.classList.remove('dying');
    show('result');
  });

  function confetti() {
    const box = $('confetti'); box.innerHTML = '';
    const cols = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10a37f'];
    for (let i = 0; i < 140; i++) {
      const c = el('i');
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.background = cols[i % cols.length];
      c.style.setProperty('--dx', ((Math.random() - 0.5) * 300).toFixed(0) + 'px');
      c.style.setProperty('--rot', ((Math.random() - 0.5) * 1440).toFixed(0) + 'deg');
      c.style.animationDuration = (2.4 + Math.random() * 2.2).toFixed(2) + 's';
      c.style.animationDelay = (Math.random() * 0.6).toFixed(2) + 's';
      box.append(c);
    }
    setTimeout(() => { box.innerHTML = ''; }, 5600);
  }

  $('again').addEventListener('click', () => { $('roundtag').textContent = ''; show('menu'); });

  show('menu');
  syncSeg();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncSeg);
})();
