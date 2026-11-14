/* ==========================================================================
   CiviCats - Modo escuro: botão do menu + preferência salva
   (o atributo data-theme é definido antes da pintura por um script no <head>)
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'civicats-theme';
  var root = document.documentElement;

  function current() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1530' : '#7ecbf7');
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      var dark = theme === 'dark';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.setAttribute('aria-label', dark ? 'Desativar modo escuro' : 'Ativar modo escuro');
      btn.title = dark ? 'Voltar ao modo claro' : 'Modo escuro';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    apply(current());
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        apply(next);
        try { localStorage.setItem(KEY, next); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
      });
    });
  });
})();
