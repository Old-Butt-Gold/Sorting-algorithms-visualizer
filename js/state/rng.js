/* Sortlab — deterministic arrays from a visible seed. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
      a = (a + 0x6D2B79F5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(array, random) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  function buildArray(size, dist, seed) {
    const n = Math.max(0, Math.floor(size));
    const random = mulberry32(seed >>> 0);
    const values = new Array(n);
    let i;

    if (dist === 'reversed') {
      for (i = 0; i < n; i++) values[i] = n - i;
      return values;
    }

    if (dist === 'sorted') {
      for (i = 0; i < n; i++) values[i] = i + 1;
      return values;
    }

    if (dist === 'few') {
      const pool = [
        Math.max(1, Math.round(n * 0.16)),
        Math.max(2, Math.round(n * 0.39)),
        Math.max(3, Math.round(n * 0.64)),
        Math.max(4, n)
      ];
      for (i = 0; i < n; i++) values[i] = pool[Math.floor(random() * pool.length)];
      return values;
    }

    if (dist === 'sawtooth') {
      const period = Math.max(3, Math.floor(n / 3));
      for (i = 0; i < n; i++) {
        const step = (i % period) + 1;
        values[i] = U.clamp(Math.round(step * n / period), 1, n);
      }
      return values;
    }

    if (dist === 'gaussian') {
      const mean = (n + 1) / 2;
      const sd = Math.max(0.8, (n + 1) / 6);
      for (i = 0; i < n; i++) {
        let u = 0;
        let v = 0;
        while (u === 0) u = random();
        while (v === 0) v = random();
        const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        values[i] = U.clamp(Math.round(mean + normal * sd), 1, n);
      }
      return values;
    }

    for (i = 0; i < n; i++) values[i] = i + 1;
    shuffle(values, random);

    if (dist === 'nearly') {
      const swaps = Math.max(1, Math.round(n * 0.06));
      for (let k = 0; k < swaps; k++) {
        const index = Math.floor(random() * Math.max(1, n - 1));
        const other = random() < 0.55 ? index + 1 : Math.min(n - 1, index + 2);
        const tmp = values[index];
        values[index] = values[other];
        values[other] = tmp;
      }
      if (n > 2) values[0] = 1;
    }

    return values;
  }

  function isSortedValues(values) {
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > values[i]) return false;
    }
    return true;
  }

  function isPermutation(original, current) {
    if (original.length !== current.length) return false;
    const a = original.slice().sort(function (x, y) { return x - y; });
    const b = current.slice().sort(function (x, y) { return x - y; });
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  SAV.rng = {
    mulberry32: mulberry32,
    shuffle: shuffle,
    buildArray: buildArray,
    isSortedValues: isSortedValues,
    isPermutation: isPermutation
  };
})(typeof window !== 'undefined' ? window : globalThis);
