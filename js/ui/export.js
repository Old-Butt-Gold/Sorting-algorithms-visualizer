/* Sortlab — share link, seed copy, PNG / CSV / JSON exports. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;
  const ui = SAV.ui = SAV.ui || {};

  function $(id) {
    return document.getElementById(id);
  }

  function initExport(app) {
    const menu = $('exportMenu');
    const button = $('exportBtn');
    const share = $('shareBtn');
    const seedChip = $('seedChip');

    function closeMenu() {
      if (!menu || !button) return;
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
      if (!menu || !button) return;
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      const first = menu.querySelector('button');
      if (first) first.focus();
    }

    if (button && menu) {
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        if (menu.hidden) openMenu();
        else closeMenu();
      });
      document.addEventListener('pointerdown', function (event) {
        if (menu.hidden) return;
        if (event.target.closest && event.target.closest('.menu-wrap')) return;
        closeMenu();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !menu.hidden) {
          closeMenu();
          button.focus();
        }
      });
    }

    async function copyLink() {
      const url = app.getShareURL();
      if (!url) {
        ui.toast('This browser cannot build a share URL.', 'error');
        return;
      }
      try {
        await U.copyText(url);
        ui.toast('Link copied — seed, size, distribution and view are all inside.', 'success', 'Configuration copied.');
      } catch (error) {
        ui.toast('Copy failed. The link is in the address bar.', 'warn');
      }
    }

    if (share) share.addEventListener('click', copyLink);
    if (seedChip) {
      seedChip.addEventListener('click', async function () {
        const config = app.config;
        try {
          await U.copyText(U.formatSeed(config.seed));
          ui.toast('Seed #' + U.formatSeed(config.seed) + ' copied. Paste it back any time to rebuild this exact array.', 'success', 'Seed copied.');
        } catch (error) {
          ui.toast('Could not copy the seed.', 'warn');
        }
      });
    }

    if (menu) {
      menu.addEventListener('click', function (event) {
        const action = event.target.closest('[data-export]');
        if (!action) return;
        closeMenu();
        const kind = action.getAttribute('data-export');
        if (kind === 'link') {
          copyLink();
          return;
        }
        if (kind === 'png') exportPng(app);
        else if (kind === 'csv') exportCsv(app);
        else if (kind === 'json') exportJson(app);
      });
    }

    return { closeMenu: closeMenu, copyLink: copyLink };
  }

  function filename(app, extension) {
    const config = app.config;
    const log = app.getLog ? app.getLog() : null;
    const cursor = app.getCursor ? app.getCursor() : 0;
    const name = (log && log.def ? log.def.id : config.alg) + '-' + U.formatSeed(config.seed) + '-op' + Math.round(cursor);
    return 'sortlab-' + name + '.' + extension;
  }

  function exportPng(app) {
    const canvas = app.getExportCanvas();
    if (!canvas) {
      ui.toast('There is no frame to export yet.', 'warn');
      return;
    }
    const finish = function (blob) {
      if (!blob) {
        ui.toast('The browser refused to encode the canvas.', 'error');
        return;
      }
      U.downloadBlob(blob, filename(app, 'png'));
      ui.toast('PNG saved with the current array state.', 'success', 'Frame exported.');
    };
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(finish, 'image/png');
    } else {
      try {
        const data = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = data;
        link.download = filename(app, 'png');
        link.click();
        ui.toast('PNG saved with the current array state.', 'success', 'Frame exported.');
      } catch (error) {
        ui.toast('Could not export this canvas.', 'error');
      }
    }
  }

  function exportCsv(app) {
    const snapshot = app.getSnapshot();
    if (!snapshot) {
      ui.toast('Nothing to export yet.', 'warn');
      return;
    }
    const lines = ['index,current_value,target_value,locked'];
    for (let i = 0; i < snapshot.values.length; i++) {
      lines.push([
        i,
        snapshot.values[i],
        snapshot.sortedValues[i],
        snapshot.locked[i] ? 1 : 0
      ].join(','));
    }
    U.downloadText(lines.join('\r\n'), filename(app, 'csv'), 'text/csv;charset=utf-8');
    ui.toast('CSV contains the current frame and the target order.', 'success', 'Array exported.');
  }

  function exportJson(app) {
    const snapshot = app.getSnapshot();
    if (!snapshot) {
      ui.toast('Nothing to export yet.', 'warn');
      return;
    }
    const payload = {
      app: 'sortlab',
      version: SAV.VERSION || '2.0.0',
      generatedAt: new Date().toISOString(),
      config: snapshot.config,
      algorithm: snapshot.algorithm,
      seed: U.formatSeed(snapshot.config.seed),
      distribution: snapshot.config.dist,
      cursor: snapshot.cursor,
      total: snapshot.total,
      verified: snapshot.verified,
      counts: snapshot.counts,
      values: snapshot.values,
      sortedValues: snapshot.sortedValues,
      locked: snapshot.locked
    };
    U.downloadText(JSON.stringify(payload, null, 2), filename(app, 'json'), 'application/json;charset=utf-8');
    ui.toast('JSON includes the settings, counters and both arrays.', 'success', 'Run exported.');
  }

  ui.initExport = initExport;
})(typeof window !== 'undefined' ? window : globalThis);
