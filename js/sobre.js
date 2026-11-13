/* ==========================================================================
   CiviCats - Sobre & Contato: formulário com envio real (Web3Forms)
   --------------------------------------------------------------------------
   O endpoint e a chave ficam no <form> (data-endpoint / data-access-key).
   A chave do Web3Forms é pública por design e só envia para o e-mail que a criou.
   ========================================================================== */

(function () {
  'use strict';

  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = document.getElementById('form-submit-btn');
  const submitLabel = submitBtn.querySelector('.form-submit-label');
  const okBanner = document.getElementById('form-success');
  const errBanner = document.getElementById('form-error');
  const errText = document.getElementById('form-error-text');
  const message = document.getElementById('form-message');
  const counter = document.getElementById('message-count');

  const LABEL_IDLE = submitLabel.textContent;
  const MIN_INTERVAL_MS = 15000;     // evita envios repetidos em sequência
  const TIMEOUT_MS = 15000;
  let lastSentAt = 0;
  let sending = false;

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  /* ---------- Validação ---------- */
  function validateField(input) {
    const group = input.closest('.form-group');
    const value = input.value.trim();
    let ok = value.length > 0;
    if (ok && input.type === 'email') ok = isValidEmail(value);
    group.classList.toggle('has-error', !ok);
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }

  const fields = Array.from(form.querySelectorAll('.form-input'));

  fields.forEach(function (input) {
    // limpa o erro assim que a pessoa corrige; revalida ao sair do campo
    input.addEventListener('input', function () {
      if (input.closest('.form-group').classList.contains('has-error')) validateField(input);
      hideBanners();
    });
    input.addEventListener('blur', function () {
      if (input.value.trim() !== '' || input.closest('.form-group').classList.contains('has-error')) {
        validateField(input);
      }
    });
  });

  /* ---------- Contador de caracteres ---------- */
  function updateCounter() {
    const max = message.maxLength > 0 ? message.maxLength : 1500;
    const len = message.value.length;
    counter.textContent = len + '/' + max;
    counter.classList.toggle('is-near', len >= max * 0.9);
  }
  message.addEventListener('input', updateCounter);
  updateCounter();

  /* ---------- Avisos ---------- */
  function hideBanners() {
    okBanner.hidden = true;
    errBanner.hidden = true;
  }

  function showError(text) {
    okBanner.hidden = true;
    errText.textContent = text;
    errBanner.hidden = false;
  }

  function showSuccess() {
    errBanner.hidden = true;
    okBanner.hidden = false;
    okBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setSending(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
    submitBtn.classList.toggle('is-sending', on);
    submitLabel.textContent = on ? 'Enviando' : LABEL_IDLE;
  }

  /* ---------- Envio ---------- */
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (sending) return;
    hideBanners();

    let firstInvalid = null;
    fields.forEach(function (input) {
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // Campo isca: robôs preenchem, pessoas não. Finge sucesso e não envia.
    const honeypot = form.querySelector('input[name="website"]');
    if (honeypot && honeypot.value.trim() !== '') {
      form.reset();
      updateCounter();
      showSuccess();
      return;
    }

    const endpoint = form.getAttribute('data-endpoint');
    const accessKey = (form.getAttribute('data-access-key') || '').trim();

    if (!endpoint || !accessKey || /^COLE_/i.test(accessKey)) {
      console.warn('[CiviCats] Formulário sem chave: defina data-access-key no <form id="contact-form"> (veja o comentário no sobre.html).');
      showError('O envio de mensagens ainda não foi ativado neste site. Tente novamente mais tarde.');
      return;
    }

    const wait = MIN_INTERVAL_MS - (Date.now() - lastSentAt);
    if (wait > 0) {
      showError('Aguarde ' + Math.ceil(wait / 1000) + ' segundos antes de enviar outra mensagem.');
      return;
    }

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const subject = form.elements.subject.value;
    const text = form.elements.message.value.trim();

    const payload = {
      access_key: accessKey,
      subject: '[CiviCats] ' + subject,
      from_name: 'Site CiviCats',
      name: name,
      email: email,
      message: 'Assunto: ' + subject + '\n\n' + text
    };

    const controller = 'AbortController' in window ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    setSending(true);

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data && result.data.success) {
          lastSentAt = Date.now();
          form.reset();
          fields.forEach(function (f) {
            f.closest('.form-group').classList.remove('has-error');
            f.removeAttribute('aria-invalid');
          });
          updateCounter();
          showSuccess();
        } else {
          console.warn('[CiviCats] Falha no envio:', result.data);
          showError('Não foi possível enviar a mensagem agora. Confira os dados e tente novamente em instantes.');
        }
      })
      .catch(function (error) {
        console.warn('[CiviCats] Erro de rede no envio:', error);
        showError(error && error.name === 'AbortError'
          ? 'O envio demorou demais. Verifique sua conexão e tente novamente.'
          : 'Sem conexão com o serviço de envio. Verifique sua internet e tente novamente.');
      })
      .then(function () {
        if (timer) clearTimeout(timer);
        setSending(false);
      });
  });
})();
