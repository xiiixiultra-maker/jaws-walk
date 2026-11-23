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
    updateHeaderScroll();
    injectDrawerCta();
    upgradeFooter();
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
