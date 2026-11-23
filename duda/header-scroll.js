/*! JAWS Podiatry v6 site-wide header scroll, mobile drawer CTA & footer upgrade script.
 *  Drop into Duda Head (with defer) or Body End HTML. Zero external dependencies, zero tracking. */
(function () {
  'use strict';

  if (window.__jhShellV6Init) return;
  window.__jhShellV6Init = true;

  var SCROLL_THRESHOLD = 56;
  var ticking = false;
  var observer = null;

  function buildSiteUrl(path) {
    var pre = location.pathname.match(/^\/site\/[^/]+/);
    if (!pre) return path;
    var hasPreview = /(?:^|[?&])preview=true(?:&|$)/.test(location.search);
    var hashIdx = path.indexOf('#');
    var hash = hashIdx > -1 ? path.slice(hashIdx) : '';
    var base = hashIdx > -1 ? path.slice(0, hashIdx) : path;
    if (hasPreview && !/(?:^|[?&])preview=true(?:&|$)/.test(base)) {
      base += (base.indexOf('?') > -1 ? '&' : '?') + 'preview=true';
    }
    return pre[0] + base + hash;
  }

  function updateHeaderScroll() {
    ticking = false;
    var header = document.getElementById('flex-header');
    if (!header) return;

    var y = window.scrollY !== undefined
      ? window.scrollY
      : (window.pageYOffset || document.documentElement.scrollTop || 0);
    var maxScroll = document.documentElement.scrollHeight - (window.innerHeight || document.documentElement.clientHeight || 0);
    var progress = maxScroll > 0 ? Math.min(1, Math.max(0, y / maxScroll)) : 0;

    header.classList.toggle('jh-scrolled', y > SCROLL_THRESHOLD);
    header.style.setProperty('--jh-progress', progress.toFixed(4));
  }

  function requestScrollUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateHeaderScroll);
    }
  }

  function hasBookingLink(container) {
    if (container.querySelector('.jh-drawer-book')) return true;
    var links = container.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      if (/\/booking(?:$|[?#])/i.test(href)) return true;
    }
    return false;
  }

  function findGetInTouchTarget(drawer) {
    var candidates = drawer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, .dmNewParagraph');
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (/^\s*get\s+in\s+touch\b/i.test(el.textContent || '')) {
        var para = el.closest ? el.closest('.dmNewParagraph') : null;
        if (para && para.firstElementChild === el && para.parentNode) {
          return { parent: para.parentNode, before: para };
        }
        return { parent: el.parentNode, before: el };
      }
    }
    for (var j = 0; j < candidates.length; j++) {
      var item = candidates[j];
      if (/\bget\s+in\s+touch\b/i.test(item.textContent || '')) {
        var block = item.closest ? item.closest('.dmNewParagraph') : null;
        if (block && block.parentNode) {
          return { parent: block.parentNode, before: block };
        }
        return { parent: item.parentNode, before: item };
      }
    }
    return null;
  }

  function injectDrawerCta() {
    var drawer = document.getElementById('hamburger-drawer');
    if (!drawer || hasBookingLink(drawer)) return;

    var cta = document.createElement('a');
    cta.className = 'jh-drawer-book';
    cta.href = buildSiteUrl('/booking');
    cta.textContent = 'Request a private consultation';

    var target = findGetInTouchTarget(drawer);
    if (target && target.parent) {
      target.parent.insertBefore(cta, target.before);
      return;
    }

    var nav = drawer.querySelector('nav');
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(cta, nav.nextSibling);
    } else {
      drawer.appendChild(cta);
    }
  }

  function upgradeFooter() {
    var footer = document.getElementById('flex-footer') || document.querySelector('footer#flex-footer, .dmFooterContainer');
    if (!footer) return;

    footer.classList.add('jh-footer');

    // Upgrade unlinked plain-text "Privacy policy" without clobbering Duda's DOM bindings
    if (document.createTreeWalker && window.NodeFilter) {
      var walker = document.createTreeWalker(footer, NodeFilter.SHOW_TEXT, null, false);
      var textNodes = [];
      var node;
      while ((node = walker.nextNode())) {
        var parent = node.parentNode;
        if (!parent || parent.nodeType !== 1) continue;
        if (parent.closest && parent.closest('a, script, style, noscript, textarea, button')) continue;
        if (/\bprivacy\s+policy\b/i.test(node.nodeValue || '')) {
          textNodes.push(node);
        }
      }

      for (var i = 0; i < textNodes.length; i++) {
        var tNode = textNodes[i];
        var val = tNode.nodeValue || '';
        var m = /\bprivacy\s+policy\b/i.exec(val);
        if (!m) continue;

        var frag = document.createDocumentFragment();
        if (m.index > 0) {
          frag.appendChild(document.createTextNode(val.slice(0, m.index)));
        }
        var a = document.createElement('a');
        a.className = 'jh-footer-link jh-footer-legal-link jh-privacy-link';
        a.href = buildSiteUrl('/privacy-policy');
        a.textContent = m[0];
        frag.appendChild(a);

        var afterIdx = m.index + m[0].length;
        if (afterIdx < val.length) {
          frag.appendChild(document.createTextNode(val.slice(afterIdx)));
        }
        tNode.parentNode.replaceChild(frag, tNode);
      }
    }

    // Prepare clean semantic classes on footer links and navs without disrupting Duda handlers
    var navLists = footer.querySelectorAll('nav .unifiednav__container, nav ul');
    for (var n = 0; n < navLists.length; n++) {
      navLists[n].classList.add('jh-footer-links');
    }

    var links = footer.querySelectorAll('a[href]');
    for (var k = 0; k < links.length; k++) {
      var link = links[k];
      if (link.querySelector('img, svg')) continue;
      link.classList.add('jh-footer-link');

      var label = (link.textContent || '').trim();
      if (/^(?:privacy(?:\s+policy)?|terms(?:\s+of\s+use)?|medical\s+disclaimer|accessibility|credits)$/i.test(label)) {
        link.classList.add('jh-footer-legal-link');
        var group = link.closest ? link.closest('ul, nav, p, .dmNewParagraph') : null;
        if (group && group !== footer && (group.tagName === 'UL' || group.tagName === 'NAV' || group.querySelectorAll('a').length >= 2)) {
          group.classList.add('jh-footer-legal');
        }
      }
    }

    var legalGroups = footer.querySelectorAll('.jh-footer-legal');
    for (var g = 0; g < legalGroups.length; g++) {
      var children = legalGroups[g].childNodes;
      for (var c = 0; c < children.length; c++) {
        var ch = children[c];
        if (ch.nodeType === 3 && /^\s*[|·•\/-]\s*$/.test(ch.nodeValue || '')) {
          var sep = document.createElement('span');
          sep.className = 'jh-footer-sep';
          sep.setAttribute('aria-hidden', 'true');
          sep.textContent = (ch.nodeValue || '').trim();
          legalGroups[g].replaceChild(sep, ch);
        }
      }
    }
  }

  function runEnhancements() {
    injectWowStyles();
    updateHeaderScroll();
    injectDrawerCta();
    upgradeFooter();
    enhanceSubpageArch();
    initHairlineObservers();
    initStudioCursor();
  }

  function watchDom() {
    if (observer || !window.MutationObserver || !document.body) return;
    var pending = false;
    observer = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      window.setTimeout(function () {
        pending = false;
        injectDrawerCta();
        upgradeFooter();
      }, 60);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Stop observing once Duda settles if drawer and footer are already handled, or keep lightweight guard on click
    window.setTimeout(function () {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }, 8000);
  }

  /* ------------------------------------------------------------------------
     WOW Upgrades (Site-Wide): Subpage Arch Filigree, Scroll-Drawn Hairlines,
     Contextual Studio Cursor & Silk-Inertia Desktop Scrolling
     ------------------------------------------------------------------------ */
  function injectWowStyles() {
    if (document.getElementById('jh-wow-css')) return;
    var st = document.createElement('style');
    st.id = 'jh-wow-css';
    st.textContent =
      '/* Subpage Hero Arch warm Architectural Digest grade + Da Vinci geometric filigree */\n' +
      '#jaws-page#jaws-page .jp-arch img{filter:sepia(.14) saturate(.92) contrast(1.06) brightness(.95);}\n' +
      '#jaws-page#jaws-page .jp-arch::before{background:radial-gradient(circle at 28% 22%,rgba(231,201,135,.16),transparent 54%),linear-gradient(180deg,rgba(27,26,25,0) 48%,rgba(22,19,16,.56));}\n' +
      '#jaws-page#jaws-page .jp-dv-filigree{position:absolute;inset:-24px;width:calc(100% + 48px);height:calc(100% + 48px);pointer-events:none;z-index:2;opacity:.72;overflow:visible;}\n' +
      '#jaws-page#jaws-page .jp-dv-filigree .jp-dv-draw{stroke-dasharray:1200;stroke-dashoffset:1200;transition:stroke-dashoffset 2.1s cubic-bezier(.2,.7,.2,1);}\n' +
      '#jaws-page#jaws-page.jp-ready .jp-dv-filigree .jp-dv-draw{stroke-dashoffset:0;}\n' +
      '/* Scroll-drawn champagne-gold hairlines */\n' +
      '#jaws-home#jaws-home.jh-js .jh-kicker.jh-r::before,#jaws-home#jaws-home.jh-js .jh-r .jh-kicker::before{transform:scaleX(0);transform-origin:0 50%;transition:transform .9s cubic-bezier(.2,.7,.2,1);}\n' +
      '#jaws-home#jaws-home.jh-js .jh-kicker.jh-r.is-in::before,#jaws-home#jaws-home.jh-js .jh-r.is-in .jh-kicker::before{transform:scaleX(1);}\n' +
      '#jaws-page#jaws-page.jp-js .jp-no::after{transform:scaleX(0);transform-origin:0 50%;transition:transform 1s cubic-bezier(.2,.7,.2,1);}\n' +
      '#jaws-page#jaws-page.jp-js .jp-sec.jp-in .jp-no::after,#jaws-page#jaws-page.jp-js .jp-no.jp-in::after{transform:scaleX(1);}\n' +
      '/* Contextual Champagne-Gold Studio Cursor (desktop fine pointer only) */\n' +
      '@media (hover:hover) and (pointer:fine){\n' +
      '  #jh-cursor{position:fixed;left:0;top:0;z-index:2147483500;pointer-events:none;opacity:0;\n' +
      '    display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0;\n' +
      '    border-radius:999px;border:1.25px solid rgba(226,194,125,.78);background:rgba(20,18,17,.08);\n' +
      '    box-shadow:0 0 18px rgba(226,194,125,.14);transform:translate3d(-100px,-100px,0) translate(-50%,-50%);\n' +
      '    transition:opacity .22s ease,width .26s cubic-bezier(.2,.7,.2,1),height .26s cubic-bezier(.2,.7,.2,1),padding .26s cubic-bezier(.2,.7,.2,1),background .26s ease,border-color .26s ease,box-shadow .26s ease;}\n' +
      '  #jh-cursor.is-vis{opacity:1;}\n' +
      '  #jh-cursor .jh-cur-lbl{font:500 10.5px/1 "Apfel Grotezk","Gill Sans MT",system-ui,sans-serif;letter-spacing:.14em;\n' +
      '    text-transform:uppercase;color:#FFF6DE;white-space:nowrap;opacity:0;transform:scale(.85);\n' +
      '    transition:opacity .18s ease,transform .22s cubic-bezier(.2,.7,.2,1);}\n' +
      '  #jh-cursor.has-lbl{height:32px;padding:0 13px;border-color:rgba(240,215,156,.88);\n' +
      '    background:rgba(24,22,20,.82);-webkit-backdrop-filter:blur(10px) saturate(150%);backdrop-filter:blur(10px) saturate(150%);\n' +
      '    box-shadow:0 10px 28px rgba(0,0,0,.42),0 0 18px rgba(226,194,125,.24);}\n' +
      '  #jh-cursor.has-lbl .jh-cur-lbl{opacity:1;transform:none;}\n' +
      '}\n' +
      '@media (prefers-reduced-motion:reduce){\n' +
      '  #jaws-page#jaws-page .jp-dv-filigree .jp-dv-draw{stroke-dashoffset:0;transition:none;}\n' +
      '  #jaws-home#jaws-home.jh-js .jh-kicker.jh-r::before,#jaws-home#jaws-home.jh-js .jh-r .jh-kicker::before,#jaws-page#jaws-page.jp-js .jp-no::after{transform:none;transition:none;}\n' +
      '  #jh-cursor{display:none!important;}\n' +
      '}';
    document.head.appendChild(st);
  }

  function enhanceSubpageArch() {
    var art = document.querySelector('#jaws-page .jp-art');
    if (!art || art.querySelector('.jp-dv-filigree')) return;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'jp-dv-filigree');
    svg.setAttribute('viewBox', '0 0 400 520');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      '<defs><linearGradient id="jpDvG" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#FFF3D1" stop-opacity=".72"/>' +
      '<stop offset="50%" stop-color="#C9A05A" stop-opacity=".35"/>' +
      '<stop offset="100%" stop-color="#E7C987" stop-opacity=".68"/>' +
      '</linearGradient></defs>' +
      '<circle class="jp-dv-draw" cx="200" cy="198" r="176" fill="none" stroke="url(#jpDvG)" stroke-width="0.9"/>' +
      '<circle cx="200" cy="198" r="144" fill="none" stroke="#D9B68C" stroke-opacity=".22" stroke-width="0.65" stroke-dasharray="3 7"/>' +
      '<path class="jp-dv-draw" d="M 32 198 H 368 M 200 18 V 496" fill="none" stroke="#E7C987" stroke-opacity=".24" stroke-width="0.65"/>' +
      '<path class="jp-dv-draw" d="M 52 138 A 190 190 0 0 1 348 138" fill="none" stroke="#FFF3D1" stroke-opacity=".35" stroke-width="0.8"/>';
    art.appendChild(svg);
  }

  function initHairlineObservers() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    var secs = document.querySelectorAll('#jaws-page .jp-sec');
    if (!secs.length) return;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('jp-in');
          io.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    for (var j = 0; j < secs.length; j++) io.observe(secs[j]);
  }

  function initStudioCursor() {
    var mm = window.matchMedia;
    if (!mm) return;
    if (!mm('(hover: hover) and (pointer: fine)').matches) return;
    if (mm('(prefers-reduced-motion: reduce)').matches) return;
    if (!document.body || document.getElementById('jh-cursor')) return;

    var cur = document.createElement('div');
    cur.id = 'jh-cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span class="jh-cur-lbl"></span>';
    document.body.appendChild(cur);
    var lbl = cur.querySelector('.jh-cur-lbl');

    var tx = -120, ty = -120, cx = -120, cy = -120, active = false, raf = 0, currentLbl = '';
    function setLabel(next) {
      if (next === currentLbl) return;
      currentLbl = next;
      lbl.textContent = next;
      cur.classList.toggle('has-lbl', !!next);
    }
    function detectLabel(target) {
      if (!target || !target.closest) return '';
      if (target.closest('input, textarea, select, iframe, [contenteditable="true"]')) return '__HIDE__';
      var custom = target.closest('[data-cursor]');
      if (custom) return custom.getAttribute('data-cursor') || '';
      if (target.closest('.jh-craft-card, .jrr-cmp')) return 'Drag';
      if (target.closest('.jrr-open')) return 'Zoom';
      if (target.closest('.jh-star, .jh-go, .jh-dv-zone, .jh-dv-pill')) return 'Explore';
      if (target.closest('a[href*="/booking"], .jh-btn:not(.ghost), .jp-btn')) return 'Book';
      return '';
    }
    function step() {
      cx += (tx - cx) * 0.24;
      cy += (ty - cy) * 0.24;
      cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-50%)';
      if (active && (Math.abs(tx - cx) > 0.35 || Math.abs(ty - cy) > 0.35)) {
        raf = window.requestAnimationFrame(step);
      } else {
        raf = 0;
      }
    }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      var next = detectLabel(e.target);
      if (next === '__HIDE__') {
        active = false;
        cur.classList.remove('is-vis');
        setLabel('');
        return;
      }
      if (!active) {
        cx = tx;
        cy = ty;
        active = true;
      }
      cur.classList.add('is-vis');
      setLabel(next);
      if (!raf) raf = window.requestAnimationFrame(step);
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      active = false;
      cur.classList.remove('is-vis');
      setLabel('');
    });
    window.addEventListener('touchstart', function () {
      active = false;
      cur.classList.remove('is-vis');
      setLabel('');
    }, { passive: true });
  }

  function initSilkInertiaScroll() {
    var mm = window.matchMedia;
    if (!mm) return;
    if (!mm('(hover: hover) and (pointer: fine)').matches) return;
    if (mm('(prefers-reduced-motion: reduce)').matches) return;

    var curY = window.scrollY || window.pageYOffset || 0;
    var tgtY = curY;
    var raf = 0;
    var wheelActive = false;

    function maxScrollY() {
      return Math.max(0, document.documentElement.scrollHeight - (window.innerHeight || document.documentElement.clientHeight || 0));
    }
    function hasScrollableParent(el) {
      while (el && el !== document.body && el !== document.documentElement) {
        if (el.tagName === 'DIALOG' && el.hasAttribute('open')) return true;
        var s = window.getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2) return true;
        el = el.parentElement;
      }
      return false;
    }
    function tick() {
      if (!wheelActive) { raf = 0; return; }
      var d = tgtY - curY;
      if (Math.abs(d) < 0.6) {
        curY = tgtY;
        window.scrollTo(0, Math.round(curY));
        wheelActive = false;
        raf = 0;
        return;
      }
      curY += d * 0.14;
      window.scrollTo(0, curY);
      raf = window.requestAnimationFrame(tick);
    }

    window.addEventListener('wheel', function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      var rootEl = document.documentElement;
      if (rootEl.classList.contains('jrr-lock') || rootEl.classList.contains('jh-player-open')) return;
      if (e.target && e.target.closest && e.target.closest('dialog[open], .jrr-lb[open], #hamburger-drawer, select, textarea, [data-no-inertia]')) return;
      if (hasScrollableParent(e.target)) return;

      var delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 32;
      else if (e.deltaMode === 2) delta *= (window.innerHeight || 800);

      if (!wheelActive) {
        curY = window.scrollY || window.pageYOffset || 0;
        tgtY = curY;
      }
      tgtY = Math.min(maxScrollY(), Math.max(0, tgtY + delta * 0.95));
      e.preventDefault();
      wheelActive = true;
      if (!raf) raf = window.requestAnimationFrame(tick);
    }, { passive: false });

    function cancelInertia() {
      if (!wheelActive) return;
      wheelActive = false;
      curY = tgtY = window.scrollY || window.pageYOffset || 0;
    }
    window.addEventListener('scroll', function () {
      if (!wheelActive) {
        curY = tgtY = window.scrollY || window.pageYOffset || 0;
      }
    }, { passive: true });
    window.addEventListener('pointerdown', cancelInertia, { passive: true });
    window.addEventListener('keydown', function (e) {
      if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)) cancelInertia();
    }, { passive: true });
    window.addEventListener('hashchange', cancelInertia);
  }

  function bindEvents() {
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate, { passive: true });
    window.addEventListener('load', runEnhancements);

    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('button.hamburgerButton')) {
        window.setTimeout(injectDrawerCta, 40);
        window.setTimeout(injectDrawerCta, 180);
      }
    }, { passive: true });
  }

  bindEvents();
  initSilkInertiaScroll();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      runEnhancements();
      watchDom();
    });
  } else {
    runEnhancements();
    watchDom();
  }
})();
