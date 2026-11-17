/* Sortlab — one animation ticker, one playback clock for one or many runs. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;

  function createTicker() {
    const subscribers = new Set();
    let frame = 0;

    function loop(timestamp) {
      frame = 0;
      const snapshot = Array.from(subscribers);
      for (let i = 0; i < snapshot.length; i++) {
        try {
          snapshot[i](timestamp);
        } catch (error) {
          if (global.console) global.console.error(error);
        }
      }
      if (subscribers.size && !frame) frame = requestAnimationFrame(loop);
    }

    return {
      add: function add(fn) {
        if (subscribers.has(fn)) return;
        subscribers.add(fn);
        if (!frame) frame = requestAnimationFrame(loop);
      },
      remove: function remove(fn) {
        subscribers.delete(fn);
        if (!subscribers.size && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      clear: function clear() {
        subscribers.clear();
        if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      get size() {
        return subscribers.size;
      }
    };
  }

  function Playback(tracks, speed) {
    this.tracks = tracks.map(function (track) {
      return {
        id: track.id,
        name: track.name,
        def: track.def,
        log: track.log,
        finishedAt: null
      };
    });
    this.speed = speed || 2;
    this.cursor = 0;
    this.maxTotal = 1;
    this.playing = false;
    this.accumulator = 0;
    this.lastApplied = [];
    this.finished = false;
    this.recomputeBounds();
    this.seek(0);
  }

  Playback.prototype.recomputeBounds = function recomputeBounds() {
    let max = 0;
    for (let i = 0; i < this.tracks.length; i++) {
      const total = this.tracks[i].log.total;
      if (total > max) max = total;
    }
    this.maxTotal = Math.max(1, max);
    this.finished = this.cursor >= this.maxTotal;
  };

  Playback.prototype.setSpeed = function setSpeed(speed) {
    this.speed = U.clamp(Number(speed) || 1, SAV.state.SPEED_MIN, SAV.state.SPEED_MAX);
  };

  Playback.prototype.progress = function progress() {
    return this.maxTotal ? this.cursor / this.maxTotal : 0;
  };

  Playback.prototype.trackIndex = function trackIndex(track) {
    return Math.min(this.cursor, track.log.total);
  };

  Playback.prototype.seek = function seek(index, silent) {
    const target = Math.round(U.clamp(Number(index) || 0, 0, this.maxTotal));
    const previous = this.cursor;
    this.cursor = target;
    this.accumulator = 0;
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      const local = Math.min(target, track.log.total);
      track.log.seek(local);
      track.finishedAt = target >= track.log.total ? track.log.total : null;
    }
    this.finished = target >= this.maxTotal;
    if (!silent) this.lastApplied = [];
    return { from: previous, to: target };
  };

  Playback.prototype.step = function step(delta) {
    return this.seek(this.cursor + delta, true);
  };

  Playback.prototype.play = function play() {
    if (this.finished || this.cursor >= this.maxTotal) this.seek(0, true);
    this.playing = true;
    this.accumulator = 0;
  };

  Playback.prototype.pause = function pause() {
    this.playing = false;
    this.accumulator = 0;
  };

  Playback.prototype.toggle = function toggle() {
    if (this.playing) this.pause();
    else this.play();
    return this.playing;
  };

  Playback.prototype.advance = function advance(deltaMs) {
    if (!this.playing) return { from: this.cursor, to: this.cursor, applied: [], finished: this.finished };
    const dt = U.clamp(deltaMs, 0, 120);
    const perSecond = SAV.state.opsPerSecond(this.speed);
    this.accumulator += perSecond * dt / 1000;
    let steps = Math.floor(this.accumulator);
    if (steps <= 0) return { from: this.cursor, to: this.cursor, applied: [], finished: this.finished };
    this.accumulator -= steps;

    const from = this.cursor;
    const maxSteps = Math.max(1, Math.ceil(perSecond * 0.12));
    if (steps > maxSteps) steps = maxSteps;
    const to = Math.min(this.maxTotal, from + steps);
    this.cursor = to;

    const applied = [];
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      const localFrom = Math.min(from, track.log.total);
      const localTo = Math.min(to, track.log.total);
      if (localTo !== localFrom || track.log.viewIndex !== localTo) {
        track.log.seek(localTo);
        if (localTo > localFrom) {
          applied.push({ track: track, from: localFrom, to: localTo });
        }
      }
      track.finishedAt = to >= track.log.total ? track.log.total : null;
    }

    this.lastApplied = applied;
    if (to >= this.maxTotal) {
      this.playing = false;
      this.finished = true;
      this.accumulator = 0;
    }
    return { from: from, to: to, applied: applied, finished: this.finished };
  };

  Playback.prototype.isTrackFinished = function isTrackFinished(track) {
    return this.cursor >= track.log.total;
  };

  Playback.prototype.results = function results() {
    return this.tracks.map(function (track) {
      const view = track.log.seek(Math.min(this.cursor, track.log.total));
      return {
        id: track.id,
        name: track.name,
        def: track.def,
        total: track.log.total,
        verified: track.log.verified,
        counts: {
          compares: view.counts.compares,
          swaps: view.counts.swaps,
          writes: view.counts.writes
        }
      };
    }, this);
  };

  Playback.prototype.winner = function winner() {
    let best = null;
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      if (!best || track.log.total < best.log.total) best = track;
    }
    return best;
  };

  Playback.prototype.destroy = function destroy() {
    this.playing = false;
    this.lastApplied = [];
    this.tracks = [];
  };

  SAV.ticker = createTicker();
  SAV.Playback = Playback;
})(typeof window !== 'undefined' ? window : globalThis);
