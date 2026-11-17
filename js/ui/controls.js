/* Sortlab — the control deck: picker, sliders, chips, transport, toggles. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;
  const S = SAV.state;
  const ui = SAV.ui = SAV.ui || {};

  function $(id) {
    return document.getElementById(id);
  }

  function Controls(app) {
    this.app = app;
    this.config = app.config;
    this.algorithm = app.algorithm;
    this.pickerOpen = false;
    this.optionButtons = [];
    this.transportState = { playing: false, cursor: 0, total: 0 };
    this.bind();
    this.buildAlgorithmList();
    this.buildDistributions();
    this.syncAll();
  }

  Controls.prototype.bind = function bind() {
    const self = this;

    const algoBtn = $('algoBtn');
    const algoList = $('algoList');
    if (algoBtn) {
      algoBtn.addEventListener('click', function () {
        if (self.pickerOpen) self.closePicker();
        else self.openPicker();
      });
      algoBtn.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowDown' && !self.pickerOpen) {
          event.preventDefault();
          self.openPicker();
        }
      });
    }
    if (algoList) {
      algoList.addEventListener('keydown', function (event) {
        self.onPickerKey(event);
      });
    }
    document.addEventListener('pointerdown', function (event) {
      if (!self.pickerOpen) return;
      const picker = $('algoPicker');
      if (picker && !picker.contains(event.target)) self.closePicker();
    });

    const bindRange = function (id, handler) {
      const input = $(id);
      if (!input) return;
      const update = function () {
        self.paintRange(input);
        handler(Number(input.value));
      };
      input.addEventListener('input', update);
      self.paintRange(input);
    };

    bindRange('sizeRange', function (value) { self.app.setSize(value); });
    bindRange('speedRange', function (value) { self.app.setSpeed(S.speedFromSlider(value)); });
    bindRange('volumeRange', function (value) { self.app.setVolume(value / 100); });

    const sizeOut = $('sizeOut');
    if (sizeOut) sizeOut.textContent = String(this.config.size);

    const schemeSeg = $('schemeSeg');
    if (schemeSeg) {
      schemeSeg.addEventListener('click', function (event) {
        const btn = event.target.closest('[data-scheme]');
        if (!btn) return;
        self.app.setQuickOption('scheme', btn.getAttribute('data-scheme'));
      });
    }
    const pivotSeg = $('pivotSeg');
    if (pivotSeg) {
      pivotSeg.addEventListener('click', function (event) {
        const btn = event.target.closest('[data-pivot]');
        if (!btn) return;
        self.app.setQuickOption('pivot', btn.getAttribute('data-pivot'));
      });
    }

    const renderModes = $('renderModes');
    if (renderModes) {
      renderModes.addEventListener('click', function (event) {
        const btn = event.target.closest('[data-mode]');
        if (!btn) return;
        self.app.setView(btn.getAttribute('data-mode'));
      });
    }

    const paletteRow = $('paletteRow');
    if (paletteRow) {
      paletteRow.addEventListener('click', function (event) {
        const btn = event.target.closest('[data-palette]');
        if (!btn) return;
        self.app.setPalette(btn.getAttribute('data-palette'));
      });
    }

    const valuesToggle = $('valuesToggle');
    if (valuesToggle) {
      valuesToggle.addEventListener('change', function () {
        self.app.setToggle('values', valuesToggle.checked, true);
      });
    }
    const glowToggle = $('glowToggle');
    if (glowToggle) {
      glowToggle.addEventListener('change', function () {
        self.app.setToggle('glow', glowToggle.checked, true);
      });
    }
    const treeToggle = $('treeToggle');
    if (treeToggle) {
      treeToggle.addEventListener('change', function () {
        self.app.setToggle('tree', treeToggle.checked, false);
      });
    }

    ['soundBtn', 'muteBtn'].forEach(function (id) {
      const btn = $(id);
      if (btn) {
        btn.addEventListener('click', function () {
          self.app.setSound(!self.app.config.sound);
        });
      }
    });

    const bindTransport = function (id, handler) {
      const btn = $(id);
      if (!btn) return;
      btn.addEventListener('click', handler);
    };

    bindTransport('playBtn', function () { self.app.togglePlay(); });
    bindTransport('miniPlay', function () { self.app.togglePlay(); });
    bindTransport('stepBack', function () { self.app.step(-1); });
    bindTransport('stepFwd', function () { self.app.step(1); });
    bindTransport('miniStep', function () { self.app.step(1); });
    bindTransport('toStart', function () { self.app.seek(0, false); });
    bindTransport('toEnd', function () { self.app.seek(self.app.getTotal(), false); });
    bindTransport('resetBtn', function () { self.app.seek(0, true); });
    bindTransport('miniReset', function () { self.app.seek(0, true); });
    bindTransport('newBtn', function () { self.app.newArray(); });
    bindTransport('miniNew', function () { self.app.newArray(); });
    bindTransport('repeatBtn', function () { self.app.repeatSeed(); });

    const scrub = $('scrub');
    if (scrub) {
      scrub.addEventListener('input', function () {
        self.app.seek(Number(scrub.value), false);
      });
      scrub.addEventListener('pointerdown', function () {
        self.app.beginScrub();
      });
      scrub.addEventListener('pointerup', function () {
        self.app.endScrub();
      });
    }
  };

  Controls.prototype.buildAlgorithmList = function buildAlgorithmList() {
    const list = $('algoList');
    if (!list) return;
    list.textContent = '';
    this.optionButtons = [];
    const groups = SAV.algorithmGroups();
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      const sep = document.createElement('div');
      sep.className = 'picker-sep';
      sep.textContent = group.family;
      list.appendChild(sep);
      for (let i = 0; i < group.algorithms.length; i++) {
        const def = group.algorithms[i];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'algo-option';
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', 'false');
        button.id = 'algo-opt-' + def.id;
        button.dataset.alg = def.id;

        const main = document.createElement('span');
        main.className = 'algo-option-main';
        const name = document.createElement('span');
        name.className = 'algo-option-name';
        name.textContent = def.name;
        const meta = document.createElement('span');
        meta.className = 'algo-option-meta';
        meta.textContent = 'avg ' + def.complexity.avg + ' · ' + def.complexity.space;
        main.appendChild(name);
        main.appendChild(meta);

        const badges = document.createElement('span');
        badges.className = 'algo-option-badges';
        const avgBadge = document.createElement('span');
        avgBadge.className = 'mini-badge';
        avgBadge.textContent = def.complexity.avg;
        const stability = document.createElement('span');
        stability.className = 'mini-badge ' + (def.stability === 'stable' ? 'stable' : 'unstable');
        stability.textContent = def.stability;
        badges.appendChild(avgBadge);
        badges.appendChild(stability);

        button.appendChild(main);
        button.appendChild(badges);
        button.addEventListener('click', function () {
          this.closePicker();
          this.app.setAlgorithm(def.id);
        }.bind(this));
        list.appendChild(button);
        this.optionButtons.push(button);
      }
    }
  };

  Controls.prototype.setAlgorithm = function setAlgorithm(def, config) {
    this.algorithm = def;
    this.config = config;
    const pickerName = $('pickerName');
    const pickerMeta = $('pickerMeta');
    const family = $('algoFamily');
    if (pickerName) pickerName.textContent = def.name;
    if (pickerMeta) pickerMeta.textContent = 'avg ' + def.complexity.avg + ' · ' + def.complexity.space + ' · ' + def.stability;
    if (family) family.textContent = def.family;

    for (let i = 0; i < this.optionButtons.length; i++) {
      this.optionButtons[i].setAttribute('aria-selected', this.optionButtons[i].dataset.alg === def.id ? 'true' : 'false');
    }
    const algoBtn = $('algoBtn');
    if (algoBtn) algoBtn.setAttribute('aria-activedescendant', 'algo-opt-' + def.id);

    const quickOpts = $('quickOpts');
    if (quickOpts) quickOpts.hidden = def.id !== 'quick';
    this.syncQuick(config);
    const treeWrap = $('treeToggleWrap');
    if (treeWrap) treeWrap.hidden = def.id !== 'heap';
    const treeToggle = $('treeToggle');
    if (treeToggle) treeToggle.checked = !!config.tree;
  };

  Controls.prototype.syncQuick = function syncQuick(config) {
    const scheme = $('schemeSeg');
    if (scheme) {
      const buttons = scheme.querySelectorAll('[data-scheme]');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-scheme') === config.scheme ? 'true' : 'false');
      }
    }
    const pivot = $('pivotSeg');
    if (pivot) {
      const buttons = pivot.querySelectorAll('[data-pivot]');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-pivot') === config.pivot ? 'true' : 'false');
      }
    }
  };

  Controls.prototype.buildDistributions = function buildDistributions() {
    const root = $('distChips');
    if (!root) return;
    root.textContent = '';
    const self = this;
    S.DISTRIBUTIONS.forEach(function (dist) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip-btn';
      button.dataset.dist = dist.id;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = dist.label;
      button.addEventListener('click', function () {
        self.app.setDistribution(dist.id);
      });
      root.appendChild(button);
    });
  };

  Controls.prototype.syncConfig = function syncConfig(config) {
    this.config = config;
    if (this.algorithm && this.algorithm.id === 'quick') this.syncQuick(config);

    const sizeRange = $('sizeRange');
    if (sizeRange && Number(sizeRange.value) !== config.size) sizeRange.value = String(config.size);
    const sizeOut = $('sizeOut');
    if (sizeOut) sizeOut.textContent = String(config.size);
    if (sizeRange) this.paintRange(sizeRange);

    const speedRange = $('speedRange');
    if (speedRange) {
      const slider = S.sliderFromSpeed(config.speed);
      if (Number(speedRange.value) !== slider) speedRange.value = String(slider);
      this.paintRange(speedRange);
    }
    const speedOut = $('speedOut');
    if (speedOut) speedOut.textContent = S.formatSpeed(config.speed);

    const distChips = $('distChips');
    if (distChips) {
      const buttons = distChips.querySelectorAll('[data-dist]');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', buttons[i].dataset.dist === config.dist ? 'true' : 'false');
      }
    }
    const distHint = $('distHint');
    if (distHint) {
      const dist = S.DISTRIBUTIONS.find(function (d) { return d.id === config.dist; });
      distHint.textContent = dist ? dist.hint : '—';
    }

    const renderModes = $('renderModes');
    if (renderModes) {
      const buttons = renderModes.querySelectorAll('[data-mode]');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-mode') === config.view ? 'true' : 'false');
      }
    }
    const renderHint = $('renderHint');
    if (renderHint) renderHint.textContent = config.view === 'disparity' ? 'deviation' : config.view;

    const paletteRow = $('paletteRow');
    if (paletteRow) {
      const buttons = paletteRow.querySelectorAll('[data-palette]');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-palette') === config.palette ? 'true' : 'false');
      }
    }

    const valuesToggle = $('valuesToggle');
    if (valuesToggle) valuesToggle.checked = !!config.values;
    const glowToggle = $('glowToggle');
    if (glowToggle) glowToggle.checked = !!config.glow;
    const treeToggle = $('treeToggle');
    if (treeToggle) treeToggle.checked = !!config.tree;

    const soundBtn = $('soundBtn');
    if (soundBtn) {
      soundBtn.textContent = config.sound ? 'Sound on' : 'Sound off';
      soundBtn.setAttribute('aria-pressed', config.sound ? 'true' : 'false');
    }
    const muteBtn = $('muteBtn');
    if (muteBtn) {
      muteBtn.setAttribute('aria-pressed', config.sound ? 'true' : 'false');
      muteBtn.setAttribute('aria-label', config.sound ? 'Sound on. Press M to mute' : 'Sound off. Press M to unmute');
      muteBtn.setAttribute('data-tip', config.sound ? 'Sound on (M)' : 'Sound off (M)');
    }
    const volumeRange = $('volumeRange');
    if (volumeRange) {
      const volume = Math.round(config.volume * 100);
      if (Number(volumeRange.value) !== volume) volumeRange.value = String(volume);
      this.paintRange(volumeRange);
    }
    const audioHint = $('audioHint');
    if (audioHint) {
      audioHint.textContent = config.sound ? 'pentatonic · 220–880 Hz' : 'muted';
    }
  };

  Controls.prototype.paintRange = function paintRange(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const value = Number(input.value);
    const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--fill', percent.toFixed(2) + '%');
  };

  Controls.prototype.syncPlayback = function syncPlayback(state) {
    this.transportState = state;
    const total = Math.max(0, state.total);
    const cursor = U.clamp(state.cursor, 0, total);
    const playing = !!state.playing;

    ['playBtn', 'miniPlay'].forEach(function (id) {
      const btn = $(id);
      if (!btn) return;
      btn.classList.toggle('is-playing', playing);
      btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      btn.disabled = total === 0 || state.building;
    });

    const scrub = $('scrub');
    if (scrub) {
      const max = Math.max(1, total);
      if (Number(scrub.max) !== max) scrub.max = String(max);
      if (Number(scrub.value) !== cursor) scrub.value = String(cursor);
      scrub.disabled = total === 0 || state.building;
      scrub.setAttribute('aria-valuetext', 'Operation ' + U.fmtInt(cursor) + ' of ' + U.fmtInt(total));
    }

    const opLabel = $('opLabel');
    if (opLabel) opLabel.textContent = 'op ' + U.fmtInt(cursor) + ' / ' + U.fmtInt(total);
    const speedLabel = $('speedLabel');
    if (speedLabel) {
      speedLabel.textContent = S.formatSpeed(this.config.speed) + ' · ' + U.fmtInt(S.opsPerSecond(this.config.speed)) + ' ops/s';
    }

    const disabledMap = {
      toStart: cursor <= 0 || state.building,
      stepBack: cursor <= 0 || state.building,
      stepFwd: cursor >= total || state.building,
      toEnd: cursor >= total || state.building,
      resetBtn: cursor <= 0 || state.building,
      miniStep: cursor >= total || state.building,
      miniReset: cursor <= 0 || state.building
    };
    Object.keys(disabledMap).forEach(function (id) {
      const el = $(id);
      if (el) el.disabled = disabledMap[id];
    });

    const foot = $('transportHint');
    if (foot) {
      foot.textContent = state.building ? 'building' : playing ? 'replaying' : state.finished ? 'complete' : cursor > 0 ? 'paused' : 'ready';
    }
  };

  Controls.prototype.syncAll = function syncAll() {
    this.syncConfig(this.app.config);
    this.syncPlayback({
      playing: false,
      cursor: 0,
      total: this.app.getTotal ? this.app.getTotal() : 0,
      finished: false,
      building: false
    });
  };

  Controls.prototype.openPicker = function openPicker() {
    const list = $('algoList');
    const btn = $('algoBtn');
    if (!list || !btn) return;
    this.pickerOpen = true;
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const selected = list.querySelector('[aria-selected="true"]') || this.optionButtons[0];
    if (selected) selected.focus();
  };

  Controls.prototype.closePicker = function closePicker() {
    const list = $('algoList');
    const btn = $('algoBtn');
    if (!list || !btn) return;
    this.pickerOpen = false;
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  Controls.prototype.onPickerKey = function onPickerKey(event) {
    const buttons = this.optionButtons;
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePicker();
      $('algoBtn').focus();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      buttons[Math.min(buttons.length - 1, index + 1)].focus();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      buttons[Math.max(0, index - 1)].focus();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      buttons[0].focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      buttons[buttons.length - 1].focus();
    }
  };

  ui.Controls = Controls;
})(typeof window !== 'undefined' ? window : globalThis);
