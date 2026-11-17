/* Sortlab — toasts, clamped tooltips and the help dialog. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;
  const ui = SAV.ui = SAV.ui || {};

  let toastRoot = null;

  function ensureToastRoot() {
    if (!toastRoot) toastRoot = document.getElementById('toasts');
    return toastRoot;
  }

  function toast(message, kind, title) {
    const root = ensureToastRoot();
    if (!root) return;
    while (root.children.length >= 3) root.removeChild(root.firstChild);
    const el = document.createElement('div');
    el.className = 'toast';
    el.dataset.kind = kind || 'success';

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = kind === 'error' ? '!' : kind === 'warn' ? '!' : kind === 'info' ? 'i' : '✓';

    const body = document.createElement('div');
    body.className = 'toast-body';
    if (title) {
      const strong = document.createElement('strong');
      strong.textContent = title;
      body.appendChild(strong);
      body.appendChild(document.createTextNode(' '));
    }
    body.appendChild(document.createTextNode(String(message)));

    el.appendChild(icon);
    el.appendChild(body);
    root.appendChild(el);

    const remove = function remove() {
      if (!el.isConnected) return;
      el.classList.add('is-out');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    };
    const timer = setTimeout(remove, 3400);
    el.addEventListener('click', function () {
      clearTimeout(timer);
      remove();
    });
    return el;
  }

  function initTooltip() {
    const tip = document.getElementById('tooltip');
    if (!tip) return;
    let current = null;

    function hide() {
      current = null;
      tip.hidden = true;
      tip.textContent = '';
    }

    function show(target) {
      const text = target.getAttribute('data-tip');
      if (!text) return;
      if (target.disabled) return;
      current = target;
      tip.textContent = text;
      tip.hidden = false;
      const rect = target.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      const margin = 8;
      let left = rect.left + rect.width / 2 - tipRect.width / 2;
      left = U.clamp(left, margin, window.innerWidth - tipRect.width - margin);
      let top = rect.top - tipRect.height - 8;
      if (top < margin) top = rect.bottom + 8;
      if (top + tipRect.height > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - tipRect.height - margin);
      }
      tip.style.left = Math.round(left) + 'px';
      tip.style.top = Math.round(top) + 'px';
    }

    document.addEventListener('pointerover', function (event) {
      const target = event.target.closest ? event.target.closest('[data-tip]') : null;
      if (!target || target === current) return;
      show(target);
    });
    document.addEventListener('pointerout', function (event) {
      const target = event.target.closest ? event.target.closest('[data-tip]') : null;
      if (target && target === current) hide();
    });
    document.addEventListener('focusin', function (event) {
      const target = event.target.closest ? event.target.closest('[data-tip]') : null;
      if (target) show(target);
    });
    document.addEventListener('focusout', hide);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') hide();
    });
  }

  function initHelp() {
    const dialog = document.getElementById('helpDialog');
    const openBtn = document.getElementById('helpBtn');
    if (!dialog || !openBtn) return;

    function open() {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }

    function close() {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    }

    openBtn.addEventListener('click', open);
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) close();
      if (event.target.closest && event.target.closest('[data-close-dialog]')) close();
    });
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });

    return { open: open, close: close };
  }

  ui.toast = toast;
  ui.initTooltip = initTooltip;
  ui.initHelp = initHelp;
})(typeof window !== 'undefined' ? window : globalThis);
