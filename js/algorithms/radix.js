/* Radix LSD — stable digit passes in base 10, buffer lane shows the ten buckets. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* radix(a, h) {
    const n = a.length;
    if (n === 0) return;
    yield h.ax(0, 0);

    let maxIndex = 0;
    for (let i = 1; i < n; i++) {
      yield h.cmp(i, maxIndex, 1);
      if (a[i] > a[maxIndex]) maxIndex = i;
    }
    const max = a[maxIndex];

    let exp = 1;
    while (Math.floor(max / exp) > 0) {
      const counts = new Array(10).fill(0);

      for (let i = 0; i < n; i++) {
        const digit = Math.floor(a[i] / exp) % 10;
        counts[digit] += 1;
        yield h.aw(digit, counts[digit], 4);
      }

      for (let digit = 1; digit < 10; digit++) {
        counts[digit] += counts[digit - 1];
      }

      const output = new Array(n);
      for (let i = n - 1; i >= 0; i--) {
        const digit = Math.floor(a[i] / exp) % 10;
        counts[digit] -= 1;
        output[counts[digit]] = a[i];
      }

      for (let i = 0; i < n; i++) {
        yield h.write(i, output[i], 7);
      }
      yield h.ax(-1, 8);
      exp *= 10;
    }

    for (let i = 0; i < n; i++) yield h.sorted(i, 9);
  }

  SAV.registerAlgorithm({
    id: 'radix',
    name: 'Radix LSD',
    family: 'Distribution',
    stability: 'stable',
    complexity: { best: 'Ω(nk)', avg: 'Θ(nk)', worst: 'O(nk)', space: 'O(n + k)' },
    description: 'Radix sort processes one decimal digit at a time, least significant first. Each pass is a stable counting pass, so earlier digit decisions survive later passes. After the final pass the array is ordered by the full number. The cost is linear in n times the digit count k, not in the value range.',
    good: 'Fixed-width integer keys, IDs, timestamps and other records where k is small.',
    bad: 'Floating-point or negative keys without an encoding step, and very wide keys where k grows.',
    code: [
      'radixLSD(a)',
      '  m ← max(a); exp ← 1',
      '  while exp ≤ m',
      '    counts ← ten zeros',
      '    for x in a: counts[digit(x, exp)]++',
      '    prefix sums over the ten digits',
      '    place values into output from right to left',
      '    copy output back into a',
      '    exp ← exp × 10',
      '  lock every position'
    ],
    lines: { compare: 1, auxWrite: 4, write: 7, sorted: 9 },
    run: radix
  });
})(typeof window !== 'undefined' ? window : globalThis);
