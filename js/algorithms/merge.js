/* Merge sort — stable divide and conquer with a visible auxiliary buffer. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* mergeSort(a, h) {
    const n = a.length;
    if (n === 0) return;
    yield* sort(0, n - 1);
    yield h.range(-1, -1, 13);
    for (let i = 0; i < n; i++) yield h.sorted(i, 13);

    function* sort(lo, hi) {
      if (lo >= hi) return;
      const mid = (lo + hi) >> 1;
      yield* sort(lo, mid);
      yield* sort(mid + 1, hi);

      yield h.range(lo, hi, 5);
      for (let i = lo; i <= hi; i++) {
        yield h.aw(i, a[i], 5);
      }

      let i = lo;
      let j = mid + 1;
      let k = lo;
      while (i <= mid && j <= hi) {
        yield h.cmpAux(i, j, 8);
        const left = h.auxGet(i);
        const right = h.auxGet(j);
        if (left <= right) {
          yield h.write(k, left, 9);
          i++;
        } else {
          yield h.write(k, right, 10);
          j++;
        }
        k++;
      }
      while (i <= mid) {
        yield h.write(k, h.auxGet(i), 12);
        i++;
        k++;
      }
      while (j <= hi) {
        yield h.write(k, h.auxGet(j), 12);
        j++;
        k++;
      }
      yield h.ax(13);
    }
  }

  SAV.registerAlgorithm({
    id: 'merge',
    name: 'Merge sort',
    family: 'Merge',
    stability: 'stable',
    complexity: { best: 'Ω(n log n)', avg: 'Θ(n log n)', worst: 'O(n log n)', space: 'O(n)' },
    description: 'Merge sort splits the array in half until every piece has one element, then merges neighbouring pieces through a buffer. The merge always compares the two front values and takes the smaller one, so equal values keep their original order. It is the dependable Θ(n log n) sort, paid for with a linear-size buffer.',
    good: 'Predictable performance, stable output, linked lists, and external sorting where sequential access matters.',
    bad: 'In-place use: the O(n) buffer and copying cost hurt on tiny arrays where insertion sort wins.',
    code: [
      'mergeSort(a, lo, hi)',
      '  if lo ≥ hi: return',
      '  mid ← (lo + hi) / 2',
      '  mergeSort(a, lo, mid)',
      '  mergeSort(a, mid+1, hi)',
      '  copy a[lo…hi] into the buffer',
      '  i ← lo; j ← mid+1; k ← lo',
      '  while both halves have values',
      '    if buffer[i] ≤ buffer[j]',
      '      a[k] ← buffer[i]; i ← i+1',
      '    else a[k] ← buffer[j]; j ← j+1',
      '    k ← k+1',
      '  copy whatever remains',
      '  clear the buffer; lock the range when done'
    ],
    lines: { compare: 8, write: 9, auxWrite: 5, range: 5, sorted: 13 },
    run: mergeSort
  });
})(typeof window !== 'undefined' ? window : globalThis);
