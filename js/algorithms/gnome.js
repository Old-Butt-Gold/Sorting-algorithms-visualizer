/* Gnome sort — walk right until out of order, then walk the value left. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* gnome(a, h) {
    const n = a.length;
    if (n === 0) return;
    let i = 1;
    while (i < n) {
      yield h.cmp(i - 1, i, 3);
      if (a[i - 1] <= a[i]) {
        i++;
      } else {
        yield h.swap(i - 1, i, 4);
        i = i > 1 ? i - 1 : 1;
      }
    }
    for (let k = 0; k < n; k++) yield h.sorted(k, 5);
  }

  SAV.registerAlgorithm({
    id: 'gnome',
    name: 'Gnome sort',
    family: 'Insertion',
    stability: 'stable',
    complexity: { best: 'Ω(n)', avg: 'Θ(n²)', worst: 'O(n²)', space: 'O(1)' },
    description: 'Gnome sort is insertion sort without an inner loop: it steps right while the pair is ordered, and whenever it finds an inversion it swaps and steps left. It is the easiest exchange sort to reason about, and on nearly sorted data it behaves almost linearly. There is no hidden state beyond the current position.',
    good: 'Teaching and nearly sorted input; the code is short enough to verify by eye.',
    bad: 'Random input: each value is carried left one swap at a time, giving quadratic movement.',
    code: [
      'gnome(a)',
      '  i ← 1',
      '  while i < n',
      '    if a[i−1] ≤ a[i]: i ← i + 1',
      '    else swap; i ← max(1, i − 1)',
      '  lock every position'
    ],
    lines: { compare: 3, swap: 4, sorted: 5 },
    run: gnome
  });
})(typeof window !== 'undefined' ? window : globalThis);
