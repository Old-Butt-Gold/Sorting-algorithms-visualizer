/* Sortlab — small shared utilities. No framework, no magic. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};

  const numberFormat = new Intl.NumberFormat('en-US');

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function fmtInt(value) {
    if (!Number.isFinite(value)) return '—';
    return numberFormat.format(Math.round(value));
  }

  function fmtDuration(seconds) {
    const safe = Math.max(0, seconds);
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    const tenths = Math.floor((safe % 1) * 10);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + tenths;
  }

  function hashString(text) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function parseSeed(input) {
    if (typeof input === 'number' && Number.isFinite(input)) return input >>> 0;
    const raw = String(input == null ? '' : input).trim().replace(/^#/, '').replace(/^0x/i, '');
    if (!raw) return null;
    if (/^[0-9a-f]{1,8}$/i.test(raw)) return parseInt(raw, 16) >>> 0;
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return numeric >>> 0;
    return null;
  }

  function formatSeed(seed) {
    return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced() {
      const args = arguments;
      const self = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        timer = 0;
        fn.apply(self, args);
      }, wait);
    };
  }

  function rafThrottle(fn) {
    let frame = 0;
    let lastArgs = null;
    return function throttled() {
      lastArgs = arguments;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        fn.apply(null, lastArgs);
      });
    };
  }

  function prefersReducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function copyText(text) {
    if (global.navigator && global.navigator.clipboard && global.isSecureContext) {
      return global.navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function downloadText(text, filename, mime) {
    downloadBlob(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }), filename);
  }

  function nextFrame() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { resolve(); });
    });
  }

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  SAV.util = {
    clamp: clamp,
    fmtInt: fmtInt,
    fmtDuration: fmtDuration,
    hashString: hashString,
    parseSeed: parseSeed,
    formatSeed: formatSeed,
    debounce: debounce,
    rafThrottle: rafThrottle,
    prefersReducedMotion: prefersReducedMotion,
    copyText: copyText,
    downloadBlob: downloadBlob,
    downloadText: downloadText,
    nextFrame: nextFrame,
    isTypingTarget: isTypingTarget
  };
})(typeof window !== 'undefined' ? window : globalThis);
