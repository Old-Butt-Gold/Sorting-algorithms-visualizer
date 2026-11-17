/* Sortlab — canvas renderer: bars, dots, gradient, disparity, heap tree, aux lane. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;

  const FLASH_MS = 190;
  const WAVE_MS = 1250;

  function hexToRgb(hex) {
    const value = hex.replace('#', '');
    const full = value.length === 3
      ? value.split('').map(function (c) { return c + c; }).join('')
      : value;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    };
  }

  function mixHex(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
    return 'rgb(' +
      Math.round(ca.r + (cb.r - ca.r) * clamped) + ',' +
      Math.round(ca.g + (cb.g - ca.g) * clamped) + ',' +
      Math.round(ca.b + (cb.b - ca.b) * clamped) + ')';
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  function buildRamp(stops, size) {
    const out = [];
    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      const scaled = t * (stops.length - 1);
      const index = Math.min(stops.length - 2, Math.floor(scaled));
      out.push(mixHex(stops[index], stops[index + 1], scaled - index));
    }
    return out;
  }

  function Renderer(canvas, auxCanvas, options) {
    this.canvas = canvas;
    this.auxCanvas = auxCanvas;
    this.ctx = canvas ? canvas.getContext('2d', { alpha: true, desynchronized: true }) : null;
    this.auxCtx = auxCanvas ? auxCanvas.getContext('2d', { alpha: true, desynchronized: true }) : null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.flash = new Map();
    this.auxFlash = new Map();
    this.flashUntil = 0;
    this.waveStart = 0;
    this.waveEnd = 0;
    this.options = Object.assign({
      mode: 'bars',
      palette: SAV.state.PALETTES.neon,
      glow: true,
      values: true,
      tree: false,
      compact: false
    }, options || {});
    this.reducedMotion = U.prefersReducedMotion();
    this.buildPalettes();
    this.resize();
  }

  Renderer.prototype.buildPalettes = function buildPalettes() {
    const p = this.options.palette;
    this.rampBars = buildRamp([p.baseA, p.baseB], 64);
    this.rampVivid = buildRamp(p.ramp, 64);
    this.rampDisparity = buildRamp([p.baseB, p.violet || p.aux, p.swap], 64);
    this.rampSorted = buildRamp([p.sorted, p.compare], 64);
  };

  Renderer.prototype.setOptions = function setOptions(options) {
    const paletteChanged = options.palette && options.palette.id !== this.options.palette.id;
    Object.assign(this.options, options);
    if (paletteChanged || options.palette) this.buildPalettes();
  };

  Renderer.prototype.resize = function resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, global.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (!width || !height) return;
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
    }
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.auxCanvas) {
      const auxRect = this.auxCanvas.getBoundingClientRect();
      const auxWidth = Math.max(1, Math.round(auxRect.width));
      const auxHeight = Math.max(1, Math.round(auxRect.height));
      if (this.auxCanvas.width !== Math.round(auxWidth * dpr) || this.auxCanvas.height !== Math.round(auxHeight * dpr)) {
        this.auxCanvas.width = Math.round(auxWidth * dpr);
        this.auxCanvas.height = Math.round(auxHeight * dpr);
      }
      this.auxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.auxWidth = auxWidth;
      this.auxHeight = auxHeight;
    }
  };

  Renderer.prototype.reset = function reset() {
    this.flash.clear();
    this.auxFlash.clear();
    this.flashUntil = 0;
    this.waveStart = 0;
    this.waveEnd = 0;
  };

  Renderer.prototype.startWave = function startWave() {
    const now = performance.now();
    this.waveStart = now;
    this.waveEnd = this.reducedMotion ? now + 1 : now + WAVE_MS;
    this.flashUntil = Math.max(this.flashUntil, this.waveEnd);
  };

  Renderer.prototype.cancelWave = function cancelWave() {
    this.waveStart = 0;
    this.waveEnd = 0;
  };

  Renderer.prototype.needsAnimation = function needsAnimation(now) {
    return this.flashUntil > now || this.waveEnd > now;
  };

  Renderer.prototype.noteOps = function noteOps(log, from, to, now) {
    if (!log || to <= from) return;
    const start = Math.max(from, to - 18);
    const stamp = now || performance.now();
    for (let k = start; k < to; k++) {
      const op = log.ops[k];
      if (!op) continue;
      if (op.t === 'compare' || op.t === 'swap' || op.t === 'write' || op.t === 'pivot') {
        const kind = op.t === 'write' ? 'aux' : op.t;
        if (typeof op.i === 'number' && op.i >= 0) {
          if (op.aux) this.auxFlash.set(op.i, { kind: kind, start: stamp });
          else this.flash.set(op.i, { kind: kind, start: stamp });
        }
        if (typeof op.j === 'number' && op.j >= 0) {
          if (op.aux) this.auxFlash.set(op.j, { kind: kind, start: stamp });
          else this.flash.set(op.j, { kind: kind, start: stamp });
        }
        if (op.t === 'pivot' && op.i >= 0) this.flash.set(op.i, { kind: 'pivot', start: stamp });
      }
    }
    this.flashUntil = Math.max(this.flashUntil, stamp + FLASH_MS);
  };

  Renderer.prototype.flashFor = function flashFor(index, now) {
    const entry = this.flash.get(index);
    if (!entry) return null;
    const age = now - entry.start;
    if (age > FLASH_MS) {
      this.flash.delete(index);
      return null;
    }
    return { kind: entry.kind, strength: 1 - age / FLASH_MS };
  };

  Renderer.prototype.auxFlashFor = function auxFlashFor(index, now) {
    const entry = this.auxFlash.get(index);
    if (!entry) return null;
    const age = now - entry.start;
    if (age > FLASH_MS) {
      this.auxFlash.delete(index);
      return null;
    }
    return { kind: entry.kind, strength: 1 - age / FLASH_MS };
  };

  Renderer.prototype.draw = function draw(log, now) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const palette = this.options.palette;
    const timestamp = now || performance.now();
    ctx.clearRect(0, 0, width, height);
    if (!log || !log.view.values.length) {
      ctx.fillStyle = palette.muted;
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for an array', width / 2, height / 2);
      return;
    }

    const state = log.view;
    const values = state.values;
    const n = values.length;
    const atEnd = state.index >= log.total;
    const verifiedEnd = atEnd && log.verified;
    const waveProgress = verifiedEnd && this.waveStart
      ? U.clamp((timestamp - this.waveStart) / Math.max(1, this.waveEnd - this.waveStart), 0, 1)
      : 0;
    const waveEdge = verifiedEnd ? waveProgress * (n + 8) : -10;
    const showTree = this.options.tree && log.def.id === 'heap';
    const valuesVisible = this.options.values && n <= 64 && !showTree;

    this.drawRange(state, palette, timestamp);

    if (showTree) {
      this.drawTree(values, state, log, timestamp, waveEdge);
    } else {
      this.drawBars(values, state, log, timestamp, waveEdge, verifiedEnd);
    }

    if (!showTree && valuesVisible) {
      this.drawValues(values, log);
    }

    if (state.index === 0) {
      ctx.fillStyle = palette.muted;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('seed ' + U.formatSeed(log.seed) + ' · ' + log.def.name.toLowerCase(), 12, 18);
    }

    this.drawAux(log, timestamp);
  };

  Renderer.prototype.barGeometry = function barGeometry(n) {
    const padX = this.options.compact ? 8 : 14;
    const padTop = this.options.compact ? 10 : 26;
    const padBottom = this.options.compact ? 8 : 18;
    const plotWidth = this.width - padX * 2;
    const plotHeight = this.height - padTop - padBottom;
    const slot = plotWidth / Math.max(1, n);
    const gap = n > 140 ? Math.min(1, slot * 0.18) : Math.min(4, Math.max(1, slot * 0.2));
    return {
      padX: padX,
      padTop: padTop,
      padBottom: padBottom,
      plotWidth: plotWidth,
      plotHeight: plotHeight,
      slot: slot,
      gap: gap,
      baseY: this.height - padBottom
    };
  };

  Renderer.prototype.drawBars = function drawBars(values, state, log, now, waveEdge, verifiedEnd) {
    const ctx = this.ctx;
    const palette = this.options.palette;
    const n = values.length;
    const g = this.barGeometry(n);
    const max = log.maxValue || 1;
    const mode = this.options.mode;
    const baseY = g.baseY;

    ctx.save();
    const baselineGradient = ctx.createLinearGradient(0, 0, this.width, 0);
    baselineGradient.addColorStop(0, rgba(palette.baseA, 0.08));
    baselineGradient.addColorStop(0.5, rgba(palette.baseB, 0.35));
    baselineGradient.addColorStop(1, rgba(palette.baseA, 0.08));
    ctx.fillStyle = baselineGradient;
    ctx.fillRect(g.padX, baseY, g.plotWidth, 1);

    for (let i = 0; i < n; i++) {
      const value = values[i];
      const ratio = U.clamp(value / max, 0, 1);
      const height = Math.max(1, ratio * g.plotHeight);
      const x = g.padX + i * g.slot + g.gap / 2;
      const barWidth = Math.max(1, g.slot - g.gap);
      const y = baseY - height;
      const t = U.clamp((value - 1) / Math.max(1, max - 1), 0, 1);
      let color = this.colorFor(mode, t, i, log, ratio);

      const sortedNow = state.flags[i] === 1 || (verifiedEnd && i <= waveEdge);
      if (sortedNow) {
        color = palette.sorted;
      }

      const flash = this.flashFor(i, now);
      if (flash && this.options.glow && barWidth > 2) {
        ctx.shadowColor = flash.kind === 'compare' ? palette.compare
          : flash.kind === 'swap' ? palette.swap
            : flash.kind === 'pivot' ? palette.pivot : palette.aux;
        ctx.shadowBlur = 14 * flash.strength + 4;
      } else {
        ctx.shadowBlur = 0;
      }

      if (flash) {
        const strength = flash.strength;
        const target = flash.kind === 'compare' ? palette.compare
          : flash.kind === 'swap' ? palette.swap
            : flash.kind === 'pivot' ? palette.pivot : palette.aux;
        color = mixHex(target, palette.bg, (1 - strength) * 0.35);
      }

      if (verifiedEnd && i > waveEdge && i < waveEdge + 3) {
        color = mixHex(color, palette.compare, 0.7);
      }

      if (mode === 'dots') {
        const radius = U.clamp(g.slot * 0.34, 1.1, 7);
        ctx.beginPath();
        ctx.arc(x + barWidth / 2, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.fillStyle = color;
        if (barWidth >= 4 && height > 4) {
          roundedTopPath(ctx, x, y, barWidth, height, Math.min(3, barWidth / 2.4));
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, height);
        }
      }
    }

    ctx.shadowBlur = 0;

    if (state.pivot >= 0 && state.pivot < n) {
      const x = g.padX + state.pivot * g.slot + g.slot / 2;
      ctx.fillStyle = palette.pivot;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(x, baseY + 6);
      ctx.lineTo(x - 4, baseY + 12);
      ctx.lineTo(x + 4, baseY + 12);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  Renderer.prototype.colorFor = function colorFor(mode, t, index, log, ratio) {
    const palette = this.options.palette;
    if (mode === 'gradient') {
      return this.rampVivid[Math.min(63, Math.round(t * 63))];
    }
    if (mode === 'disparity') {
      const target = log.sortedValues[index];
      const value = log.view.values[index];
      const deviation = Math.min(1, Math.abs(value - target) / Math.max(1, log.maxValue));
      return this.rampDisparity[Math.min(63, Math.round(deviation * 63))];
    }
    return this.rampBars[Math.min(63, Math.round(t * 63))];
  };

  Renderer.prototype.drawValues = function drawValues(values, log) {
    const ctx = this.ctx;
    const palette = this.options.palette;
    const n = values.length;
    const g = this.barGeometry(n);
    if (g.slot < 11) return;
    const max = log.maxValue || 1;
    const fontSize = Math.min(11, Math.max(7, g.slot * 0.46));
    ctx.save();
    ctx.font = '500 ' + fontSize + 'px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i < n; i++) {
      const height = Math.max(1, (values[i] / max) * g.plotHeight);
      const x = g.padX + i * g.slot + g.slot / 2;
      const y = g.baseY - height - 3;
      if (y < 9) continue;
      ctx.fillStyle = this.options.palette.id === 'light' ? '#1A2340' : '#E8EAF6';
      ctx.fillText(String(values[i]), x, y);
    }
    ctx.restore();
  };

  Renderer.prototype.drawRange = function drawRange(state, palette, now) {
    const ctx = this.ctx;
    const n = state.values.length;
    if (state.rangeA < 0 || state.rangeB < 0 || state.rangeA > state.rangeB) return;
    const a = U.clamp(state.rangeA, 0, n - 1);
    const b = U.clamp(state.rangeB, 0, n - 1);
    const g = this.barGeometry(n);
    const x1 = g.padX + a * g.slot;
    const x2 = g.padX + (b + 1) * g.slot;
    ctx.save();
    ctx.fillStyle = rgba(palette.aux, 0.055);
    ctx.fillRect(x1, g.padTop - 8, Math.max(1, x2 - x1), g.plotHeight + 8);
    ctx.strokeStyle = rgba(palette.aux, 0.55);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x1 + 0.5, g.padTop - 8);
    ctx.lineTo(x1 + 0.5, g.baseY);
    ctx.moveTo(x2 - 0.5, g.padTop - 8);
    ctx.lineTo(x2 - 0.5, g.baseY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  };

  Renderer.prototype.drawTree = function drawTree(values, state, log, now, waveEdge) {
    const ctx = this.ctx;
    const palette = this.options.palette;
    const n = values.length;
    if (!n) return;
    const padX = 18;
    const padTop = 18;
    const padBottom = 18;
    const levels = Math.floor(Math.log2(n)) + 1;
    const usableW = this.width - padX * 2;
    const usableH = this.height - padTop - padBottom;
    const radius = U.clamp(Math.min(usableW / Math.pow(2, levels - 1) * 0.28, usableH / levels * 0.3), 2, 15);
    const showText = n <= 63 && radius >= 7;
    const showEdges = n <= 127;
    const atEnd = state.index >= log.total;

    function nodeY(level) {
      return padTop + (level + 0.5) * (usableH / levels);
    }
    function nodeX(index, level) {
      const first = Math.pow(2, level) - 1;
      const position = index - first;
      const count = Math.min(Math.pow(2, level), n - first);
      return padX + (position + 0.5) * (usableW / count);
    }

    if (showEdges) {
      ctx.save();
      ctx.strokeStyle = rgba(palette.aux, 0.28);
      ctx.lineWidth = 1;
      for (let i = 1; i < n; i++) {
        const parent = (i - 1) >> 1;
        const level = Math.floor(Math.log2(i + 1));
        const parentLevel = level - 1;
        ctx.beginPath();
        ctx.moveTo(nodeX(parent, parentLevel), nodeY(parentLevel));
        ctx.lineTo(nodeX(i, level), nodeY(level));
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let i = 0; i < n; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const x = nodeX(i, level);
      const y = nodeY(level);
      const flash = this.flashFor(i, now);
      let color = this.rampBars[Math.min(63, Math.round((values[i] - 1) / Math.max(1, log.maxValue - 1) * 63))];
      if (state.flags[i] === 1 || (atEnd && log.verified && i <= waveEdge)) color = palette.sorted;
      if (flash) {
        color = flash.kind === 'compare' ? palette.compare
          : flash.kind === 'swap' ? palette.swap
            : flash.kind === 'pivot' ? palette.pivot : palette.aux;
      }
      if (state.pivot === i) color = palette.pivot;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      if (this.options.glow && flash) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(palette.bg, 0.55);
      ctx.lineWidth = 1;
      ctx.stroke();

      if (showText) {
        ctx.fillStyle = this.options.palette.id === 'light' ? '#10182E' : '#070A14';
        ctx.font = '500 ' + Math.max(8, Math.min(11, radius * 0.95)) + 'px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(values[i]), x, y + 0.5);
      }
    }
  };

  Renderer.prototype.drawAux = function drawAux(log, now) {
    if (!this.auxCtx) return;
    const ctx = this.auxCtx;
    const width = this.auxWidth || 1;
    const height = this.auxHeight || 1;
    ctx.clearRect(0, 0, width, height);
    const state = log.view;
    if (!state.auxOn || !state.aux.length) return;
    const values = state.aux;
    const count = Math.max(1, values.length);
    const padX = 4;
    const padTop = 4;
    const padBottom = 3;
    const slot = (width - padX * 2) / count;
    const gap = count > 60 ? 0.4 : Math.min(3, slot * 0.24);
    let max = 1;
    for (let i = 0; i < count; i++) {
      if (values[i] > max) max = values[i];
    }
    const palette = this.options.palette;
    const baseY = height - padBottom;
    for (let i = 0; i < count; i++) {
      const value = values[i];
      if (value == null) continue;
      const barHeight = Math.max(1, (value / max) * (height - padTop - padBottom));
      const x = padX + i * slot + gap / 2;
      const barWidth = Math.max(1, slot - gap);
      const flash = this.auxFlashFor(i, now);
      let color = palette.aux;
      if (flash) {
        color = flash.kind === 'compare' ? palette.compare : palette.aux;
      }
      ctx.fillStyle = color;
      if (barWidth >= 4) {
        roundedTopPath(ctx, x, baseY - barHeight, barWidth, barHeight, Math.min(2, barWidth / 2));
        ctx.fill();
      } else {
        ctx.fillRect(x, baseY - barHeight, barWidth, barHeight);
      }
    }
    ctx.save();
    ctx.strokeStyle = rgba(palette.aux, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, baseY + 0.5);
    ctx.lineTo(width - padX, baseY + 0.5);
    ctx.stroke();
    ctx.restore();
  };

  function roundedTopPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height);
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
  }

  SAV.Renderer = Renderer;
  SAV.rendererUtil = { mixHex: mixHex, rgba: rgba };
})(typeof window !== 'undefined' ? window : globalThis);
