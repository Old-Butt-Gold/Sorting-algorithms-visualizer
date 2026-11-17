/* Shell sort — gapped insertion, Shell's original n/2 gap sequence. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* shell(a, h) {
    const n = a.length;
    if (n === 0) return;
    let gap = n >> 1;
    while (gap > 0) {
      for (let i = gap; i < n; i++) {
        let j = i;
        while (j >= gap) {
          yield h.cmp(j - gap, j, 5);
          if (a[j - gap] > a[j]) {
            yield h.swap(j - gap, j, 6);
            j -= gap;
          } else {
            break;
          }
        }
      }
      gap >>= 1;
    }
    for (let i = 0; i < n; i++) yield h.sorted(i, 9);
  }

  SAV.registerAlgorithm({
    id: 'shell',
    name: 'Shell sort',
    family: 'Insertion',
    stability: 'unstable',
    complexity: { best: 'Ω(n log n)', avg: '≈O(n^1.5)', worst: 'O(n²)', space: 'O(1)' },
    description: 'Shell sort runs insertion sort on elements that are gap positions apart, then halves the gap. Early passes move values long distances, so the final gap-1 pass has much less work. With Shell’s original n/2 gap sequence the theoretical worst case is still quadratic, although it behaves far better than that on typical arrays.',
    good: 'A compact in-place sort when quicksort recursion or merge buffers are inconvenient.',
    bad: 'The gap sequence matters; poor sequences can leave a quadratic tail, and the algorithm is not stable.',
    code: [
      'shell(a)',
      '  gap ← n / 2',
      '  while gap ≥ 1',
      '    for i ← gap to n − 1',
      '      j ← i',
      '      while j ≥ gap and a[j−gap] > a[j]',
      '        swap a[j−gap], a[j]',
      '        j ← j − gap',
      '    gap ← gap / 2',
      '  lock every position'
    ],
    lines: { compare: 5, swap: 6, sorted: 9 },
    run: shell
  });
})(typeof window !== 'undefined' ? window : globalThis);
