/* Comb sort — shrinking gap, the shell of exchange sorts. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* comb(a, h) {
    const n = a.length;
    if (n === 0) return;
    let gap = n;
    let swapped = true;
    while (gap > 1 || swapped) {
      gap = Math.floor(gap / 1.3);
      if (gap < 1) gap = 1;
      swapped = false;
      for (let i = 0; i + gap < n; i++) {
        yield h.cmp(i, i + gap, 5);
        if (a[i] > a[i + gap]) {
          yield h.swap(i, i + gap, 5);
          swapped = true;
        }
      }
    }
    for (let i = 0; i < n; i++) yield h.sorted(i, 6);
  }

  SAV.registerAlgorithm({
    id: 'comb',
    name: 'Comb sort',
    family: 'Exchange',
    stability: 'unstable',
    complexity: { best: 'Ω(n log n)', avg: '≈O(n² / 2^p)', worst: 'O(n²)', space: 'O(1)' },
    description: 'Comb sort is bubble sort with a gap: instead of comparing neighbours it compares values 1.3× apart, then shrinks the gap. Long-distance values move quickly, so the final gap-1 pass has far less to fix than in bubble sort. The 1.3 shrink factor is empirical and works well in practice.',
    good: 'A cheap in-place improvement over bubble, especially when values are far from home.',
    bad: 'No stability and no hard guarantee: the worst case remains quadratic, and gap tuning is heuristic.',
    code: [
      'comb(a)',
      '  gap ← n; swapped ← true',
      '  while gap > 1 or swapped',
      '    gap ← max(1, floor(gap / 1.3))',
      '    swapped ← false',
      '    for i ← 0 to n − gap − 1',
      '      if a[i] > a[i+gap]: swap; swapped ← true',
      '  lock every position'
    ],
    lines: { compare: 6, swap: 6, sorted: 7 },
    run: comb
  });
})(typeof window !== 'undefined' ? window : globalThis);
