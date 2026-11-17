/* Sortlab — application controller: config, logs, one ticker, race lanes. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;
  const S = SAV.state;
  const ui = SAV.ui = SAV.ui || {};

  function $(id) {
    return document.getElementById(id);
  }

  function App() {
    this.config = null;
    this.algorithm = null;
    this.input = [];
    this.log = null;
    this.playback = null;
    this.mode = 'single';
    this.building = false;
    this.raceBuilding = false;
    this.errorText = '';
    this.buildSeq = 0;
    this.raceSeq = 0;
    this.loopRunning = false;
    this.lastTick = 0;
    this.lastUI = 0;
    this.lastRaceUI = 0;
    this.finishedAnnounced = false;
    this.wasPlayingBeforeScrub = false;
    this.raceRenderers = [];
    this.raceLanes = [];
    this.racePlacement = Object.create(null);
    this.boundTick = this.tick.bind(this);
    this.updateURLDebounced = U.debounce(function () {
      S.writeURL(this.config, true);
    }.bind(this), 280);
    this.sizeDebounce = U.debounce(function () {
      this.rebuildInput(this.pendingSizePlay);
    }.bind(this), 70);
    this.pendingSizePlay = false;

    this.dom = {
      vizFrame: $('vizFrame'),
      vizCanvas: $('vizCanvas'),
      auxCanvas: $('auxCanvas'),
      auxWrap: $('auxWrap'),
      auxHint: $('auxHint'),
      raceView: $('raceView'),
      codePanel: document.querySelector('.code-panel'),
      algoName: $('algoName'),
      algoDesc: $('algoDesc'),
      algoBadges: $('algoBadges'),
      status: $('statusBadge'),
      buildOverlay: $('buildOverlay'),
      buildText: $('buildText'),
      buildState: $('buildState'),
      seedValue: $('seedValue'),
      pseudoList: $('pseudoList'),
      codeAlgo: $('codeAlgo'),
      codeFoot: $('codeFoot'),
      mCompares: $('mCompares'),
      mSwaps: $('mSwaps'),
      mWrites: $('mWrites'),
      mOps: $('mOps'),
      mOpsNote: $('mOpsNote'),
      mClock: $('mClock'),
      sizeRange: $('sizeRange'),
      sizeOut: $('sizeOut'),
      versionLabel: $('versionLabel'),
      scrub: $('scrub')
    };
  }

  App.prototype.init = async function init() {
    const urlConfig = S.readURL();
    const merged = Object.assign({}, S.DEFAULT, urlConfig);
    if (merged.seed == null) merged.seed = S.uniqueSeed();
    this.config = S.normalizeConfig(merged);
    this.algorithm = SAV.getAlgorithm(this.config.alg) || SAV.algorithms[0];
    this.config.alg = this.algorithm.id;
    if (this.algorithm.id === 'bogo' && this.config.size > 8) this.config.size = 8;

    document.documentElement.dataset.palette = this.config.palette;
    if (this.dom.seedValue) this.dom.seedValue.textContent = U.formatSeed(this.config.seed);
    if (this.dom.versionLabel) this.dom.versionLabel.textContent = 'v' + (SAV.VERSION || '2.0.0');

    this.renderer = new SAV.Renderer(this.dom.vizCanvas, this.dom.auxCanvas, {
      mode: this.config.view,
      palette: S.PALETTES[this.config.palette],
      glow: this.config.glow,
      values: this.config.values,
      tree: false
    });
    this.pseudo = new ui.Pseudocode(this.dom.pseudoList, this.dom.codeAlgo, this.dom.codeFoot);

    SAV.audio.setVolume(this.config.volume);
    SAV.audio.setEnabled(this.config.sound);

    this.controls = new ui.Controls(this);
    this.labApi = ui.initLab(this);
    this.exportApi = ui.initExport(this);
    this.helpApi = ui.initHelp();
    ui.initTooltip();

    this.bindGlobalEvents();
    this.syncAlgorithmUI();
    this.syncConfigUI();
    await this.rebuildInput(false);
    S.writeURL(this.config, true);
    this.requestFrame();
  };

  /* ---------------- algorithm + config chrome ---------------- */

  App.prototype.syncAlgorithmUI = function syncAlgorithmUI() {
    const def = this.algorithm;
    if (!def) return;
    if (this.dom.algoName) this.dom.algoName.textContent = def.name;
    if (this.dom.algoDesc) this.dom.algoDesc.textContent = def.description;
    this.buildBadges(def);

    if (this.controls) {
      this.controls.setAlgorithm(def, this.config);
    }
    if (this.dom.sizeRange) {
      this.dom.sizeRange.max = def.id === 'bogo' ? '8' : String(S.SIZE_MAX);
      if (Number(this.dom.sizeRange.value) > Number(this.dom.sizeRange.max)) {
        this.dom.sizeRange.value = this.dom.sizeRange.max;
      }
    }
    if (this.pseudo) this.pseudo.setAlgorithm(def, this.currentOptions());
    if (this.dom.vizCanvas) {
      this.dom.vizCanvas.setAttribute('aria-label', 'Array of ' + this.input.length + ' values, ' + def.name.toLowerCase() + ' replay');
    }
    document.title = 'Sortlab — ' + def.name.toLowerCase();
  };

  App.prototype.buildBadges = function buildBadges(def) {
    const root = this.dom.algoBadges;
    if (!root) return;
    root.textContent = '';
    const add = function (label, value, className, tip) {
      const badge = document.createElement('span');
      badge.className = 'badge' + (className ? ' ' + className : '');
      const b = document.createElement('b');
      b.textContent = label;
      badge.appendChild(b);
      badge.appendChild(document.createTextNode(value));
      if (tip) badge.setAttribute('data-tip', tip);
      root.appendChild(badge);
    };
    add('best', def.complexity.best, '', 'Best-case running time');
    add('avg', def.complexity.avg, '', 'Average-case running time');
    add('worst', def.complexity.worst, '', 'Worst-case running time');
    add('space', def.complexity.space, 'space', 'Extra memory beyond the input');
    add(def.stability, '', def.stability === 'stable' ? 'stable' : 'unstable',
      def.stability === 'stable' ? 'Equal values keep their original order' : 'Equal values may change their original order');
    add('good fit', '', '', 'Good fit — ' + def.good);
    add('poor fit', '', '', 'Poor fit — ' + def.bad);
  };

  App.prototype.syncConfigUI = function syncConfigUI() {
    if (this.dom.seedValue) this.dom.seedValue.textContent = U.formatSeed(this.config.seed);
    document.documentElement.dataset.palette = this.config.palette;
    if (this.controls) this.controls.syncConfig(this.config);
    if (this.renderer) {
      this.renderer.setOptions({
        mode: this.config.view,
        palette: S.PALETTES[this.config.palette],
        glow: this.config.glow,
        values: this.config.values,
        tree: this.config.tree
      });
    }
    if (this.dom.scrub) {
      this.dom.scrub.setAttribute('aria-label', 'Operation timeline');
    }
    this.updateURLDebounced();
  };

  App.prototype.currentOptions = function currentOptions() {
    return { scheme: this.config.scheme, pivot: this.config.pivot };
  };

  /* ---------------- build ---------------- */

  App.prototype.rebuildInput = async function rebuildInput(autoplay) {
    if (this.mode === 'race' || this.raceBuilding) this.stopRace(true);
    const token = ++this.buildSeq;
    const playing = !!autoplay;
    this.pausePlayback();
    this.input = SAV.rng.buildArray(this.config.size, this.config.dist, this.config.seed);
    await this.buildAndInstall(token, playing);
  };

  App.prototype.rebuildRun = async function rebuildRun(autoplay) {
    const token = ++this.buildSeq;
    const playing = !!autoplay;
    this.pausePlayback();
    await this.buildAndInstall(token, playing);
  };

  App.prototype.buildAndInstall = async function buildAndInstall(token, autoplay) {
    this.building = true;
    this.setBuilding(true, 'Computing the operation log…');
    this.setStatus('Building log…', 'building');
    try {
      const options = this.currentOptions();
      const log = await SAV.engine.buildLogAsync(this.algorithm, this.input, options, this.config.seed);
      if (token !== this.buildSeq) return;
      this.log = log;
      if (this.dom.vizCanvas) {
        this.dom.vizCanvas.setAttribute('aria-label', 'Array of ' + log.input.length + ' values, ' + this.algorithm.name.toLowerCase() + ' replay');
      }
      this.playback = new SAV.Playback([{
        id: this.algorithm.id,
        name: this.algorithm.name,
        def: this.algorithm,
        log: log
      }], this.config.speed);
      this.playback.seek(0, true);
      this.errorText = '';
      this.finishedAnnounced = false;
      this.renderer.reset();
      this.renderer.resize();
      this.pseudo.setAlgorithm(this.algorithm, options);
      this.building = false;
      this.setBuilding(false, '');
      this.syncAllUI(true);
      if (autoplay) this.play();
      else this.requestFrame();
    } catch (error) {
      if (token !== this.buildSeq) return;
      this.building = false;
      this.setBuilding(false, '');
      this.errorText = error && error.message ? error.message : 'Could not build the log';
      this.setStatus('Build failed', 'error');
      if (this.dom.buildState) this.dom.buildState.textContent = 'failed';
      ui.toast(this.errorText, 'error', 'The operation log could not be built.');
    }
  };

  App.prototype.setBuilding = function setBuilding(active, text) {
    if (this.dom.buildOverlay) this.dom.buildOverlay.hidden = !active;
    if (text && this.dom.buildText) this.dom.buildText.textContent = text;
    if (this.dom.buildState) this.dom.buildState.textContent = active ? 'building…' : 'ready';
  };

  /* ---------------- playback ---------------- */

  App.prototype.getTotal = function getTotal() {
    return this.playback ? this.playback.maxTotal : 0;
  };

  App.prototype.getCursor = function getCursor() {
    return this.playback ? this.playback.cursor : 0;
  };

  App.prototype.getLog = function getLog() {
    if (this.mode === 'race' && this.playback && this.playback.tracks[0]) return this.playback.tracks[0].log;
    return this.log;
  };

  App.prototype.getAlgorithm = function getAlgorithm() {
    return this.algorithm;
  };

  App.prototype.pausePlayback = function pausePlayback() {
    if (this.playback && this.playback.playing) this.playback.pause();
  };

  App.prototype.play = function play() {
    if (this.building || !this.playback || this.playback.maxTotal === 0) return;
    SAV.audio.unlock();
    this.playback.play();
    this.finishedAnnounced = false;
    this.errorText = '';
    this.syncTransport(true);
    this.updateStatus();
    this.requestFrame();
  };

  App.prototype.togglePlay = function togglePlay() {
    if (this.building || !this.playback || this.playback.maxTotal === 0) return;
    SAV.audio.unlock();
    if (this.playback.playing) {
      this.playback.pause();
      this.syncTransport(true);
      this.updateStatus();
      this.requestFrame();
    } else {
      this.play();
    }
  };

  App.prototype.step = function step(direction) {
    if (this.building || !this.playback) return;
    this.playback.pause();
    const from = this.playback.cursor;
    const to = U.clamp(from + (direction < 0 ? -1 : 1), 0, this.playback.maxTotal);
    if (to === from) return;
    this.playback.seek(to, true);
    this.errorText = '';
    if (to < this.playback.maxTotal) this.renderer.cancelWave();
    const now = performance.now();
    if (this.mode === 'single') {
      this.renderer.noteOps(this.log, from, to, now);
      this.playAudioRange(this.log, from, to);
    } else {
      this.playback.lastApplied.forEach(function (entry) {
        const lane = this.findLane(entry.track.id);
        if (lane) lane.renderer.noteOps(entry.track.log, entry.from, entry.to, now);
      }, this);
    }
    this.syncAllUI(true);
    this.requestFrame();
  };

  App.prototype.seek = function seek(index) {
    if (this.building || !this.playback) return;
    this.playback.pause();
    this.playback.seek(index, false);
    if (this.getCursor() < this.playback.maxTotal) this.renderer.cancelWave();
    this.renderer.flash.clear();
    this.renderer.auxFlash.clear();
    this.errorText = '';
    this.syncAllUI(true);
    this.requestFrame();
  };

  App.prototype.beginScrub = function beginScrub() {
    this.wasPlayingBeforeScrub = !!(this.playback && this.playback.playing);
    this.pausePlayback();
    this.syncTransport(true);
    this.updateStatus();
  };

  App.prototype.endScrub = function endScrub() {
    const resume = this.wasPlayingBeforeScrub;
    this.wasPlayingBeforeScrub = false;
    if (resume && this.playback && this.playback.cursor < this.playback.maxTotal) {
      this.play();
    } else {
      this.requestFrame();
    }
  };

  App.prototype.newArray = function newArray() {
    this.stopRace(true);
    this.pausePlayback();
    this.config.seed = S.uniqueSeed();
    this.syncConfigUI();
    ui.toast('New array from seed #' + U.formatSeed(this.config.seed) + '.', 'info');
    this.rebuildInput(false);
  };

  App.prototype.repeatSeed = function repeatSeed() {
    this.stopRace(true);
    if (!this.log) {
      this.rebuildInput(false);
      return;
    }
    this.playback.seek(0, true);
    this.errorText = '';
    this.play();
    ui.toast('Replaying the identical array from seed #' + U.formatSeed(this.config.seed) + '.', 'info');
  };

  App.prototype.setSize = function setSize(value) {
    const next = Math.round(U.clamp(Number(value) || S.SIZE_MIN, S.SIZE_MIN, this.algorithm.id === 'bogo' ? 8 : S.SIZE_MAX));
    if (next === this.config.size) return;
    this.stopRace(true);
    this.pendingSizePlay = !!(this.playback && this.playback.playing);
    this.pausePlayback();
    this.config.size = next;
    if (this.dom.sizeOut) this.dom.sizeOut.textContent = String(next);
    this.syncConfigUI();
    this.sizeDebounce();
  };

  App.prototype.setDistribution = function setDistribution(id) {
    if (!S.DISTRIBUTIONS.some(function (d) { return d.id === id; })) return;
    if (id === this.config.dist) return;
    this.stopRace(true);
    const wasPlaying = !!(this.playback && this.playback.playing);
    this.config.dist = id;
    this.syncConfigUI();
    this.rebuildInput(wasPlaying);
  };

  App.prototype.setAlgorithm = function setAlgorithm(id) {
    const def = SAV.getAlgorithm(id);
    if (!def || def.id === this.algorithm.id) return;
    const wasPlaying = !!(this.playback && this.playback.playing);
    this.stopRace(true);
    const wasSize = this.config.size;
    this.config.alg = def.id;
    this.algorithm = def;
    if (def.id === 'bogo' && this.config.size > 8) this.config.size = 8;
    this.syncAlgorithmUI();
    this.syncConfigUI();
    if (def.id === 'bogo' && wasSize !== this.config.size) {
      ui.toast('Bogo sort is limited to eight values and 4,000 shuffles — otherwise the joke becomes a denial of service.', 'info');
      this.rebuildInput(wasPlaying);
    } else {
      this.rebuildRun(wasPlaying);
    }
  };

  App.prototype.setQuickOption = function setQuickOption(key, value) {
    if (key !== 'scheme' && key !== 'pivot') return;
    if (this.config[key] === value) return;
    const wasPlaying = !!(this.playback && this.playback.playing);
    this.stopRace(true);
    this.config[key] = value;
    this.syncConfigUI();
    if (this.algorithm.id === 'quick') this.rebuildRun(wasPlaying);
  };

  App.prototype.setSpeed = function setSpeed(value) {
    const speed = Math.round(U.clamp(Number(value) || 1, S.SPEED_MIN, S.SPEED_MAX) * 100) / 100;
    this.config.speed = speed;
    if (this.playback) this.playback.setSpeed(speed);
    this.syncConfigUI();
    this.syncTransport(true);
  };

  App.prototype.setView = function setView(mode) {
    if (S.VIEWS.indexOf(mode) < 0 || mode === this.config.view) return;
    this.config.view = mode;
    this.renderer.setOptions({ mode: mode });
    this.raceRenderers.forEach(function (renderer) { renderer.setOptions({ mode: mode }); });
    this.syncConfigUI();
    this.requestFrame();
  };

  App.prototype.setPalette = function setPalette(id) {
    if (!S.PALETTES[id] || id === this.config.palette) return;
    this.config.palette = id;
    document.documentElement.dataset.palette = id;
    const palette = S.PALETTES[id];
    this.renderer.setOptions({ palette: palette });
    this.raceRenderers.forEach(function (renderer) { renderer.setOptions({ palette: palette }); });
    this.syncConfigUI();
    this.requestFrame();
  };

  App.prototype.setToggle = function setToggle(key, value) {
    if (key !== 'values' && key !== 'glow' && key !== 'tree') return;
    this.config[key] = !!value;
    const patch = {};
    patch[key] = !!value;
    this.renderer.setOptions(patch);
    this.raceRenderers.forEach(function (renderer) { renderer.setOptions(patch); });
    this.syncConfigUI();
    this.requestFrame();
  };

  App.prototype.setSound = function setSound(value) {
    this.config.sound = !!value;
    SAV.audio.setEnabled(this.config.sound);
    if (this.config.sound) SAV.audio.unlock();
    this.syncConfigUI();
    ui.toast(this.config.sound ? 'Sound on — notes follow visible compares, swaps and writes.' : 'Sound muted. The replay is unaffected.',
      this.config.sound ? 'success' : 'info');
  };

  App.prototype.setVolume = function setVolume(value) {
    this.config.volume = U.clamp(Number(value) || 0, 0, 1);
    SAV.audio.setVolume(this.config.volume);
    this.syncConfigUI();
  };

  /* ---------------- per-frame ---------------- */

  App.prototype.requestFrame = function requestFrame() {
    if (this.loopRunning) return;
    this.loopRunning = true;
    this.lastTick = 0;
    SAV.ticker.add(this.boundTick);
  };

  App.prototype.tick = function tick() {
    const now = performance.now();
    if (!this.lastTick) this.lastTick = now;
    const dt = now - this.lastTick;
    this.lastTick = now;

    if (this.playback && this.playback.playing && !this.building) {
      const before = this.playback.cursor;
      const result = this.playback.advance(dt);
      if (result.to > result.from) {
        if (this.mode === 'single') {
          this.renderer.noteOps(this.log, before, result.to, now);
          this.playAudioRange(this.log, before, result.to);
        } else {
          for (let i = 0; i < result.applied.length; i++) {
            const entry = result.applied[i];
            const lane = this.findLane(entry.track.id);
            if (lane) lane.renderer.noteOps(entry.track.log, entry.from, entry.to, now);
          }
          const first = result.applied[0];
          if (first && first.track.id === this.playback.tracks[0].id) {
            this.playAudioRange(first.track.log, first.from, first.to);
          }
        }
      }
      if (result.finished && !this.finishedAnnounced) {
        this.finishedAnnounced = true;
        this.onFinish();
      }
      if (now - this.lastUI > 90 || result.finished) {
        this.lastUI = now;
        this.syncTransport(false);
        this.syncMetrics(true);
        this.syncCodeForCursor();
        this.syncAux();
        this.syncRaceStats(false);
        this.updateStatus();
      }
    }

    this.draw(now);

    const animating = this.anyAnimation(now);
    if ((!this.playback || !this.playback.playing) && !animating) {
      this.lastTick = 0;
      this.loopRunning = false;
      SAV.ticker.remove(this.boundTick);
    }
  };

  App.prototype.draw = function draw(now) {
    if (this.mode === 'single') {
      if (this.renderer) this.renderer.draw(this.log, now);
      return;
    }
    for (let i = 0; i < this.raceLanes.length; i++) {
      const lane = this.raceLanes[i];
      lane.renderer.draw(lane.track.log, now);
    }
  };

  App.prototype.anyAnimation = function anyAnimation(now) {
    if (this.mode === 'single') return this.renderer ? this.renderer.needsAnimation(now) : false;
    for (let i = 0; i < this.raceLanes.length; i++) {
      if (this.raceLanes[i].renderer.needsAnimation(now)) return true;
    }
    return false;
  };

  App.prototype.playAudioRange = function playAudioRange(log, from, to) {
    if (!this.config.sound || !log) return;
    SAV.audio.beginFrame();
    const start = Math.max(from, to - 16);
    for (let k = start; k < to; k++) {
      const op = log.ops[k];
      if (!op) continue;
      if (op.t === 'compare') {
        const value = op.aux ? log.view.aux[op.i] : log.view.values[op.i];
        if (SAV.audio.note(value, log.maxValue, 'compare') === false) break;
      } else if (op.t === 'swap') {
        if (SAV.audio.note(log.view.values[op.i], log.maxValue, 'swap') === false) break;
      } else if (op.t === 'write') {
        if (SAV.audio.note(op.v, log.maxValue, 'write') === false) break;
      } else if (op.t === 'pivot') {
        if (op.i >= 0 && SAV.audio.note(log.view.values[op.i], log.maxValue, 'pivot') === false) break;
      }
    }
  };

  App.prototype.onFinish = function onFinish() {
    this.syncTransport(true);
    this.syncMetrics(true);
    this.syncCodeForCursor();
    if (this.mode === 'race') {
      this.setStatus('Race finished', 'done');
      this.updateStatus();
      this.syncRaceStats(true);
      if (this.labApi) this.labApi.showPodium(this.playback.results());
      const first = this.playback.tracks[0];
      if (first) SAV.audio.chord(first.log.sortedValues.slice(-4), first.log.maxValue);
      return;
    }
    if (!this.log) return;
    if (this.log.verified) {
      this.renderer.startWave();
      this.setStatus('Sorted ✓', 'done');
      SAV.audio.chord(this.log.sortedValues.slice(-4), this.log.maxValue);
      this.requestFrame();
    } else if (this.algorithm.id === 'bogo') {
      this.errorText = 'Bogo gave up';
      this.setStatus('Bogo gave up', 'error');
      ui.toast('Four thousand shuffles were not enough. That is Bogo sort doing exactly what its complexity promises — not a UI failure.', 'warn', 'Bogo gave up.');
    } else {
      this.errorText = 'Not sorted';
      this.setStatus('Verification failed', 'error');
      ui.toast('The final array did not match a sorted copy. The log was kept so you can scrub back and inspect it.', 'error');
    }
  };

  /* ---------------- UI sync ---------------- */

  App.prototype.syncAllUI = function syncAllUI(force) {
    this.syncTransport(force);
    this.syncMetrics(true);
    this.syncCodeForCursor();
    this.syncAux();
    this.syncRaceStats(true);
    this.updateStatus();
  };

  App.prototype.syncTransport = function syncTransport(force) {
    if (!this.controls || !this.playback) return;
    const now = performance.now();
    if (!force && now - (this._lastTransport || 0) < 70) return;
    this._lastTransport = now;
    this.controls.syncPlayback({
      playing: this.playback.playing,
      cursor: this.playback.cursor,
      total: this.playback.maxTotal,
      finished: this.playback.finished,
      building: this.building
    });
  };

  App.prototype.syncMetrics = function syncMetrics(force) {
    if (!this.playback) return;
    const now = performance.now();
    if (!force && now - (this._lastMetrics || 0) < 100) return;
    this._lastMetrics = now;
    const track = this.playback.tracks[0];
    if (!track) return;
    const view = track.log.view;
    if (this.dom.mCompares) this.dom.mCompares.textContent = U.fmtInt(view.counts.compares);
    if (this.dom.mSwaps) this.dom.mSwaps.textContent = U.fmtInt(view.counts.swaps);
    if (this.dom.mWrites) this.dom.mWrites.textContent = U.fmtInt(view.counts.writes);
    if (this.dom.mOps) this.dom.mOps.textContent = U.fmtInt(this.playback.cursor);
    if (this.dom.mOpsNote) {
      this.dom.mOpsNote.textContent = 'of ' + U.fmtInt(this.playback.maxTotal) + ' ops' + (this.mode === 'race' ? ' · lane 1' : '');
    }
    if (this.dom.mClock) {
      const perSecond = S.opsPerSecond(this.playback.speed);
      this.dom.mClock.textContent = U.fmtDuration(perSecond ? this.playback.cursor / perSecond : 0);
    }
  };

  App.prototype.syncCodeForCursor = function syncCodeForCursor() {
    if (!this.pseudo || !this.playback) return;
    const track = this.playback.tracks[0];
    if (!track) return;
    const index = Math.min(this.playback.cursor, track.log.total);
    const op = index > 0 ? track.log.ops[index - 1] : null;
    this.pseudo.setOp(op, track.def, track.log.options);
  };

  App.prototype.syncAux = function syncAux() {
    if (!this.dom.auxWrap) return;
    const hide = this.mode !== 'single' || !this.log || !this.log.view.auxOn || !this.log.view.aux.length;
    const wasHidden = this.dom.auxWrap.hidden;
    this.dom.auxWrap.hidden = hide;
    if (!hide && this.dom.auxHint) {
      this.dom.auxHint.textContent = this.log.def.id === 'counting'
        ? 'counts per value'
        : this.log.def.id === 'radix'
          ? 'ten digit buckets'
          : 'merge buffer';
    }
    if (wasHidden && !hide) {
      this.renderer.resize();
      this.requestFrame();
    }
  };

  App.prototype.updateStatus = function updateStatus() {
    if (this.building) {
      this.setStatus('Building log…', 'building');
      return;
    }
    if (this.mode === 'race') {
      if (!this.playback) return;
      if (this.playback.finished) this.setStatus('Race finished', 'done');
      else if (this.playback.playing) this.setStatus('Race · replaying', 'playing');
      else if (this.playback.cursor > 0) this.setStatus('Race · paused', 'paused');
      else this.setStatus('Race ready', 'idle');
      return;
    }
    if (!this.playback || !this.log) return;
    const atEnd = this.playback.cursor >= this.playback.maxTotal && this.playback.maxTotal > 0;
    if (atEnd) {
      if (this.log.verified) this.setStatus('Sorted ✓', 'done');
      else this.setStatus(this.errorText || 'Not sorted', 'error');
    } else if (this.playback.playing) {
      this.setStatus('Replaying', 'playing');
    } else if (this.playback.cursor > 0) {
      this.setStatus('Paused', 'paused');
    } else {
      this.setStatus('Ready', 'idle');
    }
  };

  App.prototype.setStatus = function setStatus(text, state) {
    const el = this.dom.status;
    if (!el) return;
    if (el.textContent === text && el.dataset.state === state) return;
    el.textContent = text;
    el.dataset.state = state || 'idle';
  };

  /* ---------------- race mode ---------------- */

  App.prototype.startRace = function startRace(ids) {
    if (this.building) return false;
    const seen = Object.create(null);
    const defs = [];
    (Array.isArray(ids) ? ids : []).forEach(function (id) {
      const def = SAV.getAlgorithm(id);
      if (!def || def.id === 'bogo' || seen[def.id]) return;
      seen[def.id] = true;
      defs.push(def);
    });
    if (defs.length < 2) {
      ui.toast('A race needs at least two algorithms.', 'warn');
      return false;
    }
    if (defs.length > 4) defs.length = 4;

    if (this.mode === 'race') this.stopRace(true);
    if (!this.log || !this.input.length) {
      ui.toast('Build a run before starting a race.', 'warn');
      return false;
    }

    this.singleCursor = this.playback ? this.playback.cursor : 0;
    this.pausePlayback();
    SAV.audio.unlock();

    const token = ++this.raceSeq;
    const options = this.currentOptions();
    const seed = this.config.seed;
    const input = this.input.slice();
    this.raceBuilding = true;
    this.building = true;
    this.setBuilding(true, 'Building ' + defs.length + ' operation logs…');
    this.setStatus('Building race logs…', 'building');
    this.updateStatus();

    Promise.all(defs.map(function (def) {
      return SAV.engine.buildLogAsync(def, input, options, seed);
    })).then(function (logs) {
      if (token !== this.raceSeq) return;
      this.raceBuilding = false;
      this.building = false;
      this.setBuilding(false, '');
      this.errorText = '';
      this.finishedAnnounced = false;
      this.mode = 'race';
      const tracks = defs.map(function (def, index) {
        return { id: def.id, name: def.name, def: def, log: logs[index] };
      });
      this.playback = new SAV.Playback(tracks, this.config.speed);
      this.playback.seek(0, true);
      if (this.pseudo) this.pseudo.setAlgorithm(defs[0], options);
      this.syncRaceHeader(defs);
      this.createRaceUI(this.playback.tracks);
      this.syncAllUI(true);
      if (this.labApi) this.labApi.setRunning(true);
      this.play();
    }.bind(this)).catch(function (error) {
      if (token !== this.raceSeq) return;
      this.raceBuilding = false;
      this.building = false;
      this.setBuilding(false, '');
      this.errorText = error && error.message ? error.message : 'Could not build the race logs';
      this.setStatus('Race build failed', 'error');
      this.updateStatus();
      if (this.labApi) this.labApi.setRunning(false);
      ui.toast(this.errorText, 'error', 'The race could not start.');
    }.bind(this));

    return true;
  };

  App.prototype.stopRace = function stopRace() {
    ++this.raceSeq;
    const wasRace = this.mode === 'race';
    if (this.raceBuilding) {
      this.raceBuilding = false;
      if (this.building) {
        this.building = false;
        this.setBuilding(false, '');
        this.updateStatus();
      }
    }
    if (this.labApi) this.labApi.setRunning(false);
    if (!wasRace) return false;

    if (this.playback) this.playback.pause();
    this.mode = 'single';
    if (this.dom.raceView) {
      this.dom.raceView.hidden = true;
      this.dom.raceView.textContent = '';
    }
    if (this.dom.vizFrame) this.dom.vizFrame.hidden = false;
    this.raceLanes = [];
    this.raceRenderers = [];
    this.lastRaceUI = 0;
    this._lastRaceUI = 0;
    this.playback = null;
    if (this.log) {
      this.playback = new SAV.Playback([{
        id: this.algorithm.id,
        name: this.algorithm.name,
        def: this.algorithm,
        log: this.log
      }], this.config.speed);
      const cursor = Math.min(this.singleCursor || 0, this.log.total);
      this.playback.seek(cursor, true);
      this.renderer.reset();
      this.renderer.resize();
    }
    this.syncAlgorithmUI();
    this.syncConfigUI();
    this.syncAllUI(true);
    this.syncAux();
    this.requestFrame();
    return true;
  };

  App.prototype.syncRaceHeader = function syncRaceHeader(defs) {
    if (this.dom.algoName) this.dom.algoName.textContent = 'Race · ' + defs.length + ' lanes';
    if (this.dom.algoDesc) {
      this.dom.algoDesc.textContent = 'The same array and the same seed, replayed side by side. Finish order is decided by the verified operation count, not by wall-clock luck.';
    }
    const root = this.dom.algoBadges;
    if (!root) return;
    root.textContent = '';
    const add = function (label, value, extra) {
      const badge = document.createElement('span');
      badge.className = 'badge' + (extra ? ' ' + extra : '');
      const b = document.createElement('b');
      b.textContent = label;
      badge.appendChild(b);
      badge.appendChild(document.createTextNode(value));
      root.appendChild(badge);
    };
    add('lanes', defs.map(function (def) { return def.name; }).join(' · '), 'space');
    add('input', 'identical');
    add('seed', 'shared');
    if (document) document.title = 'Sortlab — ' + defs.length + '-lane race';
  };

  App.prototype.createRaceUI = function createRaceUI(tracks) {
    const root = this.dom.raceView;
    if (!root) return;
    if (this.dom.vizFrame) this.dom.vizFrame.hidden = true;
    if (this.dom.auxWrap) this.dom.auxWrap.hidden = true;
    root.textContent = '';
    root.hidden = false;
    this.raceLanes = [];
    this.raceRenderers = [];
    this.lastRaceUI = 0;
    this._lastRaceUI = 0;

    const totals = tracks.map(function (track) { return track.log.total; }).sort(function (a, b) { return a - b; });
    const minTotal = totals.length ? totals[0] : 0;
    const palette = S.PALETTES[this.config.palette];

    tracks.forEach(function (track) {
      const lane = document.createElement('div');
      lane.className = 'race-lane';
      lane.dataset.alg = track.id;

      const info = document.createElement('div');
      info.className = 'race-lane-info';

      const nameRow = document.createElement('div');
      nameRow.className = 'race-lane-name';
      const name = document.createElement('strong');
      name.textContent = track.name;
      const rank = document.createElement('span');
      rank.className = 'race-rank';
      rank.textContent = String(totals.indexOf(track.log.total) + 1);
      rank.setAttribute('data-tip', 'Rank by total operation count');
      nameRow.appendChild(name);
      nameRow.appendChild(rank);

      const stats = document.createElement('span');
      stats.className = 'race-lane-stats';
      stats.textContent = '0 cmp · 0 swaps';
      const progress = document.createElement('span');
      progress.className = 'race-lane-progress';
      const fill = document.createElement('i');
      progress.appendChild(fill);

      info.appendChild(nameRow);
      info.appendChild(stats);
      info.appendChild(progress);

      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', track.name + ' race lane, 0 of ' + track.log.total + ' operations');
      lane.appendChild(info);
      lane.appendChild(canvas);
      root.appendChild(lane);

      const renderer = new SAV.Renderer(canvas, null, {
        mode: this.config.view,
        palette: palette,
        glow: this.config.glow,
        values: false,
        tree: false,
        compact: true
      });
      renderer.resize();
      renderer.draw(track.log, performance.now());
      this.raceRenderers.push(renderer);
      this.raceLanes.push({
        id: track.id,
        track: track,
        renderer: renderer,
        canvas: canvas,
        lane: lane,
        rank: rank,
        stats: stats,
        fill: fill,
        minTotal: minTotal
      });
    }, this);

    this.syncRaceStats(true);
    this.requestFrame();
  };

  App.prototype.findLane = function findLane(id) {
    for (let i = 0; i < this.raceLanes.length; i++) {
      if (this.raceLanes[i].id === id) return this.raceLanes[i];
    }
    return null;
  };

  App.prototype.syncRaceStats = function syncRaceStats(force) {
    if (this.mode !== 'race' || !this.playback || !this.raceLanes.length) return;
    const now = performance.now();
    if (!force && now - (this._lastRaceUI || 0) < 100) return;
    this._lastRaceUI = now;
    const finished = this.playback.finished;

    for (let i = 0; i < this.raceLanes.length; i++) {
      const lane = this.raceLanes[i];
      const log = lane.track.log;
      const local = Math.min(this.playback.cursor, log.total);
      const view = log.view;
      const ratio = log.total ? local / log.total : 1;
      lane.stats.textContent = U.fmtInt(view.counts.compares) + ' cmp · ' +
        U.fmtInt(view.counts.swaps) + ' swaps · ' +
        U.fmtInt(local) + ' / ' + U.fmtInt(log.total) + ' ops';
      lane.fill.style.width = (ratio * 100).toFixed(1) + '%';
      lane.lane.classList.toggle('is-winner', finished && log.total === lane.minTotal);
      lane.lane.classList.toggle('is-finished', local >= log.total);
      lane.canvas.setAttribute('aria-label', lane.track.name + ' race lane, ' +
        U.fmtInt(local) + ' of ' + U.fmtInt(log.total) + ' operations');
    }
  };

  /* ---------------- exports and sharing ---------------- */

  App.prototype.getSnapshot = function getSnapshot() {
    if (!this.playback) return null;
    const track = this.playback.tracks[0];
    if (!track || !track.log) return null;
    const log = track.log;
    const index = Math.min(this.playback.cursor, log.total);
    const view = log.seek(index);
    const def = this.mode === 'race' ? log.def : this.algorithm;
    return {
      config: Object.assign({}, this.config),
      algorithm: {
        id: def.id,
        name: def.name,
        family: def.family,
        complexity: Object.assign({}, def.complexity),
        stability: def.stability
      },
      cursor: index,
      total: log.total,
      verified: !!log.verified,
      counts: {
        compares: view.counts.compares,
        swaps: view.counts.swaps,
        writes: view.counts.writes
      },
      values: view.values.slice(),
      sortedValues: log.sortedValues.slice(),
      locked: Array.prototype.slice.call(view.flags)
    };
  };

  App.prototype.getExportCanvas = function getExportCanvas() {
    if (this.mode !== 'race') return this.dom.vizCanvas;
    const lanes = this.raceLanes.filter(function (lane) {
      return lane.canvas && lane.canvas.width && lane.canvas.height;
    });
    if (!lanes.length) return this.dom.vizCanvas;
    const pad = 14;
    const labelHeight = 24;
    const width = lanes.reduce(function (max, lane) {
      return Math.max(max, lane.canvas.width);
    }, 1);
    const height = lanes.reduce(function (sum, lane) {
      return sum + lane.canvas.height + labelHeight;
    }, pad * 2);
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    const palette = S.PALETTES[this.config.palette];
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'middle';
    let y = pad;
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      ctx.fillStyle = palette.text;
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(lane.track.name + ' · ' + U.fmtInt(lane.track.log.total) + ' ops', pad, y + labelHeight / 2);
      y += labelHeight;
      ctx.drawImage(lane.canvas, 0, y);
      y += lane.canvas.height;
    }
    return out;
  };

  App.prototype.getComparisonContext = function getComparisonContext() {
    return {
      defs: SAV.algorithms.filter(function (def) { return def.id !== 'bogo'; }),
      input: this.input.slice(),
      options: this.currentOptions(),
      seed: this.config.seed,
      config: Object.assign({}, this.config)
    };
  };

  App.prototype.getShareURL = function getShareURL() {
    return S.writeURL(this.config, false);
  };

  /* ---------------- global events ---------------- */

  App.prototype.bindGlobalEvents = function bindGlobalEvents() {
    const self = this;
    this.boundResize = U.rafThrottle(function () {
      self.handleResize();
    });
    this.boundKeyDown = function (event) {
      self.handleKeyDown(event);
    };
    this.boundVisibility = function () {
      self.handleVisibility();
    };
    this.boundPageHide = function () {
      SAV.audio.suspend();
    };

    global.addEventListener('resize', this.boundResize, { passive: true });
    global.addEventListener('orientationchange', this.boundResize, { passive: true });
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('visibilitychange', this.boundVisibility);
    global.addEventListener('pagehide', this.boundPageHide);

    if (typeof global.ResizeObserver === 'function') {
      this.resizeObserver = new global.ResizeObserver(this.boundResize);
      if (this.dom.vizFrame) this.resizeObserver.observe(this.dom.vizFrame);
      if (this.dom.raceView) this.resizeObserver.observe(this.dom.raceView);
      if (this.dom.auxWrap) this.resizeObserver.observe(this.dom.auxWrap);
    }
  };

  App.prototype.handleResize = function handleResize() {
    if (this.renderer) this.renderer.resize();
    for (let i = 0; i < this.raceRenderers.length; i++) this.raceRenderers[i].resize();
    this.requestFrame();
  };

  App.prototype.handleVisibility = function handleVisibility() {
    if (!document) return;
    if (document.hidden) {
      this.pausePlayback();
      this.syncTransport(true);
      this.updateStatus();
      SAV.audio.suspend();
    } else {
      SAV.audio.resume();
      this.handleResize();
    }
  };

  App.prototype.handleKeyDown = function handleKeyDown(event) {
    if (!event || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (U.isTypingTarget(event.target)) return;
    if (this.helpApi) {
      const dialog = $('helpDialog');
      if (dialog && dialog.open) return;
    }

    const key = event.key;
    const tag = event.target && event.target.tagName;
    const isButton = tag === 'BUTTON' || tag === 'A';

    if (key === 'Escape') {
      if (this.controls) this.controls.closePicker();
      if (this.exportApi) this.exportApi.closeMenu();
      return;
    }
    if (key === ' ' || event.code === 'Space') {
      if (isButton) return;
      event.preventDefault();
      if (!event.repeat) this.togglePlay();
      return;
    }
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      this.step(key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (key === 'Home') {
      event.preventDefault();
      this.seek(0);
      return;
    }
    if (key === 'End') {
      event.preventDefault();
      this.seek(this.getTotal());
      return;
    }
    if (event.repeat) return;
    if (key === 'n' || key === 'N') {
      event.preventDefault();
      this.newArray();
      return;
    }
    if (key === 'r' || key === 'R') {
      event.preventDefault();
      this.repeatSeed();
      return;
    }
    if (key === 'm' || key === 'M') {
      event.preventDefault();
      this.setSound(!this.config.sound);
      return;
    }
    if (/^[1-9]$/.test(key)) {
      const index = Number(key) - 1;
      const def = SAV.algorithms[index];
      if (def) {
        event.preventDefault();
        this.setAlgorithm(def.id);
      }
    }
  };

  App.prototype.cleanup = function cleanup() {
    this.pausePlayback();
    if (typeof SAV.ticker.clear === 'function') SAV.ticker.clear();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.boundResize) {
      global.removeEventListener('resize', this.boundResize);
      global.removeEventListener('orientationchange', this.boundResize);
    }
    if (this.boundKeyDown) document.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundVisibility) document.removeEventListener('visibilitychange', this.boundVisibility);
    if (this.boundPageHide) global.removeEventListener('pagehide', this.boundPageHide);
    this.loopRunning = false;
  };

  SAV.App = App;
})(typeof window !== 'undefined' ? window : globalThis);
