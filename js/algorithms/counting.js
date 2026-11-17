/* Counting sort — stable, O(n + k), buffer lane shows the counters. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* counting(a, h) {
    const n = a.length;
    if (n === 0) return;
    yield h.ax(0, 0);

    let maxIndex = 0;
    for (let i = 1; i < n; i++) {
      yield h.cmp(i, maxIndex, 1);
      if (a[i] > a[maxIndex]) maxIndex = i;
    }
    const max = a[maxIndex];
    const counts = new Array(max + 1).fill(0);

    for (let i = 0; i < n; i++) {
      const value = a[i];
      counts[value] += 1;
      yield h.aw(value, counts[value], 3);
    }

    let running = 0;
    for (let value = 0; value <= max; value++) {
      running += counts[value];
      counts[value] = running;
      if (counts[value] > 0) yield h.aw(value, counts[value], 4);
    }

    const output = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      const value = a[i];
      counts[value] -= 1;
      output[counts[value]] = value;
    }

    for (let i = 0; i < n; i++) {
      yield h.write(i, output[i], 6);
    }

    yield h.ax(-1, 7);
    for (let i = 0; i < n; i++) yield h.sorted(i, 7);
  }

  SAV.registerAlgorithm({
    id: 'counting',
    name: 'Counting sort',
    family: 'Distribution',
    stability: 'stable',
    complexity: { best: 'Ω(n + k)', avg: 'Θ(n + k)', worst: 'O(n + k)', space: 'O(n + k)' },
    description: 'Counting sort never compares values with each other. It counts how often every integer occurs, turns those counts into starting positions, then places each value at its final index while walking the input backwards. Walking backwards is what makes it stable. It only works when the value range k is bounded.',
    good: 'Small integer ranges, grades, ages, byte values — anywhere k is close to n.',
    bad: 'Huge sparse ranges, floating-point keys, or strings; the count array can dwarf the input.',
    code: [
      'counting(a)',
      '  find the maximum value m',
      '  counts ← zeros(m + 1)',
      '  for each x in a: counts[x] ← counts[x] + 1',
      '  prefix sums over counts',
      '  for x in a backwards: place x stably into output',
      '  copy output back into a',
      '  lock every position'
    ],
    lines: { compare: 1, auxWrite: 3, write: 6, sorted: 7 },
    run: counting
  });
})(typeof window !== 'undefined' ? window : globalThis);
