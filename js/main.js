/* Sortlab — boot. Everything else is a classic script on purpose: the page
   must keep working when opened directly from disk, without a bundler. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  SAV.VERSION = '2.0.0';

  function fail(error) {
    if (global.console && global.console.error) global.console.error(error);
    const status = document.getElementById('statusBadge');
    if (status) {
      status.textContent = 'Could not start';
      status.dataset.state = 'error';
    }
    const overlay = document.getElementById('buildOverlay');
    const text = document.getElementById('buildText');
    if (overlay && text) {
      overlay.hidden = false;
      text.textContent = 'The visualizer could not start. Reload the page or check the console.';
    }
    if (SAV.ui && SAV.ui.toast) {
      SAV.ui.toast(error && error.message ? error.message : 'Unexpected startup error', 'error', 'Could not start.');
    }
  }

  function boot() {
    if (!SAV.App) {
      fail(new Error('Application modules did not load.'));
      return;
    }
    const app = new SAV.App();
    SAV.app = app;
    app.init().catch(function (error) {
      fail(error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
