// JAWS office walk v4: scroll scrubs pre-rendered Blender frames, one chapter per room, in two cuts: 9:16 ("tall")
// for phones and 16:9 ("wide") for landscape screens. Chapters meet through a warm "step through the door" glow and
// pins ride on 3D anchors projected per frame in Blender.
//
// v4 upgrades:
//   - Lazy two-frame approach preload (Chapter 0 frame 0 + dark_0001.webp within 35% rootMargin; full pump only when live/seek/capture)
//   - Static 6-Room Architectural Tour mode for prefers-reduced-motion: reduce and Save-Data / 2g connections
//   - iOS Safari svh track height with vh fallback + 'jaws-walk:ready' custom event
//   - Interactive smoked-glass Room Switcher HUD, visible Skip tour pill, warm vignette, adjacent-frame blending,
//     opt-in pure Web Audio API sanctuary soundscape, and Duda preview URL rewriting
//
//   <div id="jaws-walk" data-base="https://<host>/jaws-walk/" data-book="/booking" data-doctor="#doctor" data-procedures="#procedures" data-pace="0.7"></div>
//   <script src="https://<host>/jaws-walk/walk-v4.js?v=4.0" defer></script>
(() => {
  const root = document.getElementById('jaws-walk');
  if (!root || root.dataset.mounted) return;
  root.dataset.mounted = '1';

  const VER = '4.0';
  const me = document.currentScript;
  const rawBase = root.dataset.base || (me && me.src ? me.src.replace(/[^/]*$/, '') : '');
  const BASE = rawBase && !rawBase.endsWith('/') ? `${rawBase}/` : rawBase;
  const params = new URLSearchParams(location.search);
  const CAPTURE = params.has('w');
  const DUR = parseFloat(params.get('dur') || '30');
  const GAP = 0.22;                        // scroll length of a door transition, in chapter units
  const LIGHTS = !CAPTURE && root.dataset.lights !== 'off';
  const LEAD = 0.5;                        // scroll length of the first room's lights-up intro, in chapter units
  const LEAD_ROOM = 0.3;                   // and of every later room's, right after its door
  const PACE = Math.min(1.5, Math.max(0.4, parseFloat(root.dataset.pace) || 1));

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = !!(navigator.connection && (navigator.connection.saveData || /(2g|slow-2g)/.test(navigator.connection.effectiveType || ''))) ||
    !!(conn && (conn.saveData || /(2g|slow-2g)/.test(conn.effectiveType || '')));
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const STATIC_MODE = (reduce || saveData) && !CAPTURE;

  const previewMatch = location.pathname.match(/^\/site\/[^/]+/);
  const previewQ = params.get('preview') === 'true' || location.search.indexOf('preview=true') > -1 ? '?preview=true' : '';
  const LINK = { '#book': root.dataset.book, '#doctor': root.dataset.doctor, '#procedures': root.dataset.procedures };

  const clamp = (x, a = 0, b = 1) => Math.min(Math.max(x, a), b);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeHref = (u) => {
    const s = String(u || '#book').trim();
    return /^\s*(?:javascript|data|vbscript):/i.test(s) ? '#book' : s;
  };
  const rewritePreview = (u) => {
    if (!previewMatch || !u || u[0] !== '/' || u[1] === '/' || u.indexOf('/site/') === 0) return u;
    const hashIdx = u.indexOf('#');
    const hash = hashIdx > -1 ? u.slice(hashIdx) : '';
    let pathAndQuery = hashIdx > -1 ? u.slice(0, hashIdx) : u;
    if (previewQ && !/(?:\?|&)preview=true(?:&|$)/.test(pathAndQuery)) {
      pathAndQuery += (pathAndQuery.indexOf('?') > -1 ? '&' : '?') + 'preview=true';
    }
    return previewMatch[0] + pathAndQuery + hash;
  };
  const href = (h) => rewritePreview(safeHref(LINK[h || '#book'] || h || '#book'));

  const ROOM_META = {
    c1_lounge: { hud: 'Lounge', tab: '01 Lounge' },
    c2_hall: { hud: 'Reception', tab: '02 Reception' },
    c3_exam_b: { hud: 'Exam', tab: '03 Exam Suite' },
    c4_exam_a: { hud: 'Consult', tab: '04 Consult' },
    c5_sterile: { hud: 'Sterile', tab: '05 Sterile' },
    c6_procedure: { hud: 'Suite', tab: '06 Surgical Suite' },
  };
  const ROOM_FALLBACK_HUD = ['Lounge', 'Reception', 'Exam', 'Consult', 'Sterile', 'Suite'];
  const ROOM_FALLBACK_TAB = ['01 Lounge', '02 Reception', '03 Exam Suite', '04 Consult', '05 Sterile', '06 Surgical Suite'];
  const roomHudLabel = (ch, i) => (ROOM_META[ch.id] && ROOM_META[ch.id].hud) || ROOM_FALLBACK_HUD[i] || `Room ${i + 1}`;
  const roomTabLabel = (ch, i) => (ROOM_META[ch.id] && ROOM_META[ch.id].tab) || ROOM_FALLBACK_TAB[i] || `${String(i + 1).padStart(2, '0')} Room`;

  // ---------------------------------------------------------------- scoped style
  const css = `
#jaws-walk{--gold:#C9A24B;--gold-lt:#E7C980;--gold-rgb:201,162,75;--ink:#0A0A0A;--jw-serif:"Bodoni MT","Bodoni Moda",Didot,"Bodoni 72",Georgia,serif;
 --jw-sans:"Gill Sans MT","Gill Sans","Segoe UI",sans-serif}
#jaws-walk#jaws-walk{position:relative;background:var(--ink);color:#fff;font-family:var(--jw-sans)}
#jaws-walk#jaws-walk *,#jaws-walk#jaws-walk *::before,#jaws-walk#jaws-walk *::after{box-sizing:border-box}
#jaws-walk#jaws-walk .jw-track{position:relative}
#jaws-walk#jaws-walk .jw-stage{position:sticky;top:var(--jw-top,0px);height:calc(100vh - var(--jw-top,0px));height:calc(100svh - var(--jw-top,0px));
 overflow:hidden;container-type:size;background:var(--ink)}
#jaws-walk#jaws-walk .jw-stage.jw-manual{position:absolute;left:0;right:0;top:0;will-change:transform}
#jaws-walk#jaws-walk.jw-capture .jw-stage{position:fixed;inset:0;height:100vh;transform:none}
#jaws-walk#jaws-walk.jw-capture .jw-skip-pill,#jaws-walk#jaws-walk.jw-capture .jw-sound{display:none}
#jaws-walk#jaws-walk canvas{position:absolute;inset:0;width:100%;height:100%;display:block;filter:saturate(.94) contrast(1.05) sepia(.08)}
#jaws-walk#jaws-walk .jw-vignette{position:absolute;inset:0;z-index:1;pointer-events:none;
 background:radial-gradient(ellipse 88% 82% at 50% 44%,rgba(var(--gold-rgb),.06) 0%,rgba(22,18,14,.18) 68%,rgba(10,9,8,.58) 100%)}
#jaws-walk#jaws-walk .jw-scrim{position:absolute;inset:auto 0 0 0;height:56%;z-index:1;pointer-events:none;
 background:linear-gradient(to top,rgba(10,10,10,.76),rgba(10,10,10,.36) 46%,rgba(10,10,10,0))}
#jaws-walk#jaws-walk .jw-caps{position:absolute;inset:0;z-index:2;pointer-events:none}
#jaws-walk#jaws-walk .jw-pins{position:absolute;inset:0;z-index:3;pointer-events:none}
#jaws-walk#jaws-walk .jw-cap{position:absolute;left:clamp(18px,5vw,72px);right:clamp(18px,5vw,72px);bottom:clamp(74px,12.5vh,146px);
 left:clamp(18px,5cqw,72px);right:clamp(18px,5cqw,72px);bottom:clamp(74px,12.5cqh,146px);opacity:0;pointer-events:none;margin:0;padding:0}
#jaws-walk#jaws-walk .jw-cap.live{pointer-events:auto}
#jaws-walk#jaws-walk .jw-eyebrow{font:600 clamp(11px,1.35vw,15px)/1.2 var(--jw-sans);font-size:clamp(11px,1.35cqw,15px);letter-spacing:.26em;
 text-transform:uppercase;color:var(--gold-lt);margin:0 0 .9em}
#jaws-walk#jaws-walk .jw-en{font:700 clamp(36px,6.2vw,96px)/.98 var(--jw-serif);font-size:clamp(36px,6.2cqw,96px);margin:0;max-width:14ch;
 color:#fff;letter-spacing:0;text-transform:none;text-shadow:0 2px 24px rgba(0,0,0,.38)}
#jaws-walk#jaws-walk .jw-es{font:italic 400 clamp(20px,2.9vw,42px)/1.12 var(--jw-serif);font-size:clamp(20px,2.9cqw,42px);color:var(--gold);margin:.35em 0 0}
#jaws-walk#jaws-walk .jw-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:1.2em;font:700 clamp(12px,1.35vw,15px)/1 var(--jw-sans);
 letter-spacing:.14em;text-transform:uppercase;color:var(--btn-ink,var(--ink));text-decoration:none;padding:1.08em 1.65em;border-radius:999px;
 background:var(--btn-bg,linear-gradient(180deg,#F0D894,var(--gold) 55%,#A9832F));box-shadow:var(--btn-glow,0 0 34px rgba(var(--gold-rgb),.45))}
#jaws-walk#jaws-walk .jw-pin{position:absolute;left:0;top:0;opacity:0;display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;
 font:600 12px/1 var(--jw-sans);letter-spacing:.2em;text-transform:uppercase;white-space:nowrap;z-index:3;pointer-events:none}
#jaws-walk#jaws-walk .jw-pin.flip{flex-direction:row-reverse}
#jaws-walk#jaws-walk .jw-pin i{position:relative;flex:none;width:14px;height:14px;border-radius:50%;background:var(--gold);
 box-shadow:0 0 0 4px rgba(var(--gold-rgb),.28),0 0 18px var(--gold)}
#jaws-walk#jaws-walk .jw-pin i::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:1px solid var(--gold-lt);animation:jw-ping 2s ease-out infinite}
#jaws-walk#jaws-walk .jw-pin span{padding:.7em .95em;border-radius:999px;background:rgba(10,10,10,.58);-webkit-backdrop-filter:blur(6px);
 backdrop-filter:blur(6px);border:1px solid rgba(var(--gold-rgb),.6);white-space:normal;line-height:1.15}
@keyframes jw-ping{from{transform:scale(.6);opacity:1}to{transform:scale(1.9);opacity:0}}
#jaws-walk#jaws-walk .jw-rooms{position:absolute;left:50%;bottom:clamp(14px,2.2vh,22px);transform:translateX(-50%);z-index:4;
 display:flex;align-items:center;gap:4px;padding:4px;max-width:calc(100% - 24px);overflow-x:auto;scrollbar-width:none;border-radius:999px;
 background:rgba(18,17,16,.62);-webkit-backdrop-filter:blur(14px) saturate(145%);backdrop-filter:blur(14px) saturate(145%);
 border:1px solid rgba(var(--gold-rgb),.3);box-shadow:0 14px 36px rgba(0,0,0,.44)}
#jaws-walk#jaws-walk .jw-rooms::-webkit-scrollbar{display:none}
#jaws-walk#jaws-walk .jw-room{appearance:none;border:0;background:transparent;color:rgba(244,239,231,.82);font:500 11.5px/1 var(--jw-sans);
 letter-spacing:.09em;text-transform:uppercase;padding:9px 13px;min-height:34px;border-radius:999px;cursor:pointer;white-space:nowrap;flex:0 0 auto;
 transition:color .25s ease,background .25s ease,box-shadow .25s ease}
#jaws-walk#jaws-walk .jw-room:hover{color:#FFF6DE;background:rgba(255,255,255,.08)}
#jaws-walk#jaws-walk .jw-room.on{color:#1B1A19;font-weight:700;background:linear-gradient(180deg,#F4DFA8,var(--gold) 58%,#A9832F);
 box-shadow:0 0 18px rgba(var(--gold-rgb),.42)}
#jaws-walk#jaws-walk .jw-skip-pill,#jaws-walk#jaws-walk .jw-sound{position:absolute;top:clamp(12px,2vh,20px);z-index:4;display:inline-flex;align-items:center;
 gap:7px;min-height:36px;padding:0 15px;border-radius:999px;font:500 11.5px/1 var(--jw-sans);letter-spacing:.12em;text-transform:uppercase;
 text-decoration:none;color:#F6EEDF;background:rgba(18,17,16,.58);-webkit-backdrop-filter:blur(12px) saturate(140%);
 backdrop-filter:blur(12px) saturate(140%);border:1px solid rgba(var(--gold-rgb),.34);box-shadow:0 8px 24px rgba(0,0,0,.35);
 transition:border-color .25s ease,background .25s ease,color .25s ease,box-shadow .25s ease;cursor:pointer}
#jaws-walk#jaws-walk .jw-skip-pill{right:clamp(12px,2.2vw,24px)}
#jaws-walk#jaws-walk .jw-sound{left:clamp(12px,2.2vw,24px);appearance:none}
#jaws-walk#jaws-walk .jw-skip-pill:hover,#jaws-walk#jaws-walk .jw-sound:hover{border-color:rgba(var(--gold-rgb),.75);color:#FFF6DE;background:rgba(28,25,22,.78)}
#jaws-walk#jaws-walk .jw-sound[aria-pressed="true"]{color:#FFF6DE;border-color:rgba(var(--gold-rgb),.85);
 background:linear-gradient(180deg,rgba(240,215,156,.24),rgba(169,133,63,.12));box-shadow:0 0 20px rgba(var(--gold-rgb),.28)}
#jaws-walk#jaws-walk .jw-sound-dot{width:6px;height:6px;border-radius:50%;background:rgba(244,239,231,.45);flex:none}
#jaws-walk#jaws-walk .jw-sound[aria-pressed="true"] .jw-sound-dot{background:var(--gold-lt);box-shadow:0 0 8px var(--gold-lt)}
#jaws-walk#jaws-walk .jw-bar{position:absolute;left:0;bottom:0;height:2px;width:0;z-index:4;background:var(--gold);box-shadow:0 0 10px var(--gold)}
#jaws-walk#jaws-walk .jw-loader{position:absolute;inset:0;display:grid;place-items:center;background:var(--ink);z-index:5;
 font:600 12px/1 var(--jw-sans);letter-spacing:.3em;text-transform:uppercase;color:var(--gold-lt);transition:opacity .6s}
#jaws-walk#jaws-walk .jw-skip{position:absolute;left:12px;top:12px;z-index:8;padding:.8em 1.1em;border-radius:999px;background:var(--ink);
 color:var(--gold-lt);border:1px solid rgba(var(--gold-rgb),.65);font:600 12px/1 var(--jw-sans);letter-spacing:.14em;text-transform:uppercase;
 text-decoration:none;transform:translateY(-200%);opacity:0;pointer-events:none}
#jaws-walk#jaws-walk .jw-skip:focus{transform:none;opacity:1;pointer-events:auto}
#jaws-walk#jaws-walk a:focus-visible,#jaws-walk#jaws-walk button:focus-visible{outline:2px solid var(--gold-lt);outline-offset:3px}
#jaws-walk#jaws-walk #jaws-walk-end{scroll-margin-top:var(--jw-top,0px)}
@media (max-width:520px){
 #jaws-walk#jaws-walk .jw-room{padding:8px 10px;font-size:11px;letter-spacing:.05em}
 #jaws-walk#jaws-walk .jw-skip-pill,#jaws-walk#jaws-walk .jw-sound{padding:0 12px;font-size:11px;letter-spacing:.08em}
}
@media (prefers-reduced-motion:reduce){#jaws-walk#jaws-walk .jw-pin i::after{animation:none}}

/* Static 6-Room Architectural Tour (prefers-reduced-motion / Save-Data / 2g) */
#jaws-walk#jaws-walk.jw-static{background:#1B1A19;color:#F4EFE7}
#jaws-walk#jaws-walk.jw-static .jh-cue{display:none!important}
#jaws-walk#jaws-walk .jw-st-wrap{max-width:1200px;margin:0 auto;padding:clamp(36px,5vw,72px) clamp(18px,4.5vw,52px)}
#jaws-walk#jaws-walk .jw-st-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 24px;margin-bottom:clamp(18px,2.8vw,28px)}
#jaws-walk#jaws-walk .jw-st-kicker{margin:0;font:italic 500 clamp(15px,1.4vw,18px)/1.25 var(--jw-serif);color:var(--gold-lt)}
#jaws-walk#jaws-walk .jw-st-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:clamp(20px,3vw,32px)}
#jaws-walk#jaws-walk .jw-st-tab{appearance:none;border:1px solid rgba(var(--gold-rgb),.28);background:rgba(255,255,255,.04);color:rgba(244,239,231,.86);
 font:500 13px/1 var(--jw-sans);letter-spacing:.07em;text-transform:uppercase;padding:11px 16px;min-height:40px;border-radius:999px;cursor:pointer}
#jaws-walk#jaws-walk .jw-st-tab[aria-selected="true"]{color:#1B1A19;font-weight:700;border-color:transparent;
 background:linear-gradient(180deg,#F4DFA8,var(--gold) 58%,#A9832F)}
#jaws-walk#jaws-walk .jw-st-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:clamp(24px,4vw,52px);align-items:center}
#jaws-walk#jaws-walk .jw-st-media{position:relative;overflow:hidden;border-radius:20px;background:#0F0E0D;border:1px solid rgba(var(--gold-rgb),.26);
 aspect-ratio:16/9;box-shadow:0 30px 70px rgba(0,0,0,.48)}
#jaws-walk#jaws-walk .jw-st-media.is-tall{aspect-ratio:4/5;max-height:62vh}
#jaws-walk#jaws-walk .jw-st-media img{display:block;width:100%;height:100%;object-fit:cover;filter:saturate(.94) contrast(1.05) sepia(.08)}
#jaws-walk#jaws-walk .jw-st-media::after{content:"";position:absolute;inset:0;pointer-events:none;
 background:radial-gradient(ellipse 90% 85% at 50% 50%,transparent 55%,rgba(10,9,8,.42) 100%)}
#jaws-walk#jaws-walk .jw-st-panel{display:grid;gap:22px;align-content:center}
#jaws-walk#jaws-walk .jw-st-cap+.jw-st-cap{padding-top:18px;border-top:1px solid rgba(var(--gold-rgb),.2)}
#jaws-walk#jaws-walk .jw-st-panel .jw-eyebrow{font-size:clamp(11px,1.1vw,14px);margin:0 0 .6em}
#jaws-walk#jaws-walk .jw-st-panel .jw-en{font-size:clamp(30px,3.8vw,56px);max-width:none;text-shadow:none}
#jaws-walk#jaws-walk .jw-st-panel .jw-es{font-size:clamp(19px,2vw,28px);margin:.38em 0 0}
#jaws-walk#jaws-walk .jw-st-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:4px}
#jaws-walk#jaws-walk .jw-st-actions .jw-btn{margin-top:0}
#jaws-walk#jaws-walk .jw-btn.jw-btn-ghost{background:rgba(255,255,255,.04);color:#F4EFE7;border:1px solid rgba(var(--gold-rgb),.45);box-shadow:none}
@media (max-width:860px){
 #jaws-walk#jaws-walk .jw-st-grid{grid-template-columns:1fr}
}`;

  if (!document.getElementById('jaws-walk-css')) {
    const st = document.createElement('style');
    st.id = 'jaws-walk-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  let D = null, N = 0, segs = [], total = 1;
  let cut = 'tall', W = 1, H = 1, top = 0, manual = false;
  let shown = 0, target = 0, dirty = true, curCh = 0, live = false, started = false, fullPump = CAPTURE;
  const got = {}, asked = {}, failedSlots = {}, ptr = {}, order = {}, fails = {}, oks = {}, failed = {};
  let pinEls = [], capEls = [], roomButtons = [];
  let staticPanels = [], staticTabs = [], staticMedia = null, staticImg = null;
  const staticLoadedUrls = {};

  // ---------------------------------------------------------------- data & cut helpers
  const aspect = (c) => D.cuts[c].w / D.cuts[c].h;
  const cuts = () => (root.dataset.cuts || 'tall,wide').split(',').map((s) => s.trim()).filter((c) => D.cuts[c] && !failed[c]);
  function pickCut() {
    const f = params.get('cut');
    if (f && D.cuts[f]) return f;
    const a = W / H, ok = cuts();
    if (!ok.length) return 'tall';
    return ok.reduce((b, c) => (Math.abs(Math.log(a / aspect(c))) < Math.abs(Math.log(a / aspect(b))) - 1e-9 ? c : b));
  }
  const cutFor = (ci) => ((D.chapters[ci].keep[cut] || []).length ? cut : 'tall');
  const url = (c, ci, k) => `${BASE}${c}/${D.chapters[ci].id}/f_${String(D.chapters[ci].keep[c][k]).padStart(4, '0')}.webp` +
    (D.build ? `?b=${D.build}` : '');

  function layoutSegments() {
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
    return t;
  }

  function where(u) {
    const T = u * total;
    const s = segs.find((g) => T <= g.b) || segs[segs.length - 1];
    const k = clamp((T - s.a) / (s.b - s.a));
    const cur = s.kind === 'door' ? (k < 0.5 ? s.i : s.i + 1) : s.i;
    return { s, k, cur };
  }

  // ---------------------------------------------------------------- Static 6-Room Architectural Mode (F-14)
  function staticKeyframeIndex(c, ci) {
    const K = D.chapters[ci].keep[c] || [];
    if (K.length < 3) return 0;
    return Math.floor(K.length * 0.5);
  }

  function staticPickCut() {
    const f = params.get('cut');
    if (f && D.cuts[f]) return f;
    const w = root.clientWidth || window.innerWidth || 1024;
    const h = window.innerHeight || 768;
    W = Math.max(1, w);
    H = Math.max(1, h);
    const ok = cuts();
    if (!ok.length) return 'tall';
    if (w <= 720 && ok.includes('tall')) return 'tall';
    return ok.includes('wide') ? 'wide' : ok[0];
  }

  function loadStaticRoomImage(ci) {
    if (!staticImg || !D) return;
    const c = cutFor(ci);
    const k = staticKeyframeIndex(c, ci);
    const imgSrc = url(c, ci, k);
    staticLoadedUrls[`${c}/${ci}`] = imgSrc;
    staticImg.alt = `${roomTabLabel(D.chapters[ci], ci)} — JAWS Podiatry office`;
    if (staticMedia) staticMedia.classList.toggle('is-tall', c === 'tall');
    if (staticImg.getAttribute('src') !== imgSrc) {
      staticImg.onerror = () => {
        if (c !== 'tall' && (D.chapters[ci].keep.tall || []).length) {
          failed[c] = true;
          const fb = url('tall', ci, staticKeyframeIndex('tall', ci));
          staticLoadedUrls[`tall/${ci}`] = fb;
          staticImg.onerror = null;
          staticImg.src = fb;
          if (staticMedia) staticMedia.classList.add('is-tall');
        }
      };
      staticImg.src = imgSrc;
    }
  }

  function selectStaticRoom(ci, moveFocus = false) {
    if (!D) return;
    curCh = clamp(ci, 0, N - 1);
    shown = target = N > 1 ? curCh / (N - 1) : 0;
    staticTabs.forEach((tab, i) => {
      const on = i === curCh;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && moveFocus) tab.focus();
    });
    staticPanels.forEach((panel, i) => {
      panel.hidden = i !== curCh;
    });
    loadStaticRoomImage(curCh);
  }

  function buildStaticActions(ch) {
    const actions = [];
    const seen = new Set();
    let hasPrimary = false;
    (ch.caps || []).forEach((c) => {
      if (!c.cta) return;
      const dest = href(c.href);
      const key = `${c.cta}|${dest}`;
      if (!seen.has(key)) {
        seen.add(key);
        actions.push({ label: c.cta, href: dest, primary: !hasPrimary });
        hasPrimary = true;
      }
    });
    (ch.pins || []).forEach((p) => {
      const dest = href(p.href);
      const key = `${p.label}|${dest}`;
      if (!seen.has(key)) {
        seen.add(key);
        const primary = !hasPrimary && (p.href || '#book') === '#book';
        if (primary) hasPrimary = true;
        actions.push({ label: p.label, href: dest, primary });
      }
    });
    if (!hasPrimary) {
      actions.unshift({ label: 'Book a consultation', href: href('#book'), primary: true });
    }
    return actions;
  }

  function mountStaticTour() {
    root.classList.add('jw-static');
    cut = staticPickCut();
    layoutSegments();
    root.innerHTML =
      '<div class="jw-st-wrap">' +
        '<div class="jw-st-head">' +
          '<p class="jw-st-kicker">Architectural Tour &middot; <span lang="es">Recorrido arquitect&oacute;nico</span></p>' +
        '</div>' +
        '<div class="jw-st-tabs" role="tablist" aria-label="Office tour rooms"></div>' +
        '<div class="jw-st-grid">' +
          '<figure class="jw-st-media"><img class="jw-st-img" alt="" decoding="async"></figure>' +
          '<div class="jw-st-panels"></div>' +
        '</div>' +
      '</div>' +
      '<div id="jaws-walk-end"></div>';

    const $ = (s) => root.querySelector(s);
    const tabBox = $('.jw-st-tabs');
    const panelBox = $('.jw-st-panels');
    staticMedia = $('.jw-st-media');
    staticImg = $('.jw-st-img');

    D.chapters.forEach((ch, ci) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'jw-st-tab';
      tab.id = `jw-st-tab-${ci}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', ci === 0 ? 'true' : 'false');
      tab.setAttribute('aria-controls', `jw-st-panel-${ci}`);
      tab.tabIndex = ci === 0 ? 0 : -1;
      tab.textContent = roomTabLabel(ch, ci);
      tab.addEventListener('click', () => selectStaticRoom(ci, false));
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          selectStaticRoom((ci + 1) % N, true);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          selectStaticRoom((ci - 1 + N) % N, true);
        } else if (e.key === 'Home') {
          e.preventDefault();
          selectStaticRoom(0, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          selectStaticRoom(N - 1, true);
        }
      });
      staticTabs.push(tabBox.appendChild(tab));

      const panel = document.createElement('div');
      panel.className = 'jw-st-panel';
      panel.id = `jw-st-panel-${ci}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `jw-st-tab-${ci}`);
      panel.hidden = ci !== 0;

      const capsHtml = (ch.caps || []).map((c) =>
        `<div class="jw-st-cap">` +
          `<p class="jw-eyebrow">${esc(c.eyebrow)}</p>` +
          `<h2 class="jw-en">${esc(c.en)}</h2>` +
          `<p class="jw-es" lang="es">${esc(c.es)}</p>` +
        `</div>`
      ).join('');
      const acts = buildStaticActions(ch);
      const btnsHtml = acts.map((a) =>
        `<a class="jw-btn${a.primary ? '' : ' jw-btn-ghost'}" href="${esc(a.href)}">${esc(a.label)}</a>`
      ).join('');

      panel.innerHTML = `${capsHtml}<div class="jw-st-actions">${btnsHtml}</div>`;
      staticPanels.push(panelBox.appendChild(panel));
    });

    started = true;
    selectStaticRoom(0, false);

    const onResizeStatic = () => {
      const nextCut = staticPickCut();
      if (nextCut !== cut) {
        cut = nextCut;
        loadStaticRoomImage(curCh);
      }
    };
    if (typeof ResizeObserver === 'function') new ResizeObserver(onResizeStatic).observe(root);
    else addEventListener('resize', onResizeStatic);

    window.dispatchEvent(new CustomEvent('jaws-walk:ready'));
  }

  // ---------------------------------------------------------------- Web Audio state
  let soundOn = false;
  let audio = null;
  let audioCleanupTimer = null;
  let audioSuspendTimer = null;
  let lastSoundCh = -1;
  let lastSoundKind = '';
  let lastSwellAt = 0;

  // ---------------------------------------------------------------- Interactive 3D Walk Mode DOM & refs
  let track = null, stage = null, canvas = null, bar = null, soundBtn = null, soundTxt = null, ctx = null, blur = null, bctx = null;
  const $ = (s) => root.querySelector(s);

  function mountWalkShell() {
    root.innerHTML =
      '<a class="jw-skip" href="#jaws-walk-end">Skip the office tour</a>' +
      '<div class="jw-track"><div class="jw-stage">' +
        '<canvas aria-hidden="true"></canvas>' +
        '<div class="jw-vignette" aria-hidden="true"></div>' +
        '<div class="jw-scrim" aria-hidden="true"></div>' +
        '<div class="jw-caps"></div>' +
        '<div class="jw-pins"></div>' +
        '<button type="button" class="jw-sound" aria-pressed="false" aria-label="Ambient sanctuary sound">' +
          '<span class="jw-sound-dot" aria-hidden="true"></span><span class="jw-sound-txt">Sound · Off</span>' +
        '</button>' +
        '<a class="jw-skip-pill" href="#jaws-walk-end">Skip tour &darr;</a>' +
        '<nav class="jw-rooms" aria-label="Office tour rooms"></nav>' +
        '<div class="jw-bar" aria-hidden="true"></div>' +
        '<div class="jw-loader"><span>Opening the doors &middot; <span class="jw-pct">0</span>%</span></div>' +
      '</div></div>' +
      '<div id="jaws-walk-end"></div>';

    track = $('.jw-track');
    stage = $('.jw-stage');
    canvas = $('canvas');
    bar = $('.jw-bar');
    soundBtn = $('.jw-sound');
    soundTxt = $('.jw-sound-txt');
    ctx = canvas.getContext('2d');
    blur = document.createElement('canvas');
    bctx = blur.getContext('2d');
    if (CAPTURE) root.classList.add('jw-capture');

    soundBtn.addEventListener('click', () => {
      if (soundOn) {
        soundOn = false;
        soundBtn.setAttribute('aria-pressed', 'false');
        soundTxt.textContent = 'Sound · Off';
        stopAudio();
      } else {
        if (!startAudio()) return;
        soundOn = true;
        soundBtn.setAttribute('aria-pressed', 'true');
        soundTxt.textContent = 'Sound · On';
        syncAudio();
      }
    });
    document.addEventListener('visibilitychange', syncAudio);
  }

  if (STATIC_MODE) {
    root.classList.add('jw-static');
    root.innerHTML = '<div class="jw-st-wrap"><p class="jw-st-kicker">Architectural Tour</p></div><div id="jaws-walk-end"></div>';
  } else {
    mountWalkShell();
  }

  // ---------------------------------------------------------------- Web Audio sanctuary soundscape (opt-in)

  function makePinkBuffer(ac) {
    const len = Math.floor(ac.sampleRate * 3);
    const fade = Math.min(2048, Math.floor(len / 8));
    const totalLen = len + fade;
    const raw = new Float32Array(totalLen);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < totalLen; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.055;
      b6 = w * 0.115926;
      raw[i] = clamp(pink, -0.85, 0.85);
    }
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const out = buf.getChannelData(0);
    for (let i = 0; i < len; i++) out[i] = raw[i];
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      out[i] = raw[i] * t + raw[len + i] * (1 - t);
    }
    return buf;
  }

  function startAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    try {
      const ac = new AudioCtx();
      const master = ac.createGain();
      master.gain.value = 0.0001;
      master.connect(ac.destination);

      const src = ac.createBufferSource();
      src.buffer = makePinkBuffer(ac);
      src.loop = true;

      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 340;
      lp.Q.value = 0.65;

      const ambGain = ac.createGain();
      ambGain.gain.value = 0.24;

      const lfo = ac.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.07;

      const lfoGain = ac.createGain();
      lfoGain.gain.value = 65;

      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);
      src.connect(lp);
      lp.connect(ambGain);
      ambGain.connect(master);

      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 360;
      bp.Q.value = 2.2;

      const breezeGain = ac.createGain();
      breezeGain.gain.value = 0.0001;

      src.connect(bp);
      bp.connect(breezeGain);
      breezeGain.connect(master);

      src.start();
      lfo.start();

      audio = { ac, master, src, lp, ambGain, lfo, lfoGain, bp, breezeGain, nodes: [src, lp, ambGain, lfo, lfoGain, bp, breezeGain, master] };
      const w = D ? where(shown) : null;
      lastSoundCh = curCh;
      lastSoundKind = w ? w.s.kind : '';
      return true;
    } catch (_) {
      return false;
    }
  }

  function stopAudio() {
    clearTimeout(audioSuspendTimer);
    clearTimeout(audioCleanupTimer);
    const inst = audio;
    audio = null;
    if (!inst) return;
    try {
      inst.master.gain.cancelScheduledValues(inst.ac.currentTime);
      inst.master.gain.setTargetAtTime(0.0001, inst.ac.currentTime, 0.03);
    } catch (_) {}
    audioCleanupTimer = setTimeout(() => {
      try { inst.src.stop(); } catch (_) {}
      try { inst.lfo.stop(); } catch (_) {}
      inst.nodes.forEach((n) => { try { n.disconnect(); } catch (_) {} });
      if (inst.ac.state !== 'closed') {
        try { inst.ac.close().catch(() => {}); } catch (_) {}
      }
    }, 110);
  }

  function syncAudio() {
    if (!soundOn || !audio) return;
    clearTimeout(audioSuspendTimer);
    const shouldPlay = live && !document.hidden;
    const now = audio.ac.currentTime;
    if (shouldPlay) {
      if (audio.ac.state === 'suspended') {
        try { audio.ac.resume().catch(() => {}); } catch (_) {}
      }
      audio.master.gain.cancelScheduledValues(now);
      audio.master.gain.setTargetAtTime(0.18, now, 0.25);
    } else {
      audio.master.gain.cancelScheduledValues(now);
      audio.master.gain.setTargetAtTime(0.0001, now, 0.05);
      audioSuspendTimer = setTimeout(() => {
        if (audio && (!live || document.hidden) && audio.ac.state === 'running') {
          try { audio.ac.suspend().catch(() => {}); } catch (_) {}
        }
      }, 95);
    }
  }

  function breezeSwell() {
    if (!soundOn || !audio || !live || document.hidden || audio.ac.state !== 'running') return;
    const nowMs = performance.now();
    if (nowMs - lastSwellAt < 650) return;
    lastSwellAt = nowMs;
    const t = audio.ac.currentTime;
    audio.bp.frequency.cancelScheduledValues(t);
    audio.bp.frequency.setValueAtTime(300, t);
    audio.bp.frequency.exponentialRampToValueAtTime(720, t + 0.55);
    audio.bp.frequency.exponentialRampToValueAtTime(340, t + 1.35);
    audio.breezeGain.gain.cancelScheduledValues(t);
    audio.breezeGain.gain.setValueAtTime(Math.max(0.0001, audio.breezeGain.gain.value), t);
    audio.breezeGain.gain.linearRampToValueAtTime(0.16, t + 0.42);
    audio.breezeGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  }

  // ---------------------------------------------------------------- frames (F-08 staged preload)
  function coarseToFine(n) {
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
      failedSlots[key] = new Uint8Array(K.length);
      ptr[key] = 0;
    }
    return key;
  }

  let inflight = 0;
  const MAXQ = 6;
  function nextJob() {
    if (CAPTURE) {
      for (let ci = 0; ci < N; ci++) { const j = jobIn(cut, ci); if (j) return j; }
      return null;
    }
    if (!fullPump) {
      const c0 = cutFor(0);
      const key0 = slot(c0, 0);
      if (order[key0].length && !asked[key0][0]) return [c0, 0, 0, key0];
      return null;
    }
    for (const ci of [curCh, curCh + 1, curCh - 1]) {
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
        if (ci === curCh || ci === curCh + 1) {
          dirty = true;
          if (!live && !CAPTURE && ci === curCh && (fullPump || k === 0)) draw(shown);
        }
        loaded(c, ci);
        pump();
      };
      im.onerror = () => {
        inflight--;
        failedSlots[key][k] = 1;
        fails[c] = (fails[c] || 0) + 1;
        if (!oks[c] && fails[c] >= 6 && c !== 'tall') {
          failed[c] = true;
          retune();
        }
        loaded(c, ci);
        pump();
      };
      im.src = url(c, ci, k);
    }
  }

  function nearest(c, ci, p) {
    const C = D.chapters[ci], K = C.keep[c];
    if (!K || !K.length) return null;
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
  function frameBlend(ci, p) {
    const C = D.chapters[ci];
    const orderCuts = [cut, ...Object.keys(D.cuts).filter((x) => x !== cut)];
    for (const c of orderCuts) {
      const K = C.keep[c];
      if (!K || !K.length) continue;
      const key = slot(c, ci), list = got[key];
      const f = 1 + clamp(p) * (C.frames - 1);
      let lo = 0, hi = K.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (K[m] <= f) lo = m; else hi = m; }
      if (list[lo] && list[hi] && lo !== hi) {
        const span = K[hi] - K[lo];
        const t = span > 0 ? clamp((f - K[lo]) / span) : 0;
        return { a: { img: list[lo], c, k: lo }, b: { img: list[hi], c, k: hi }, t };
      }
      if (list[lo] || list[hi]) {
        const k = list[lo] && (!list[hi] || f - K[lo] <= K[hi] - f) ? lo : hi;
        return { a: { img: list[k], c, k }, b: null, t: 0 };
      }
    }
    return null;
  }

  // ---------------------------------------------------------------- drawing
  function fitRect(img) {
    const iw = img.naturalWidth, ih = img.naturalHeight, cw = canvas.width, ch = canvas.height;
    const a = cw / ch, fa = iw / ih;
    const cover = Math.min(a / fa, fa / a) >= 0.7;
    const s = (cover ? Math.max : Math.min)(cw / iw, ch / ih);
    return { x: (cw - iw * s) / 2, y: (ch - ih * s) / 2, w: iw * s, h: ih * s, cover };
  }
  function paint(img, alpha) {
    const r = fitRect(img), cw = canvas.width, ch = canvas.height;
    ctx.globalAlpha = alpha;
    if (!r.cover) {
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

  function layout() {
    const t = layoutSegments();
    const hPct = Math.round(t * 120 * PACE + 100);
    track.style.height = `${hPct}vh`;
    track.style.height = `${hPct}svh`;
  }

  const dark = {};
  function darkFor(ci, c) {
    if (!LIGHTS || ci < 0 || ci >= N) return null;
    const m = dark[ci] || (dark[ci] = {});
    if (!(c in m)) {
      m[c] = null;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        m[c] = im;
        dirty = true;
        if (!live && !CAPTURE && ci === curCh) draw(shown);
      };
      im.src = `${BASE}${c}/${D.chapters[ci].id}/dark_0001.webp` + (D.build ? `?b=${D.build}` : '');
    }
    return m[c];
  }
  function ahead() {
    if (!fullPump && !CAPTURE) {
      darkFor(0, cutFor(0));
      return;
    }
    darkFor(curCh, cutFor(curCh));
    darkFor(curCh + 1, cutFor(Math.min(curCh + 1, N - 1)));
  }

  function draw(u) {
    const { s, k, cur } = where(u);
    const door = s.kind === 'door', lead = s.kind === 'lead';
    const localP = door ? 1 : lead ? 0 : k;
    const moving = !CAPTURE && !door && !lead && Math.abs(target - shown) > 0.0004;

    let fr = null, fr2 = null, blend = 0;
    if (moving) {
      const br = frameBlend(s.i, localP);
      if (br) { fr = br.a; fr2 = br.b; blend = br.t; }
    }
    if (!fr) fr = frameAt(s.i, localP);
    if (!fr) return false;

    ctx.globalCompositeOperation = 'source-over';
    const r = paint(fr.img, 1);
    if (fr2 && blend > 0.01 && blend < 0.99) paint(fr2.img, blend);

    const dk = lead && darkFor(s.i, fr.c);
    if (dk) paint(dk, 1 - smooth(0.12, 0.9, k));
    // Soft warm Architectural Digest tungsten bloom across lit frames
    const bloomAlpha = dk ? 0.08 * smooth(0.12, 0.9, k) : 0.08;
    if (bloomAlpha > 0.004) {
      const cw = canvas.width, ch = canvas.height;
      const g = ctx.createRadialGradient(cw * 0.5, ch * 0.36, 0, cw * 0.5, ch * 0.42, Math.max(cw, ch) * 0.68);
      g.addColorStop(0, 'rgba(255,232,190,1)');
      g.addColorStop(0.55, 'rgba(217,182,140,0.35)');
      g.addColorStop(1, 'rgba(217,182,140,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = bloomAlpha;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
    if (door) {
      const b = frameAt(s.i + 1, 0);
      const bd = b && darkFor(s.i + 1, b.c);
      if (b) paint(bd || b.img, smooth(0.25, 0.75, k));
      ctx.globalAlpha = (bd ? 0.15 : 0.62) * Math.sin(Math.PI * k);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#fff1d6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    if (soundOn && live) {
      if ((door && lastSoundKind !== 'door') || (lastSoundCh !== -1 && cur !== lastSoundCh)) breezeSwell();
      lastSoundCh = cur;
      lastSoundKind = s.kind;
    }

    const local = door ? (k < 0.5 ? 1 : 0) : lead ? 0 : k;
    captions(cur, local, door ? Math.sin(Math.PI * k) : 0);
    const pinFr = (fr2 && blend >= 0.5) ? fr2 : fr;
    pins(cur, local, pinFr, r, door, fr2 ? fr : null, fr2 ? blend : 0);

    const nav = $('.jw-rooms');
    roomButtons.forEach((btn, i) => {
      const on = i === cur;
      const wasOn = btn.classList.contains('on');
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-current', on ? 'true' : 'false');
      if (on && !wasOn && nav && nav.scrollWidth > nav.clientWidth + 2) {
        const left = btn.offsetLeft - (nav.clientWidth - btn.clientWidth) / 2;
        try { nav.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' }); }
        catch (_) { nav.scrollLeft = Math.max(0, left); }
      }
    });
    bar.style.width = `${(u * 100).toFixed(2)}%`;
    return true;
  }

  function show(el, on) {
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

  function pins(ci, p, fr, r, hide, frBase, blend) {
    const k = W / canvas.width;
    for (const el of pinEls) {
      const sp = +el.dataset.ch === ci ? D.chapters[ci].spots[fr.c] : null;
      const list = sp && sp[el.dataset.anchor] ? sp[el.dataset.anchor] : null;
      let s = list ? list[fr.k] : null;
      if (s && frBase && frBase.c === fr.c && list[frBase.k]) {
        const s0 = list[frBase.k], s1 = list[fr.k];
        if (s0[2] && s1[2]) s = [s0[0] + (s1[0] - s0[0]) * blend, s0[1] + (s1[1] - s0[1]) * blend, 1];
      }
      let op = 0;
      if (s) {
        const x = (r.x + s[0] * r.w) * k, y = (r.y + s[1] * r.h) * k;
        const inside = x > 8 && x < W - 8 && y > 8 && y < H - 8;
        if (s[2] && inside && !hide) op = smooth(+el.dataset.in, +el.dataset.in + 0.05, p) * (1 - smooth(+el.dataset.out, +el.dataset.out + 0.05, p));
        if (!el._w) { el.style.maxWidth = 'none'; el._w = el.offsetWidth; }
        const roomR = W - x - 1, roomL = x - 1;
        const flip = el._w <= roomR ? x > W * 0.55 && el._w <= roomL : roomL > roomR;
        el.style.maxWidth = `${Math.round(Math.max(90, flip ? roomL : roomR))}px`;
        el.classList.toggle('flip', flip);
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${flip ? 'calc(-100% + 7px)' : '-7px'}, -50%)`;
      }
      el.style.opacity = op.toFixed(3);
      show(el, op > 0.5);
    }
  }

  function scrollToRoom(ci) {
    if (!D || !segs.length) return;
    const chSeg = segs.find((s) => s.kind === 'ch' && s.i === ci);
    if (!chSeg) return;
    const targetT = chSeg.a + (chSeg.b - chSeg.a) * 0.05;
    const u = clamp(targetT / total);
    top = parseFloat(getComputedStyle(root).getPropertyValue('--jw-top')) || 0;
    const r = track.getBoundingClientRect();
    const span = Math.max(0, r.height - H);
    const scrollY = window.scrollY || window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0;
    const scrollTop = Math.max(0, Math.round(r.top + scrollY - top + u * span));
    darkFor(ci, cutFor(ci));
    window.scrollTo({ top: scrollTop, behavior: reduce ? 'auto' : 'smooth' });
  }

  function build() {
    const caps = $('.jw-caps'), pinBox = $('.jw-pins'), nav = $('.jw-rooms');
    D.chapters.forEach((ch, ci) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'jw-room' + (ci === 0 ? ' on' : '');
      btn.dataset.ch = String(ci);
      btn.setAttribute('aria-current', ci === 0 ? 'true' : 'false');
      btn.textContent = roomHudLabel(ch, ci);
      btn.addEventListener('click', () => scrollToRoom(ci));
      roomButtons.push(nav.appendChild(btn));

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
    if (STATIC_MODE) return;
    W = Math.max(1, stage.clientWidth);
    H = Math.max(1, stage.clientHeight);
    const dpr = CAPTURE ? 1 : Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    top = parseFloat(getComputedStyle(root).getPropertyValue('--jw-top')) || 0;
    if (D) retune();
    dirty = true;
  }
  function retune() {
    const c = pickCut();
    if (c !== cut) { cut = c; dirty = true; pump(); }
  }

  function clipsOverflow() {
    for (let p = track.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(hidden|auto|scroll)/.test(`${s.overflowX} ${s.overflowY}`)) return true;
    }
    return false;
  }
  function fixedWorks() {
    for (let p = track.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none' || /paint|layout|strict|content/.test(s.contain)) return false;
    }
    return true;
  }
  let suspect = 0, useFixed = false;
  function progress() {
    top = parseFloat(getComputedStyle(root).getPropertyValue('--jw-top')) || 0;
    const r = track.getBoundingClientRect();
    const span = r.height - H;
    const y = clamp(top - r.top, 0, Math.max(0, span));
    if (!manual && y > 20 && y < span - 20) {
      const st = stage.getBoundingClientRect();
      suspect = Math.abs(st.top - top) > 4 ? suspect + 1 : 0;
      if (suspect > (clipsOverflow() ? 2 : 12)) {
        manual = true;
        useFixed = fixedWorks();
        stage.classList.add('jw-manual');
      }
    }
    if (manual) pinByScript(y, span);
    return span > 0 ? y / span : 0;
  }
  function pinByScript(y, span) {
    if (useFixed && y > 0 && y < span) {
      const tr = track.getBoundingClientRect();
      Object.assign(stage.style, { position: 'fixed', top: `${top}px`, left: `${tr.left}px`, width: `${tr.width}px`, transform: 'none' });
    } else {
      Object.assign(stage.style, { position: '', top: '', left: '', width: '', transform: `translateY(${y.toFixed(1)}px)` });
    }
  }

  let looping = false, wasBlending = false;
  function loop() { if (!looping) { looping = true; requestAnimationFrame(tick); } }
  function tick() {
    if (!live) { looping = false; return; }
    target = progress();
    const { cur } = where(target);
    if (cur !== curCh) { curCh = cur; ahead(); pump(); }
    const d = target - shown;
    const blending = Math.abs(d) > 0.0004;
    if (Math.abs(d) > 1e-5 || dirty || (wasBlending && !blending)) {
      shown = Math.abs(d) < 1e-5 ? target : shown + d * 0.12;
      if (draw(shown)) dirty = false;
      wasBlending = Math.abs(target - shown) > 0.0004;
    }
    requestAnimationFrame(tick);
  }

  let loaderGone = false;
  function loaded(c, ci) {
    if (loaderGone || CAPTURE || c !== cutFor(ci) || ci !== curCh) return;
    const key = slot(c, ci), K = got[key].length;
    const need = Math.min(K, 2 + Math.ceil(K / 8));
    const slice = order[key].slice(0, need);
    const have = slice.filter((k) => got[key][k]).length;
    const done = slice.filter((k) => got[key][k] || failedSlots[key][k]).length;
    const pctEl = $('.jw-pct');
    if (pctEl) pctEl.textContent = Math.round((have / Math.max(1, need)) * 100);
    if (have >= need || (done >= need && have > 0)) {
      loaderGone = true;
      const l = $('.jw-loader');
      if (l) {
        l.style.opacity = 0;
        setTimeout(() => l.remove(), 700);
      }
    }
  }

  function start() {
    if (started) return;
    started = true;
    target = shown = progress();
    curCh = fullPump ? where(target).cur : 0;
    ahead();
    pump();
  }

  async function init() {
    if (!STATIC_MODE) resize();
    D = window.JAWS_WALK_DATA || await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = `${BASE}walk-data.js?v=${VER}`;
      s.onload = () => res(window.JAWS_WALK_DATA);
      s.onerror = () => rej(new Error(`walk-data.js not found at ${s.src}`));
      document.head.appendChild(s);
    });
    N = D.chapters.length;

    if (STATIC_MODE) {
      mountStaticTour();
      return;
    }

    build();
    layout();
    resize();
    cut = pickCut();
    window.dispatchEvent(new CustomEvent('jaws-walk:ready'));
    if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(stage);
    else addEventListener('resize', resize);

    if (CAPTURE) {
      started = true;
      fullPump = true;
      pump();
      await new Promise((res) => {
        const t = setInterval(() => {
          const all = D.chapters.every((ch, ci) => got[slot(cut, ci)].every(Boolean));
          if (all && !inflight) { clearInterval(t); res(); }
        }, 200);
      });
      const loaderEl = $('.jw-loader');
      if (loaderEl) loaderEl.remove();
      let state = 0;
      window.__scene = { ready: true, setState(t) { state = clamp(t / DUR); }, render() { draw(state); } };
      return;
    }

    const activateLive = () => {
      fullPump = true;
      if (!started) start();
      else {
        curCh = where(target = progress()).cur;
        ahead();
        pump();
      }
      dirty = true;
      loop();
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) start(); },
        { rootMargin: '35% 0px 35% 0px' }).observe(track);
      new IntersectionObserver((es) => {
        live = es[es.length - 1].isIntersecting;
        if (live) activateLive();
        syncAudio();
      }).observe(track);
    }

    setTimeout(() => {
      const r = track.getBoundingClientRect();
      if (!started && r.top < innerHeight * 1.35 && r.bottom > -innerHeight * 0.35) start();
      if (!live && r.top < innerHeight && r.bottom > 0) {
        live = true;
        activateLive();
        syncAudio();
      }
    }, 1500);
  }

  // debugging, verification, and external control hooks
  window.__jawsWalk = {
    seek(u) {
      shown = target = clamp(u);
      if (!D) return this.state();
      if (STATIC_MODE) {
        const w = where(shown);
        selectStaticRoom(w.cur, false);
        shown = target = clamp(u);
        return this.state();
      }
      started = true;
      fullPump = true;
      const c = where(shown).cur;
      if (c !== curCh) curCh = c;
      ahead();
      pump();
      dirty = true;
      draw(shown);
      return this.state();
    },
    pins() {
      if (STATIC_MODE) return [];
      return pinEls.map((el) => ({ label: el.textContent, href: el.getAttribute('href'), op: +el.style.opacity,
        at: el.style.transform.split(') ')[0] + ')' }));
    },
    state() {
      if (STATIC_MODE) {
        const chId = D ? D.chapters[curCh].id : null;
        const c = D ? cutFor(curCh) : cut;
        const frameUrl = chId ? (staticLoadedUrls[`${c}/${curCh}`] || null) : null;
        return { mode: 'static', reduce, saveData, cut, W, H, canvas: [0, 0], manual: false, started, live: false, inflight: 0,
          chapter: chId, shown: +shown.toFixed(4),
          frame: frameUrl ? frameUrl.split('/').slice(-3).join('/') : null,
          loaded: Object.keys(staticLoadedUrls).length };
      }
      const w = D ? where(shown) : null;
      const fr = w ? frameAt(w.s.i, w.s.kind === 'door' ? 1 : w.s.kind === 'lead' ? 0 : w.k) : null;
      return { mode: 'walk', reduce, saveData, cut, W, H, canvas: [canvas.width, canvas.height], manual, started, live, fullPump, inflight,
        chapter: D ? D.chapters[curCh].id : null, shown: +shown.toFixed(4),
        frame: fr ? fr.img.src.split('/').slice(-3).join('/') : null,
        loaded: Object.fromEntries(Object.entries(got).map(([k, v]) => [k, v.filter(Boolean).length + '/' + v.length])) };
    },
  };

  init().catch((e) => { window.__jawsWalkError = String(e); console.error('[jaws-walk]', e); });
})();
