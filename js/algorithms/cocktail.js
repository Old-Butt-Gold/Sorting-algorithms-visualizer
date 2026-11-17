/* Cocktail shaker sort — bidirectional bubble sort with shrinking bounds. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* cocktail(a, h) {
    const n = a.length;
    if (n === 0) return;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      let swapped = false;
      for (let i = lo; i < hi; i++) {
        yield h.cmp(i, i + 1, 4);
        if (a[i] > a[i + 1]) {
          yield h.swap(i, i + 1, 5);
          swapped = true;
        }
      }
      yield h.sorted(hi, 5);
      hi--;
      if (!swapped) {
        for (let i = lo; i <= hi; i++) yield h.sorted(i, 6);
        return;
      }

      swapped = false;
      for (let i = hi; i > lo; i--) {
        yield h.cmp(i - 1, i, 8);
        if (a[i - 1] > a[i]) {
          yield h.swap(i - 1, i, 8);
          swapped = true;
        }
      }
      yield h.sorted(lo, 9);
      lo++;
      if (!swapped) {
        for (let i = lo; i <= hi; i++) yield h.sorted(i, 9);
        return;
      }
    }
    for (let i = lo; i <= hi; i++) yield h.sorted(i, 9);
  }

  SAV.registerAlgorithm({
    id: 'cocktail',
    name: 'Cocktail shaker',
    family: 'Exchange',
    stability: 'stable',
    complexity: { best: 'Ω(n)', avg: 'Θ(n²)', worst: 'O(n²)', space: 'O(1)' },
    description: 'Cocktail sort is bubble sort that alternates direction: one pass pushes the largest value right, the next pushes the smallest value left. The two shrinking edges mean a value near either end travels there in one sweep instead of many. It is still quadratic, but the constant is better than bubble on some shapes.',
    good: 'Arrays with a few tiny values stuck at the end — the backward pass rescues them immediately.',
    bad: 'General large inputs; the double pass doubles bookkeeping without changing the asymptotic cost.',
    code: [
      'cocktail(a)',
      '  lo ← 0; hi ← n − 1',
      '  while lo < hi',
      '    for i ← lo to hi − 1',
      '      if a[i] > a[i+1]: swap; swapped ← true',
      '    lock a[hi]; hi ← hi − 1',
      '    if no swaps: lock lo…hi; stop',
      '    for i ← hi down to lo + 1',
      '      if a[i−1] > a[i]: swap; swapped ← true',
      '    lock a[lo]; lo ← lo + 1',
      '    if no swaps: lock lo…hi; stop'
    ],
    lines: { compare: 4, swap: 4, sorted: 5 },
    run: cocktail
  });
})(typeof window !== 'undefined' ? window : globalThis);
