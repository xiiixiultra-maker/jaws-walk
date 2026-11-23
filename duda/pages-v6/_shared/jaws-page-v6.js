/* JAWS Podiatry v6: behavior for the procedure and practice pages (reveals, "On this page" rail, magnetic CTA drift, preview link rewriting, phone booking bar). */
(function () {
  var root = document.getElementById('jaws-page');
  if (!root || root.getAttribute('data-ready')) return;
  root.setAttribute('data-ready', '1');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // the site header pins over the page (sticky or fixed): measure where it ends, so the rail sits under it
  function syncTop() {
    var h = document.getElementById('flex-header') || document.querySelector('.dmHeaderContainer, #hcontainer');
    if (!h) return;
    var pinned = false;
    for (var el = h; el && el !== document.body; el = el.parentElement) {
      var pos = getComputedStyle(el).position;
      if (pos === 'sticky' || pos === 'fixed') { pinned = true; break; }
    }
    var px = (pinned ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 0) + 'px';
    if (root.style.getPropertyValue('--top') !== px) root.style.setProperty('--top', px);
  }
  syncTop();

  // the arch photo settles in once the page has loaded
  function ready() { root.classList.add('jp-ready'); }
  if (document.readyState === 'complete') setTimeout(ready, 60); else window.addEventListener('load', ready);
  setTimeout(ready, 2500);

  // scroll reveals; if the observer never reports (hidden tab, old browser), show everything
  var items = root.querySelectorAll('.jp-r');
  if (!reduce && 'IntersectionObserver' in window && items.length) {
    root.classList.add('jp-js');
    var heard = false;
    var io = new IntersectionObserver(function (entries) {
      heard = true;
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('jp-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    for (var i = 0; i < items.length; i++) io.observe(items[i]);
    setTimeout(function () { if (!heard) root.classList.remove('jp-js'); }, 1500);
  }

  // "On this page": light up the part being read
  var links = root.querySelectorAll('.jp-toc a');
  if (links.length && 'IntersectionObserver' in window) {
    var byId = {};
    for (var k = 0; k < links.length; k++) byId[links[k].getAttribute('href').slice(1)] = links[k];
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        for (var m = 0; m < links.length; m++) links[m].classList.remove('on');
        var a = byId[e.target.id];
        if (a) a.classList.add('on');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    root.querySelectorAll('.jp-sec[id]').forEach(function (s) { spy.observe(s); });
  }

  // subtle 5px magnetic pointer drift on .jp-btn for fine hover pointers and non-reduced motion
  var fineHover = !reduce && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fineHover) {
    var bindMagnet = function (btn) {
      btn.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        var r = btn.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        var ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        btn.style.setProperty('--bx', (nx * 5).toFixed(2) + 'px');
        btn.style.setProperty('--by', (ny * 5).toFixed(2) + 'px');
      });
      var reset = function () {
        btn.style.setProperty('--bx', '0px');
        btn.style.setProperty('--by', '0px');
      };
      btn.addEventListener('pointerleave', reset);
      btn.addEventListener('blur', reset);
    };
    var magBtns = root.querySelectorAll('.jp-btn');
    for (var mIdx = 0; mIdx < magBtns.length; mIdx++) bindMagnet(magBtns[mIdx]);
  }

  // in the draft preview (/site/<id>/...?preview=true) the site's own links carry that prefix while preserving existing query params & hashes
  var pre = location.pathname.match(/^\/site\/[^/]+/);
  if (pre) {
    var hasPreview = location.search.indexOf('preview=true') > -1;
    var navLinks = root.querySelectorAll('a[href^="/"]');
    for (var nIdx = 0; nIdx < navLinks.length; nIdx++) {
      var a = navLinks[nIdx];
      var h = a.getAttribute('href');
      if (h.indexOf('/site/') === 0) continue;
      var hashIdx = h.indexOf('#');
      var hash = hashIdx > -1 ? h.slice(hashIdx) : '';
      if (hashIdx > -1) h = h.slice(0, hashIdx);
      var q = '';
      if (hasPreview && h.indexOf('preview=true') === -1) {
        var sep = h.indexOf('?') > -1 ? '&' : '?';
        q = sep + 'preview=true';
      }
      a.setAttribute('href', pre[0] + h + q + hash);
    }
  }

  // phone booking bar: deduplicate on document.body, hide over hero, .jp-close, or whenever any CTA button overlaps the bottom 30% of the viewport
  var dock = root.querySelector('#jp-dock');
  var hero = root.querySelector('.jp-hero');
  var close = root.querySelector('.jp-close');
  var ctaBtns = root.querySelectorAll('.jp-hero .jp-btn, .jp-copy .jp-btn, .jp-close .jp-btn');
  if (dock) {
    var existingDocks = document.querySelectorAll('#jp-dock');
    for (var dIdx = 0; dIdx < existingDocks.length; dIdx++) {
      if (existingDocks[dIdx] !== dock && existingDocks[dIdx].parentNode) {
        existingDocks[dIdx].parentNode.removeChild(existingDocks[dIdx]);
      }
    }
    document.body.appendChild(dock);
    var tick = false;
    var place = function () {
      tick = false;
      syncTop();
      var vh = window.innerHeight || document.documentElement.clientHeight || 800;
      var past = hero ? hero.getBoundingClientRect().bottom < 0 : true;
      var atEnd = close ? close.getBoundingClientRect().top < vh * 0.75 : false;
      var btnNearDock = false;
      var bottomBandTop = vh * 0.70;
      for (var bIdx = 0; bIdx < ctaBtns.length; bIdx++) {
        var rect = ctaBtns[bIdx].getBoundingClientRect();
        if (rect.height > 0 && rect.bottom > bottomBandTop && rect.top < vh) {
          btnNearDock = true;
          break;
        }
      }
      dock.classList.toggle('on', past && !atEnd && !btnNearDock);
    };
    var ask = function () { if (!tick) { tick = true; requestAnimationFrame(place); } };
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    window.addEventListener('load', ask);
    place();
  } else {
    window.addEventListener('resize', syncTop);
    window.addEventListener('scroll', syncTop, { passive: true });
    window.addEventListener('load', syncTop);
  }
})();
