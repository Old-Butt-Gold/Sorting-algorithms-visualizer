/* Bubble sort — stable, early exit when a full pass makes no swaps. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* bubble(a, h) {
    const n = a.length;
    if (n === 0) return;
    let end = n - 1;
    while (end > 0) {
      let swapped = false;
      for (let i = 0; i < end; i++) {
        yield h.cmp(i, i + 1, 4);
        if (a[i] > a[i + 1]) {
          yield h.swap(i, i + 1, 5);
          swapped = true;
        }
      }
      yield h.sorted(end, 7);
      if (!swapped) {
        for (let i = 0; i < end; i++) yield h.sorted(i, 8);
        return;
      }
      end--;
    }
    yield h.sorted(0, 9);
  }

  SAV.registerAlgorithm({
    id: 'bubble',
    name: 'Bubble sort',
    family: 'Exchange',
    stability: 'stable',
    complexity: { best: 'Ω(n)', avg: 'Θ(n²)', worst: 'O(n²)', space: 'O(1)' },
    description: 'Bubble sort walks the array and swaps neighbours that are out of order. After every full pass the largest remaining value has bubbled to the right edge, so the next pass can stop earlier. The early-exit flag makes an already sorted array a single linear scan.',
    good: 'Tiny arrays, teaching the idea of an invariant, and already sorted input thanks to the early exit.',
    bad: 'Large or reversed arrays: it performs Θ(n²) comparisons and moves, and it touches the array far more than insertion sort.',
    code: [
      'bubble(a)',
      '  for end ← n-1 down to 1',
      '    swapped ← false',
      '    for i ← 0 to end-1',
      '      if a[i] > a[i + 1]',
      '        swap a[i], a[i + 1]',
      '        swapped ← true',
      '    lock a[end]',
      '    if not swapped: lock the rest; stop',
      '  lock a[0]'
    ],
    lines: { compare: 4, swap: 5, sorted: 7 },
    run: bubble
  });
})(typeof window !== 'undefined' ? window : globalThis);
