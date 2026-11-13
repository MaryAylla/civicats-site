/* ==========================================================================
   CiviCats - Metodologia: interações da página
   ========================================================================== */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Caixa de diálogo do gatinho guia (texto digitando) ---------- */
  function setupGuideDialog() {
    const box = document.getElementById('guide-dialog');
    const textEl = document.getElementById('guide-text');
    const nextBtn = document.getElementById('guide-next');
    if (!box || !textEl) return;

    const lines = [
      'Olá! Aqui você descobre como o CiviCats foi criado.',
      'Foram quatro etapas: arte, programação, módulos e testes na escola.',
      'Explore as etapas abaixo e experimente os recursos de acessibilidade!'
    ];

    let index = 0;
    let typer = null;
    let autoTimer = null;
    let typing = false;

    function clearTimers() {
      clearInterval(typer);
      clearTimeout(autoTimer);
    }

    function finishLine() {
      clearTimers();
      typing = false;
      textEl.textContent = lines[index];
      if (!reduceMotion) {
        autoTimer = setTimeout(nextLine, 3600);
      }
    }

    function typeLine() {
      clearTimers();
      const line = lines[index];
      if (reduceMotion) {
        textEl.textContent = line;
        typing = false;
        return;
      }
      typing = true;
      let i = 0;
      textEl.textContent = '';
      typer = setInterval(function () {
        i += 1;
        textEl.textContent = line.slice(0, i);
        if (i >= line.length) finishLine();
      }, 28);
    }

    function nextLine() {
      index = (index + 1) % lines.length;
      typeLine();
    }

    function onActivate() {
      if (typing) finishLine();
      else nextLine();
    }

    box.addEventListener('click', function (e) {
      if (e.target === nextBtn) return;
      onActivate();
    });
    nextBtn.addEventListener('click', onActivate);

    // Só começa a digitar quando o diálogo está visível
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!textEl.textContent) typeLine();
          } else {
            clearTimers();
            typing = false;
            if (textEl.textContent) textEl.textContent = lines[index];
          }
        });
      }, { threshold: 0.3 });
      io.observe(box);
    } else {
      typeLine();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearTimers(); typing = false; }
      else if (textEl.textContent) { finishLine(); }
    });
  }

  /* ---------- 2. Mapa de etapas (tablist acessível) ---------- */
  function setupStageMap() {
    const map = document.getElementById('stage-map');
    if (!map) return;

    const tabs = Array.from(map.querySelectorAll('[role="tab"]'));
    const panels = Array.from(map.querySelectorAll('[role="tabpanel"]'));
    let current = 0;

    function select(i, focus) {
      current = Math.max(0, Math.min(tabs.length - 1, i));
      map.style.setProperty('--i', current);

      tabs.forEach(function (tab, n) {
        const active = n === current;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.setAttribute('tabindex', active ? '0' : '-1');
        tab.classList.toggle('is-active', active);
        tab.classList.toggle('is-done', n < current);
      });
      panels.forEach(function (panel, n) {
        panel.hidden = n !== current;
      });
      if (focus) tabs[current].focus();
    }

    tabs.forEach(function (tab, n) {
      tab.addEventListener('click', function () { select(n); });
      tab.addEventListener('keydown', function (e) {
        let target = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = (current + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = (current - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') target = 0;
        else if (e.key === 'End') target = tabs.length - 1;
        if (target !== null) {
          e.preventDefault();
          select(target, true);
        }
      });
    });

    map.querySelectorAll('[data-stage-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        select(current + Number(btn.getAttribute('data-stage-step')));
        // mantém o mapa à vista ao trocar de etapa em telas pequenas
        const top = map.getBoundingClientRect().top;
        if (top < 0) map.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });

    select(0);
  }

  /* ---------- 3. Demonstração de acessibilidade ---------- */
  function setupA11yDemo() {
    const screen = document.getElementById('demo-screen');
    if (!screen) return;

    const sizeBtn = document.getElementById('demo-size');
    const contrastBtn = document.getElementById('demo-contrast');
    const okBtn = document.getElementById('demo-ok');
    const errBtn = document.getElementById('demo-err');
    const status = document.getElementById('demo-status');

    function say(msg) { if (status) status.textContent = msg; }

    sizeBtn.addEventListener('click', function () {
      const on = sizeBtn.getAttribute('aria-pressed') !== 'true';
      sizeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      screen.setAttribute('data-size', on ? 'large' : 'normal');
      say(on ? 'Texto ampliado.' : 'Texto no tamanho padrão.');
    });

    contrastBtn.addEventListener('click', function () {
      const on = contrastBtn.getAttribute('aria-pressed') !== 'true';
      contrastBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      screen.setAttribute('data-contrast', on ? 'high' : 'normal');
      say(on ? 'Alto contraste ligado.' : 'Alto contraste desligado.');
    });

    // Sons simples gerados no navegador (sem arquivos de áudio)
    let ctx = null;
    function tone(freq, start, dur, type, vol) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    }

    function play(kind) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { say('Seu navegador não suporta áudio nesta demonstração.'); return; }
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      if (kind === 'ok') {
        tone(660, 0, 0.12, 'square', 0.08);
        tone(880, 0.12, 0.18, 'square', 0.08);
        say('Som de acerto tocado.');
      } else {
        tone(220, 0, 0.18, 'sawtooth', 0.08);
        tone(165, 0.18, 0.25, 'sawtooth', 0.08);
        say('Som de erro tocado.');
      }
    }

    okBtn.addEventListener('click', function () { play('ok'); });
    errBtn.addEventListener('click', function () { play('err'); });
  }

  /* ---------- 4. Cartas de resultado que viram ---------- */
  function setupFlipCards() {
    document.querySelectorAll('.flip-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const flipped = card.classList.toggle('is-flipped');
        card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
      });
    });
  }

  /* ---------- 5. Índice lateral: destaca a seção atual ---------- */
  function setupSectionRail() {
    const rail = document.getElementById('section-rail');
    if (!rail || !('IntersectionObserver' in window)) return;

    const links = Array.from(rail.querySelectorAll('a[data-target]'));
    const map = {};
    links.forEach(function (a) { map[a.getAttribute('data-target')] = a; });

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.remove('is-current');
          a.removeAttribute('aria-current');
        });
        const a = map[entry.target.id];
        if (a) {
          a.classList.add('is-current');
          a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    Object.keys(map).forEach(function (id) {
      const section = document.getElementById(id);
      if (section) io.observe(section);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupGuideDialog();
    setupStageMap();
    setupA11yDemo();
    setupFlipCards();
    setupSectionRail();
  });
})();
