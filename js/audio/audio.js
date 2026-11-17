/* Sortlab — a small pentatonic voice for visible operations. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};

  const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const BASE_HZ = 220;
  const MAX_NOTES_PER_FRAME = 8;

  let context = null;
  let master = null;
  let compressor = null;
  let enabled = true;
  let volume = 0.7;
  let notesThisFrame = 0;
  let unlocked = false;
  let broken = false;

  function supported() {
    return !!(global.AudioContext || global.webkitAudioContext);
  }

  function ensureContext() {
    if (broken || !supported()) return null;
    if (context) {
      if (context.state === 'suspended' && unlocked) {
        context.resume().catch(function () { /* still blocked */ });
      }
      return context;
    }
    try {
      const Ctor = global.AudioContext || global.webkitAudioContext;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0;
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 16;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      master.connect(compressor);
      compressor.connect(context.destination);
      applyVolume();
      return context;
    } catch (error) {
      broken = true;
      context = null;
      return null;
    }
  }

  function applyVolume() {
    if (!master || !context) return;
    const target = enabled ? volume * 0.16 : 0;
    const now = context.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(target, now, 0.03);
    } catch (error) {
      master.gain.value = target;
    }
  }

  function unlock() {
    if (broken || !supported()) return;
    unlocked = true;
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () { /* user gesture will retry */ });
    }
    applyVolume();
  }

  function frequencyFor(value, maxValue) {
    const max = Math.max(1, Number(maxValue) || 1);
    const normalized = Math.min(1, Math.max(0, (Number(value) || 0) / max));
    const index = Math.round(normalized * (PENTATONIC.length - 1));
    const semitones = PENTATONIC[index];
    return BASE_HZ * Math.pow(2, semitones / 12);
  }

  function beginFrame() {
    notesThisFrame = 0;
  }

  function note(value, maxValue, kind) {
    if (!enabled || broken || !unlocked) return false;
    if (typeof document !== 'undefined' && document.hidden) return false;
    if (notesThisFrame >= MAX_NOTES_PER_FRAME) return false;
    const ctx = ensureContext();
    if (!ctx || ctx.state !== 'running') return false;

    const now = ctx.currentTime;
    const frequency = frequencyFor(value, maxValue);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const isSwap = kind === 'swap' || kind === 'write';
    const isPivot = kind === 'pivot';

    osc.type = isSwap ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(Math.min(880, isPivot ? frequency * 1.5 : frequency), now);

    const peak = (isSwap ? 0.075 : isPivot ? 0.08 : 0.055) * volume;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.065);

    notesThisFrame += 1;

    osc.onended = function () {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (error) {
        /* already disconnected */
      }
    };
    return true;
  }

  function chord(values, maxValue) {
    if (!enabled || broken || !unlocked) return;
    const ctx = ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    values.slice(0, 4).forEach(function (value, index) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequencyFor(value, maxValue), now + index * 0.02);
      gain.gain.setValueAtTime(0.0001, now + index * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.055 * volume, now + index * 0.02 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.02 + 0.32);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + index * 0.02);
      osc.stop(now + index * 0.02 + 0.34);
      osc.onended = function () {
        try { osc.disconnect(); gain.disconnect(); } catch (error) { /* noop */ }
      };
    });
  }

  function setEnabled(value) {
    enabled = !!value;
    applyVolume();
  }

  function isEnabled() {
    return enabled;
  }

  function setVolume(value) {
    volume = Math.min(1, Math.max(0, Number(value) || 0));
    applyVolume();
  }

  function getVolume() {
    return volume;
  }

  function suspend() {
    if (context && context.state === 'running') {
      context.suspend().catch(function () { /* noop */ });
    }
  }

  function resume() {
    if (context && context.state === 'suspended' && unlocked) {
      context.resume().catch(function () { /* noop */ });
    }
  }

  function destroy() {
    if (context) {
      try { context.close(); } catch (error) { /* noop */ }
    }
    context = null;
    master = null;
    compressor = null;
    broken = false;
    unlocked = false;
  }

  SAV.audio = {
    supported: supported,
    unlock: unlock,
    beginFrame: beginFrame,
    note: note,
    chord: chord,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    setVolume: setVolume,
    getVolume: getVolume,
    suspend: suspend,
    resume: resume,
    destroy: destroy,
    MAX_NOTES_PER_FRAME: MAX_NOTES_PER_FRAME
  };
})(typeof window !== 'undefined' ? window : globalThis);
