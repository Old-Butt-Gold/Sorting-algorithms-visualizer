/* Sortlab — typed operation helpers and the single replay reducer.
   createOps is deliberately self-contained: it is serialised into the worker. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};

  function createOps(a, seed, options) {
    let state = (seed >>> 0) || 1;

    function random() {
      state = (state + 0x6D2B79F5) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    const aux = [];
    const api = {
      options: options || {},
      seed: seed >>> 0,
      aux: aux,
      random: random,
      randomInt: function randomInt(size) {
        if (!(size > 0)) return 0;
        return Math.floor(random() * size);
      },
      cmp: function cmp(i, j, line) {
        return { t: 'compare', i: i, j: j, l: line };
      },
      cmpAux: function cmpAux(i, j, line) {
        return { t: 'compare', i: i, j: j, aux: true, l: line };
      },
      swap: function swap(i, j, line) {
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
        return { t: 'swap', i: i, j: j, l: line };
      },
      write: function write(i, value, line) {
        a[i] = value;
        return { t: 'write', i: i, v: value, l: line };
      },
      pivot: function pivot(i, line) {
        return { t: 'pivot', i: i, l: line };
      },
      range: function range(lo, hi, line) {
        return { t: 'range', a: lo, b: hi, l: line };
      },
      sorted: function sorted(i, line) {
        return { t: 'sorted', i: i, l: line };
      },
      aw: function auxWrite(i, value, line) {
        aux[i] = value;
        return { t: 'auxWrite', i: i, v: value, l: line };
      },
      ar: function auxRead(i, line) {
        return { t: 'auxRead', i: i, l: line };
      },
      ax: function auxClear(value, line) {
        aux.length = 0;
        return { t: 'auxClear', v: value, l: line };
      },
      auxGet: function auxGet(i) {
        return aux[i];
      }
    };
    return api;
  }

  function apply(state, op) {
    if (!op || typeof op.t !== 'string') return;
    switch (op.t) {
      case 'compare':
        state.counts.compares += 1;
        break;
      case 'swap': {
        const values = state.values;
        const tmp = values[op.i];
        values[op.i] = values[op.j];
        values[op.j] = tmp;
        state.counts.swaps += 1;
        break;
      }
      case 'write':
        state.values[op.i] = op.v;
        state.counts.writes += 1;
        break;
      case 'pivot':
        state.pivot = typeof op.i === 'number' ? op.i : -1;
        break;
      case 'range':
        state.rangeA = typeof op.a === 'number' ? op.a : -1;
        state.rangeB = typeof op.b === 'number' ? op.b : -1;
        break;
      case 'sorted':
        if (op.i >= 0 && op.i < state.flags.length) state.flags[op.i] = 1;
        break;
      case 'auxWrite':
        state.aux[op.i] = op.v;
        state.auxOn = true;
        break;
      case 'auxRead':
        break;
      case 'auxClear':
        state.aux.length = 0;
        state.auxOn = false;
        break;
      default:
        break;
    }
    state.last = op;
  }

  function createState(values) {
    return {
      values: values.slice(),
      flags: new Uint8Array(values.length),
      aux: [],
      auxOn: false,
      pivot: -1,
      rangeA: -1,
      rangeB: -1,
      counts: { compares: 0, swaps: 0, writes: 0 },
      index: 0,
      last: null
    };
  }

  function copyState(target, source) {
    target.values = source.values.slice();
    target.flags = source.flags.slice();
    target.aux = source.aux.slice();
    target.auxOn = source.auxOn;
    target.pivot = source.pivot;
    target.rangeA = source.rangeA;
    target.rangeB = source.rangeB;
    target.counts = {
      compares: source.counts.compares,
      swaps: source.counts.swaps,
      writes: source.counts.writes
    };
    target.index = source.index;
    target.last = source.last;
    return target;
  }

  SAV.ops = {
    create: createOps,
    apply: apply,
    createState: createState,
    copyState: copyState,
    MAX_LOG_OPS: 3000000
  };
})(typeof window !== 'undefined' ? window : globalThis);
