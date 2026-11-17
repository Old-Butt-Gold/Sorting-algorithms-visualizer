/* Binary insertion — binary search for the slot, then adjacent swaps to open it. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* binaryInsertion(a, h) {
    const n = a.length;
    if (n === 0) return;
    yield h.sorted(0, 1);
    for (let i = 1; i < n; i++) {
      const key = a[i];
      let lo = 0;
      let hi = i - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        yield h.cmp(mid, i, 5);
        if (a[mid] <= key) lo = mid + 1;
        else hi = mid - 1;
      }
      for (let j = i; j > lo; j--) {
        yield h.swap(j - 1, j, 8);
      }
      yield h.sorted(i, 9);
    }
  }

  SAV.registerAlgorithm({
    id: 'binary-insertion',
    name: 'Binary insertion',
    family: 'Insertion',
    stability: 'stable',
    complexity: { best: 'Ω(n log n)', avg: 'Θ(n²)', worst: 'O(n²)', space: 'O(1)' },
    description: 'Binary insertion keeps the same sorted prefix as insertion sort, but finds the insertion slot with binary search instead of walking backwards. Comparisons drop to Θ(n log n); the element still has to be moved into place, and this implementation opens the slot with adjacent swaps, so movement stays quadratic.',
    good: 'When comparisons are much more expensive than moves, or as a teaching contrast with plain insertion.',
    bad: 'Move-dominated workloads: the shift phase still costs Θ(n²), and the log factor buys nothing there.',
    code: [
      'binaryInsertion(a)',
      '  for i ← 1 to n − 1',
      '    lo ← 0; hi ← i − 1; key ← a[i]',
      '    while lo ≤ hi',
      '      mid ← (lo + hi) / 2',
      '      if a[mid] ≤ key: lo ← mid + 1',
      '      else hi ← mid − 1',
      '    for j ← i down to lo + 1',
      '      swap a[j−1], a[j]',
      '    lock the prefix a[0…i]'
    ],
    lines: { compare: 5, swap: 8, sorted: 9 },
    run: binaryInsertion
  });
})(typeof window !== 'undefined' ? window : globalThis);
