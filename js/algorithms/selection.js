/* Selection sort — quadratic comparisons, one swap per position, unstable. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* selection(a, h) {
    const n = a.length;
    if (n === 0) return;
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      yield h.pivot(min, 2);
      for (let j = i + 1; j < n; j++) {
        yield h.cmp(j, min, 4);
        if (a[j] < a[min]) {
          min = j;
          yield h.pivot(min, 4);
        }
      }
      if (min !== i) yield h.swap(i, min, 5);
      yield h.sorted(i, 6);
      yield h.pivot(-1, 6);
    }
    yield h.sorted(n - 1, 7);
  }

  SAV.registerAlgorithm({
    id: 'selection',
    name: 'Selection sort',
    family: 'Selection',
    stability: 'unstable',
    complexity: { best: 'Ω(n²)', avg: 'Θ(n²)', worst: 'O(n²)', space: 'O(1)' },
    description: 'Selection sort scans the unsorted tail for the smallest value and swaps it into the next final slot. It always performs the full scan, even when the array is already ordered, but it makes at most one swap per position. Because a long-distance swap can leap one equal value over another, it is not stable.',
    good: 'Writing to memory is expensive and you need the minimum number of exchanges.',
    bad: 'Comparisons are always quadratic; already sorted input gets no discount at all.',
    code: [
      'selection(a)',
      '  for i ← 0 to n − 2',
      '    min ← i',
      '    for j ← i + 1 to n − 1',
      '      if a[j] < a[min]: min ← j',
      '    if min ≠ i: swap a[i], a[min]',
      '    lock a[i]',
      '  lock a[n − 1]'
    ],
    lines: { compare: 4, swap: 5, pivot: 2, sorted: 6 },
    run: selection
  });
})(typeof window !== 'undefined' ? window : globalThis);
