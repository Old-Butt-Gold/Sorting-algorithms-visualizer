/* Insertion sort — stable, adjacent swaps, linear on nearly sorted input. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* insertion(a, h) {
    const n = a.length;
    if (n === 0) return;
    yield h.sorted(0, 1);
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        yield h.cmp(j - 1, j, 4);
        if (a[j - 1] > a[j]) {
          yield h.swap(j - 1, j, 5);
          j--;
        } else {
          break;
        }
      }
      yield h.sorted(i, 7);
    }
  }

  SAV.registerAlgorithm({
    id: 'insertion',
    name: 'Insertion sort',
    family: 'Insertion',
    stability: 'stable',
    complexity: { best: 'Ω(n)', avg: 'Θ(n²)', worst: 'O(n²)', space: 'O(1)' },
    description: 'Insertion sort treats the left prefix as a sorted hand of cards and slides each new value left until it sits after every smaller value. On nearly sorted input the value barely moves, so the inner loop runs only a handful of times. The prefix is a real invariant: after step i, a[0…i] is sorted.',
    good: 'Nearly sorted data, tiny arrays, and as the finishing step inside Timsort where blocks are already locally ordered.',
    bad: 'Reversed input: every value travels across the whole prefix, producing Θ(n²) swaps.',
    code: [
      'insertion(a)',
      '  lock a[0]',
      '  for i ← 1 to n − 1',
      '    j ← i',
      '    while j > 0 and a[j−1] > a[j]',
      '      swap a[j−1], a[j]',
      '      j ← j − 1',
      '    lock the prefix a[0…i]'
    ],
    lines: { compare: 4, swap: 5, sorted: 7 },
    run: insertion
  });
})(typeof window !== 'undefined' ? window : globalThis);
