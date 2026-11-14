/* ==========================================================================
   CiviCats - Downloads: guias em abas, link copiável, plataforma sugerida
   e conferência opcional da última release no GitHub (com fallback estático).
   ========================================================================== */

(function () {
  'use strict';

  var REPO_API = 'https://api.github.com/repos/MaryAylla/civicats-site/releases/latest';
  var PAGE_VERSION = '1.1.0';

  /* ---------- Abas dos guias ---------- */
  function setupGuideTabs() {
    var root = document.getElementById('install-guide');
    if (!root) return null;
    var tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    var panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));

    function select(i, focus) {
      tabs.forEach(function (tab, n) {
        var on = n === i;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.setAttribute('tabindex', on ? '0' : '-1');
        tab.classList.toggle('is-active', on);
      });
      panels.forEach(function (p, n) { p.hidden = n !== i; });
      if (focus) tabs[i].focus();
    }

    tabs.forEach(function (tab, n) {
      tab.addEventListener('click', function () { select(n); });
      tab.addEventListener('keydown', function (e) {
        var t = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') t = (n + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') t = (n - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') t = 0;
        else if (e.key === 'End') t = tabs.length - 1;
        if (t !== null) { e.preventDefault(); select(t, true); }
      });
    });
    return select;
  }

  /* ---------- Plataforma sugerida (card + aba do guia) ---------- */
  function setupRecommended(selectTab) {
    var ua = navigator.userAgent || '';
    var platform = /Android/i.test(ua) ? 'android' : (/Windows/i.test(ua) ? 'windows' : null);
    if (!platform) return;
    var card = document.getElementById('card-' + platform);
    if (!card) return;
    var tag = card.querySelector('.rec-tag');
    if (tag) tag.hidden = false;
    card.classList.add('is-detected');
    if (selectTab && platform === 'android') selectTab(1);
  }

  /* ---------- Copiar link ---------- */
  function setupCopyLinks() {
    document.querySelectorAll('.copy-link').forEach(function (btn) {
      var idle = btn.textContent;
      var timer = null;

      function flash(text) {
        btn.textContent = text;
        btn.classList.add('is-copied');
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.textContent = idle;
          btn.classList.remove('is-copied');
        }, 2200);
      }

      btn.addEventListener('click', function () {
        var url = btn.getAttribute('data-url');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { flash('Link copiado!'); }, fallback);
        } else {
          fallback();
        }
        function fallback() {
          var ta = document.createElement('textarea');
          ta.value = url;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = false;
          try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
          document.body.removeChild(ta);
          flash(ok ? 'Link copiado!' : 'Não foi possível copiar');
        }
      });
    });
  }

  /* ---------- Conferência da release no GitHub ---------- */
  function formatSize(bytes) {
    var mb = bytes / (1024 * 1024);
    return '~' + Math.round(mb) + ' MB';
  }

  function formatBytes(bytes) {
    return String(bytes).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' bytes';
  }

  function checkRelease() {
    if (!('fetch' in window)) return;
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 6000) : null;

    fetch(REPO_API, { headers: { 'Accept': 'application/vnd.github+json' }, signal: controller ? controller.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rel) {
        var tag = String(rel.tag_name || '').replace(/^v/i, '');
        if (!tag) return;

        if (tag === PAGE_VERSION) {
          (rel.assets || []).forEach(function (asset) {
            var name = String(asset.name || '').toLowerCase();
            var key = name.slice(-4) === '.exe' ? 'exe' : (name.slice(-4) === '.apk' ? 'apk' : null);
            var size = Number(asset.size);
            var el = key && document.querySelector('.size-value[data-asset="' + key + '"]');
            if (el && size > 0) {
              el.textContent = formatSize(size);
              el.title = formatBytes(size);
            }
          });
        } else {
          var url = String(rel.html_url || '');
          var notice = document.getElementById('release-notice');
          if (notice && url.indexOf('https://github.com/MaryAylla/') === 0) {
            notice.textContent = 'Há uma versão mais nova (' + tag + ') no GitHub. ';
            var a = document.createElement('a');
            a.href = url;
            a.textContent = 'Ver a versão ' + tag;
            a.rel = 'noopener';
            notice.appendChild(a);
            notice.hidden = false;
          }
        }
      })
      .catch(function () { /* silencioso: valores estáticos continuam valendo */ })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var selectTab = setupGuideTabs();
    setupRecommended(selectTab);
    setupCopyLinks();
    checkRelease();
  });
})();
