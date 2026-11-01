// JAWS office walk v3: scroll scrubs pre-rendered Blender frames, one chapter per room, in two cuts: 9:16 ("tall")
// for phones and 16:9 ("wide") for landscape screens. Chapters meet through a warm "step through the door" glow and
// pins ride on 3D anchors projected per frame in Blender.
//
// Embeds anywhere (a Duda HTML widget): it mounts into #jaws-walk, brings its own scoped CSS, pins its stage with
// position: sticky (or by script when a parent clips overflow) and loads frames chapter by chapter: the chapter in
// view first, coarse to fine, then the next one. Nothing loads until the walk is within two screens of the viewport.
//
//   <div id="jaws-walk" data-base="https://<host>/jaws-walk/v3/" data-book="/book"></div>
//   <script src="https://<host>/jaws-walk/v3/walk.js?v=3.0" defer></script>
//
//   data-base        folder with walk-data.js, tall/ and wide/ (default: the folder walk.js comes from)
//   data-book        booking page: every pin and button marked #book goes there (data-doctor, data-procedures alike)
//   data-cuts        "tall,wide" (default) or "tall" when only the phone frames are hosted
//   data-lights      "off" skips the lights-up intro (the first chapter's dark_0001.webp fading into its lit frame)
//   --jw-top (CSS)   height of a site header that stays pinned over the page (default 0px)
//   ?cut=tall|wide   force a cut;  ?w=<px>&dur=<s>  capture mode for the MP4 pipeline (window.__scene)
(() => {
  const root = document.getElementById('jaws-walk');
  if (!root || root.dataset.mounted) return;
  root.dataset.mounted = '1';
  const VER = '3.3';
  const me = document.currentScript;
  const BASE = root.dataset.base || (me && me.src ? me.src.replace(/[^/]*$/, '') : '');
  const params = new URLSearchParams(location.search);
  const CAPTURE = params.has('w');
  const DUR = parseFloat(params.get('dur') || '30');
  const GAP = 0.22;                        // scroll length of a door transition, in chapter units
  const LIGHTS = !CAPTURE && root.dataset.lights !== 'off';
  const LEAD = 0.5;                        // scroll length of the first room's lights-up intro, in chapter units
  const LEAD_ROOM = 0.3;                   // and of every later room's, right after its door
  const LINK = { '#book': root.dataset.book, '#doctor': root.dataset.doctor, '#procedures': root.dataset.procedures };
  const href = (h) => LINK[h || '#book'] || h || '#book';

  const clamp = (x, a = 0, b = 1) => Math.min(Math.max(x, a), b);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------------------------------------------------------------- markup + scoped style
  const css = `
#jaws-walk{--gold:#C9A24B;--gold-lt:#E7C980;--gold-rgb:201,162,75;--ink:#0A0A0A;--jw-serif:"Bodoni MT","Bodoni Moda",Didot,"Bodoni 72",Georgia,serif;
 --jw-sans:"Gill Sans MT","Gill Sans","Segoe UI",sans-serif}
#jaws-walk#jaws-walk{position:relative;background:var(--ink);color:#fff;font-family:var(--jw-sans)}
#jaws-walk#jaws-walk *,#jaws-walk#jaws-walk *::before,#jaws-walk#jaws-walk *::after{box-sizing:border-box}
#jaws-walk#jaws-walk .jw-track{position:relative}
#jaws-walk#jaws-walk .jw-stage{position:sticky;top:var(--jw-top,0px);height:calc(100vh - var(--jw-top,0px));height:calc(100dvh - var(--jw-top,0px));
 overflow:hidden;container-type:size;background:var(--ink)}
#jaws-walk#jaws-walk .jw-stage.jw-manual{position:absolute;left:0;right:0;top:0;will-change:transform}
#jaws-walk#jaws-walk.jw-capture .jw-stage{position:fixed;inset:0;height:100vh;transform:none}
#jaws-walk#jaws-walk canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#jaws-walk#jaws-walk .jw-scrim{position:absolute;inset:auto 0 0 0;height:55%;pointer-events:none;
 background:linear-gradient(to top,rgba(10,10,10,.72),rgba(10,10,10,.35) 45%,rgba(10,10,10,0))}
#jaws-walk#jaws-walk .jw-cap{position:absolute;left:clamp(18px,5vw,72px);right:clamp(18px,5vw,72px);bottom:clamp(56px,11vh,140px);
 left:clamp(18px,5cqw,72px);right:clamp(18px,5cqw,72px);bottom:clamp(56px,11cqh,140px);opacity:0;pointer-events:none;margin:0;padding:0}
#jaws-walk#jaws-walk .jw-cap.live{pointer-events:auto}
#jaws-walk#jaws-walk .jw-eyebrow{font:600 clamp(11px,1.35vw,15px)/1.2 var(--jw-sans);font-size:clamp(11px,1.35cqw,15px);letter-spacing:.26em;
 text-transform:uppercase;color:var(--gold-lt);margin:0 0 .9em}
#jaws-walk#jaws-walk .jw-en{font:700 clamp(38px,6.4vw,100px)/.98 var(--jw-serif);font-size:clamp(38px,6.4cqw,100px);margin:0;max-width:14ch;
 color:#fff;letter-spacing:0;text-transform:none;text-shadow:0 2px 24px rgba(0,0,0,.35)}
#jaws-walk#jaws-walk .jw-es{font:italic 400 clamp(21px,3vw,44px)/1.1 var(--jw-serif);font-size:clamp(21px,3cqw,44px);color:var(--gold);margin:.35em 0 0}
#jaws-walk#jaws-walk .jw-btn{display:inline-block;margin-top:1.2em;font:700 clamp(13px,1.4vw,16px)/1 var(--jw-sans);letter-spacing:.14em;
 text-transform:uppercase;color:var(--btn-ink,var(--ink));text-decoration:none;padding:1.1em 1.6em;border-radius:999px;
 background:var(--btn-bg,linear-gradient(180deg,#F0D894,var(--gold) 55%,#A9832F));box-shadow:var(--btn-glow,0 0 34px rgba(var(--gold-rgb),.45))}
#jaws-walk#jaws-walk .jw-pin{position:absolute;left:0;top:0;opacity:0;display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;
 font:600 12px/1 var(--jw-sans);letter-spacing:.2em;text-transform:uppercase;white-space:nowrap;z-index:2;pointer-events:none}
#jaws-walk#jaws-walk .jw-pin.flip{flex-direction:row-reverse}
#jaws-walk#jaws-walk .jw-pin i{position:relative;width:14px;height:14px;border-radius:50%;background:var(--gold);
 box-shadow:0 0 0 4px rgba(var(--gold-rgb),.28),0 0 18px var(--gold)}
#jaws-walk#jaws-walk .jw-pin i::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:1px solid var(--gold-lt);animation:jw-ping 2s ease-out infinite}
#jaws-walk#jaws-walk .jw-pin span{padding:.7em .95em;border-radius:999px;background:rgba(10,10,10,.55);-webkit-backdrop-filter:blur(6px);
 backdrop-filter:blur(6px);border:1px solid rgba(var(--gold-rgb),.6);white-space:normal;line-height:1.15}
#jaws-walk#jaws-walk .jw-pin i{flex:none}
@keyframes jw-ping{from{transform:scale(.6);opacity:1}to{transform:scale(1.9);opacity:0}}
#jaws-walk#jaws-walk .jw-rooms{position:absolute;right:clamp(10px,2vw,22px);top:50%;transform:translateY(-50%);display:grid;gap:10px;z-index:2}
#jaws-walk#jaws-walk .jw-rooms b{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.35);transition:background .3s,transform .3s}
#jaws-walk#jaws-walk .jw-rooms b.on{background:var(--gold);transform:scale(1.4)}
#jaws-walk#jaws-walk .jw-bar{position:absolute;left:0;bottom:0;height:2px;width:0;background:var(--gold);box-shadow:0 0 10px var(--gold)}
#jaws-walk#jaws-walk .jw-loader{position:absolute;inset:0;display:grid;place-items:center;background:var(--ink);z-index:5;
 font:600 12px/1 var(--jw-sans);letter-spacing:.3em;text-transform:uppercase;color:var(--gold-lt);transition:opacity .6s}
#jaws-walk#jaws-walk .jw-skip{position:absolute;left:12px;top:12px;z-index:6;padding:.8em 1.1em;border-radius:999px;background:var(--ink);
 color:var(--gold-lt);font:600 12px/1 var(--jw-sans);letter-spacing:.14em;text-transform:uppercase;text-decoration:none;
 transform:translateY(-200%)}
#jaws-walk#jaws-walk .jw-skip:focus{transform:none}
@media (prefers-reduced-motion:reduce){#jaws-walk#jaws-walk .jw-pin i::after{animation:none}}`;
  if (!document.getElementById('jaws-walk-css')) {
    const st = document.createElement('style');
    st.id = 'jaws-walk-css';
    st.textContent = css;
    document.head.appendChild(st);
  }
  root.innerHTML = '<a class="jw-skip" href="#jaws-walk-end">Skip the office tour</a><div class="jw-track"><div class="jw-stage">' +
    '<canvas aria-hidden="true"></canvas><div class="jw-scrim"></div><div class="jw-rooms" aria-hidden="true"></div>' +
    '<div class="jw-caps"></div><div class="jw-pins"></div><div class="jw-bar"></div>' +
    '<div class="jw-loader"><span>Opening the doors · <span class="jw-pct">0</span>%</span></div></div></div>' +
    '<div id="jaws-walk-end"></div>';
  const $ = (s) => root.querySelector(s);
  const track = $('.jw-track'), stage = $('.jw-stage'), canvas = $('canvas'), bar = $('.jw-bar');
  const ctx = canvas.getContext('2d');
  const blur = document.createElement('canvas');      // tiny copy of a frame, scaled back up = a cheap, portable blur
  const bctx = blur.getContext('2d');
  if (CAPTURE) root.classList.add('jw-capture');

  let D, N = 0, segs = [], total = 1;
  let cut = 'tall', W = 1, H = 1, top = 0, manual = false;
  let shown = 0, target = 0, dirty = true, curCh = 0, live = false, started = false;
  const got = {}, asked = {}, ptr = {}, order = {}, fails = {}, oks = {}, failed = {};
  let pinEls = [], capEls = [], dots = [];

  // ---------------------------------------------------------------- frames
  const aspect = (c) => D.cuts[c].w / D.cuts[c].h;
  const cuts = () => (root.dataset.cuts || 'tall,wide').split(',').map((s) => s.trim()).filter((c) => D.cuts[c] && !failed[c]);
  function pickCut() {                    // the cut whose shape is closest to the stage's
    const f = params.get('cut');
    if (f && D.cuts[f]) return f;
    const a = W / H, ok = cuts();
    if (!ok.length) return 'tall';
    return ok.reduce((b, c) => (Math.abs(Math.log(a / aspect(c))) < Math.abs(Math.log(a / aspect(b))) - 1e-9 ? c : b));
  }
  const url = (c, ci, k) => `${BASE}${c}/${D.chapters[ci].id}/f_${String(D.chapters[ci].keep[c][k]).padStart(4, '0')}.webp` +
    (D.build ? `?b=${D.build}` : '');

  function coarseToFine(n) {              // 0, last, then every 8th, 4th, 2nd, rest: a chapter scrubs early, sharpens later
    const seen = new Set(), out = [];
    const add = (k) => { if (k >= 0 && k < n && !seen.has(k)) { seen.add(k); out.push(k); } };
    add(0); add(n - 1);
    for (const s of [8, 4, 2, 1]) for (let k = 0; k < n; k += s) add(k);
    return out;
  }
  function slot(c, ci) {
    const key = `${c}/${ci}`;
    if (!order[key]) {
      const K = D.chapters[ci].keep[c] || [];
      order[key] = coarseToFine(K.length);
      got[key] = new Array(K.length);
      asked[key] = new Uint8Array(K.length);
      ptr[key] = 0;
    }
    return key;
  }

  const cutFor = (ci) => ((D.chapters[ci].keep[cut] || []).length ? cut : 'tall');   // a chapter missing from a cut
  let inflight = 0;
  const MAXQ = 6;
  function nextJob() {
    if (CAPTURE) {
      for (let ci = 0; ci < N; ci++) { const j = jobIn(cut, ci); if (j) return j; }
      return null;
    }
    for (const ci of [curCh, curCh + 1, curCh - 1]) {   // the chapter in view, the next one, the one behind
      if (ci < 0 || ci >= N) continue;
      const j = jobIn(cutFor(ci), ci);
      if (j) return j;
    }
    return null;
  }
  function jobIn(c, ci) {
    const key = slot(c, ci), o = order[key];
    while (ptr[key] < o.length && asked[key][o[ptr[key]]]) ptr[key]++;
    return ptr[key] < o.length ? [c, ci, o[ptr[key]], key] : null;
  }
  function pump() {
    if (!started) return;
    while (inflight < MAXQ) {
      const j = nextJob();
      if (!j) return;
      const [c, ci, k, key] = j;
      asked[key][k] = 1;
      inflight++;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        inflight--;
        oks[c] = (oks[c] || 0) + 1;
        got[key][k] = im;
        if (ci === curCh || ci === curCh + 1) dirty = true;
        loaded(c, ci);
        pump();
      };
      im.onerror = () => {
        inflight--;
        fails[c] = (fails[c] || 0) + 1;
        if (!oks[c] && fails[c] >= 6 && c !== 'tall') {   // that cut isn't hosted: fall back to the phone frames
          failed[c] = true;
          retune();
        }
        pump();
      };
      im.src = url(c, ci, k);
    }
  }

  function nearest(c, ci, p) {            // closest loaded kept frame of chapter ci at local progress p
    const C = D.chapters[ci], K = C.keep[c];
    if (!K) return null;
    const key = slot(c, ci), list = got[key];
    const f = 1 + clamp(p) * (C.frames - 1);
    let lo = 0, hi = K.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (K[m] <= f) lo = m; else hi = m; }
    const k = f - K[lo] <= K[hi] - f ? lo : hi;
    for (let d = 0; d < K.length; d++) {
      if (list[k - d]) return { img: list[k - d], c, k: k - d };
      if (list[k + d]) return { img: list[k + d], c, k: k + d };
    }
    return null;
  }
  function frameAt(ci, p) {
    let fr = nearest(cut, ci, p);
    if (!fr) for (const c of Object.keys(D.cuts)) if (c !== cut && (fr = nearest(c, ci, p))) break;
    return fr;
  }

  // ---------------------------------------------------------------- drawing
  function fitRect(img) {                 // cover when it keeps 70% of the frame, else the whole frame (contain)
    const iw = img.naturalWidth, ih = img.naturalHeight, cw = canvas.width, ch = canvas.height;
    const a = cw / ch, fa = iw / ih;
    const cover = Math.min(a / fa, fa / a) >= 0.7;
    const s = (cover ? Math.max : Math.min)(cw / iw, ch / ih);
    return { x: (cw - iw * s) / 2, y: (ch - ih * s) / 2, w: iw * s, h: ih * s, cover };
  }
  function paint(img, alpha) {
    const r = fitRect(img), cw = canvas.width, ch = canvas.height;
    ctx.globalAlpha = alpha;
    if (!r.cover) {                       // wide-screen backup: blurred, darkened copy of the frame behind it
      const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(cw / iw, ch / ih);
      blur.width = Math.max(4, Math.round(24 * iw / Math.max(iw, ih)));
      blur.height = Math.max(4, Math.round(24 * ih / Math.max(iw, ih)));
      bctx.drawImage(img, 0, 0, blur.width, blur.height);
      ctx.drawImage(blur, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
      ctx.fillStyle = 'rgba(10,10,10,.58)';
      ctx.fillRect(0, 0, cw, ch);
    }
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    ctx.globalAlpha = 1;
    return r;
  }

  function layout() {                     // scroll timeline: lights up, chapter, door, lights up, chapter, door, ...
    segs = [];
    let t = 0;
    D.chapters.forEach((ch, i) => {
      if (LIGHTS) {
        const len = i ? LEAD_ROOM : LEAD;
        segs.push({ kind: 'lead', i, a: t, b: t + len });
        t += len;
      }
      segs.push({ kind: 'ch', i, a: t, b: t + ch.scroll });
      t += ch.scroll;
      if (i < N - 1) { segs.push({ kind: 'door', i, a: t, b: t + GAP }); t += GAP; }
    });
    total = t;
    track.style.height = `${Math.round(t * 120 + 100)}vh`;
  }

  function where(u) {
    const T = u * total;
    const s = segs.find((g) => T <= g.b) || segs[segs.length - 1];
    const k = clamp((T - s.a) / (s.b - s.a));
    const cur = s.kind === 'door' ? (k < 0.5 ? s.i : s.i + 1) : s.i;
    return { s, k, cur };
  }

  const dark = {};                        // lights-off render of each room's first frame: dark[chapter][cut], null if missing
  function darkFor(ci, c) {
    if (!LIGHTS || ci < 0 || ci >= N) return null;
    const m = dark[ci] || (dark[ci] = {});
    if (!(c in m)) {
      m[c] = null;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { m[c] = im; dirty = true; };
      im.src = `${BASE}${c}/${D.chapters[ci].id}/dark_0001.webp` + (D.build ? `?b=${D.build}` : '');
    }
    return m[c];
  }
  function ahead() {                      // the room you're in and the next one, so a dark room is ready at its door
    darkFor(curCh, cutFor(curCh));
    darkFor(curCh + 1, cutFor(Math.min(curCh + 1, N - 1)));
  }

  function draw(u) {                      // u = 0..1 over the whole walk
    const { s, k, cur } = where(u);
    const door = s.kind === 'door', lead = s.kind === 'lead';
    const a = frameAt(s.i, door ? 1 : lead ? 0 : k);
    if (!a) return false;
    ctx.globalCompositeOperation = 'source-over';
    const r = paint(a.img, 1);
    const dk = lead && darkFor(s.i, a.c);
    if (dk) paint(dk, 1 - smooth(0.12, 0.9, k));   // the camera holds while the lights come up
    if (door) {
      const b = frameAt(s.i + 1, 0);
      const bd = b && darkFor(s.i + 1, b.c);         // through the door, the next room waits in the dark
      if (b) paint(bd || b.img, smooth(0.25, 0.75, k));
      ctx.globalAlpha = (bd ? 0.15 : 0.62) * Math.sin(Math.PI * k);   // a softer glow when the next room is dark
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#fff1d6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    const local = door ? (k < 0.5 ? 1 : 0) : lead ? 0 : k;
    captions(cur, local, door ? Math.sin(Math.PI * k) : 0);
    pins(cur, local, a, r, door);
    dots.forEach((d, i) => d.classList.toggle('on', i === cur));
    bar.style.width = `${(u * 100).toFixed(2)}%`;
    return true;
  }

  function show(el, on) {                 // keep invisible links out of the tab order
    if (el._on === on) return;
    el._on = on;
    el.classList.toggle('live', on);
    el.style.pointerEvents = on ? 'auto' : 'none';
    el.tabIndex = on ? 0 : -1;
  }

  function captions(ci, p, dim) {
    for (const el of capEls) {
      const a = +el.dataset.in, b = +el.dataset.out;
      const op = +el.dataset.ch === ci ? (a < 0 ? 1 : smooth(a, a + 0.08, p)) * (1 - smooth(b, b + 0.08, p)) * (1 - dim) : 0;
      el.style.opacity = op.toFixed(3);
      el.style.transform = `translateY(${((1 - op) * 16).toFixed(1)}px)`;
      el.classList.toggle('live', op > 0.5);
      const btn = el.querySelector('a');
      if (btn) show(btn, op > 0.5);
    }
  }

  function pins(ci, p, fr, r, hide) {
    const k = W / canvas.width;
    for (const el of pinEls) {
      const sp = +el.dataset.ch === ci ? D.chapters[ci].spots[fr.c] : null;
      const s = sp && sp[el.dataset.anchor] ? sp[el.dataset.anchor][fr.k] : null;
      let op = 0;
      if (s) {
        const x = (r.x + s[0] * r.w) * k, y = (r.y + s[1] * r.h) * k;
        const inside = x > 8 && x < W - 8 && y > 8 && y < H - 8;   // cover crops the frame's edges
        if (s[2] && inside && !hide) op = smooth(+el.dataset.in, +el.dataset.in + 0.05, p) * (1 - smooth(+el.dataset.out, +el.dataset.out + 0.05, p));
        if (!el._w) { el.style.maxWidth = 'none'; el._w = el.offsetWidth; }
        const roomR = W - x - 1, roomL = x - 1;          // the label goes where it fits, wrapping if neither side does
        const flip = el._w <= roomR ? x > W * 0.55 && el._w <= roomL : roomL > roomR;
        el.style.maxWidth = `${Math.round(Math.max(90, flip ? roomL : roomR))}px`;
        el.classList.toggle('flip', flip);
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${flip ? 'calc(-100% + 7px)' : '-7px'}, -50%)`;
      }
      el.style.opacity = op.toFixed(3);
      show(el, op > 0.5);
    }
  }

  function build() {
    const caps = $('.jw-caps'), pinBox = $('.jw-pins'), nav = $('.jw-rooms');
    D.chapters.forEach((ch, ci) => {
      dots.push(nav.appendChild(document.createElement('b')));
      (ch.caps || []).forEach((c) => {
        const el = document.createElement('div');
        el.className = 'jw-cap';
        Object.assign(el.dataset, { ch: ci, in: c.in, out: c.out });
        el.innerHTML = `<p class="jw-eyebrow">${esc(c.eyebrow)}</p><h2 class="jw-en">${esc(c.en)}</h2><p class="jw-es" lang="es">${esc(c.es)}</p>` +
          (c.cta ? `<a class="jw-btn" href="${esc(href(c.href))}" tabindex="-1">${esc(c.cta)}</a>` : '');
        capEls.push(caps.appendChild(el));
      });
      (ch.pins || []).forEach((q) => {
        const el = document.createElement('a');
        el.className = 'jw-pin';
        el.href = href(q.href);
        el.tabIndex = -1;
        Object.assign(el.dataset, { ch: ci, anchor: q.anchor, in: q.in, out: q.out });
        el.innerHTML = `<i></i><span>${esc(q.label)}</span>`;
        pinEls.push(pinBox.appendChild(el));
      });
    });
  }

  // ---------------------------------------------------------------- size, pinning, scroll
  function resize() {
    W = Math.max(1, stage.clientWidth);
    H = Math.max(1, stage.clientHeight);
    const dpr = CAPTURE ? 1 : Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    top = parseFloat(getComputedStyle(root).getPropertyValue('--jw-top')) || 0;
    if (D) retune();
    dirty = true;
  }
  function retune() {                     // landscape gets the 16:9 frames, portrait the 9:16 ones
    const c = pickCut();
    if (c !== cut) { cut = c; dirty = true; pump(); }
  }

  function progress() {
    const r = track.getBoundingClientRect();
    const span = r.height - H;
    const y = clamp(top - r.top, 0, Math.max(0, span));
    if (!manual && y > 20 && y < span - 20) {   // sticky failed (a parent clips overflow): pin the stage by script
      const st = stage.getBoundingClientRect();
      if (Math.abs(st.top - top) > 4) { manual = true; stage.classList.add('jw-manual'); }
    }
    if (manual) stage.style.transform = `translateY(${y.toFixed(1)}px)`;
    return span > 0 ? y / span : 0;
  }

  let looping = false;
  function loop() { if (!looping) { looping = true; requestAnimationFrame(tick); } }
  function tick() {
    if (!live) { looping = false; return; }
    target = progress();
    const { cur } = where(target);
    if (cur !== curCh) { curCh = cur; ahead(); pump(); }
    const d = target - shown;
    if (Math.abs(d) > 1e-5 || dirty) {
      shown = Math.abs(d) < 1e-5 ? target : shown + d * 0.12;
      if (draw(shown)) dirty = false;
    }
    requestAnimationFrame(tick);
  }

  let loaderGone = false;
  function loaded(c, ci) {                // the loader waits for the coarse pass of the chapter in view
    if (loaderGone || CAPTURE || c !== cutFor(ci) || ci !== curCh) return;
    const key = slot(c, ci), K = got[key].length;
    const need = Math.min(K, 2 + Math.ceil(K / 8));
    const have = order[key].slice(0, need).filter((k) => got[key][k]).length;
    $('.jw-pct').textContent = Math.round((have / need) * 100);
    if (have >= need) {
      loaderGone = true;
      const l = $('.jw-loader');
      l.style.opacity = 0;
      setTimeout(() => l.remove(), 700);
    }
  }

  function start() {                      // first frames go out once the walk is near the viewport
    if (started) return;
    started = true;
    target = shown = progress();
    curCh = where(target).cur;
    ahead();
    pump();
  }

  async function init() {
    resize();
    D = window.JAWS_WALK_DATA || await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = `${BASE}walk-data.js?v=${VER}`;
      s.onload = () => res(window.JAWS_WALK_DATA);
      s.onerror = () => rej(new Error(`walk-data.js not found at ${s.src}`));
      document.head.appendChild(s);
    });
    N = D.chapters.length;
    build();
    layout();
    resize();
    cut = pickCut();
    if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(stage);
    else addEventListener('resize', resize);

    if (CAPTURE) {
      started = true;
      pump();
      await new Promise((res) => {
        const t = setInterval(() => {
          const all = D.chapters.every((ch, ci) => got[slot(cut, ci)].every(Boolean));
          if (all && !inflight) { clearInterval(t); res(); }
        }, 200);
      });
      $('.jw-loader').remove();
      let state = 0;
      window.__scene = { ready: true, setState(t) { state = clamp(t / DUR); }, render() { draw(state); } };
      return;
    }
    new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) start(); },
      { rootMargin: '200% 0px 200% 0px' }).observe(track);
    new IntersectionObserver((es) => {     // the draw loop only runs while the walk is on screen
      live = es[es.length - 1].isIntersecting;
      if (live) { dirty = true; loop(); }
    }).observe(track);
    setTimeout(() => {                     // no observer callback yet (some in-app browsers): check by hand
      const r = track.getBoundingClientRect();
      if (r.top < innerHeight * 3 && r.bottom > -innerHeight * 2) start();
    }, 1500);
  }

  // debugging and verification hooks
  window.__jawsWalk = {
    seek(u) {
      shown = target = clamp(u);
      const c = where(shown).cur;
      if (c !== curCh) { curCh = c; ahead(); pump(); }
      dirty = true;
      draw(shown);
      return this.state();
    },
    pins() {
      return pinEls.map((el) => ({ label: el.textContent, href: el.getAttribute('href'), op: +el.style.opacity,
        at: el.style.transform.split(') ')[0] + ')' }));
    },
    state() {
      const w = D ? where(shown) : null;
      const fr = w ? frameAt(w.s.i, w.s.kind === 'door' ? 1 : w.s.kind === 'lead' ? 0 : w.k) : null;
      return { cut, W, H, canvas: [canvas.width, canvas.height], manual, started, live, inflight,
        chapter: D ? D.chapters[curCh].id : null, shown: +shown.toFixed(4),
        frame: fr ? fr.img.src.split('/').slice(-3).join('/') : null,
        loaded: Object.fromEntries(Object.entries(got).map(([k, v]) => [k, v.filter(Boolean).length + '/' + v.length])) };
    },
  };
  init().catch((e) => { window.__jawsWalkError = String(e); console.error('[jaws-walk]', e); });
})();
