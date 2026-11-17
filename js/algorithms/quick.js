/* Quicksort — Lomuto or Hoare partition, last / random / median-of-three pivot. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  const LOMUTO_CODE = [
    'quick(a, lo, hi)',
    '  if lo ≥ hi: lock a[lo]; return',
    '  p ← choosePivot(lo, hi)',
    '  swap a[p], a[hi]; pivot ← a[hi]',
    '  i ← lo',
    '  for j ← lo to hi − 1',
    '    if a[j] < pivot',
    '      swap a[i], a[j]; i ← i + 1',
    '  swap a[i], a[hi]',
    '  lock a[i]',
    '  quick(a, lo, i − 1)',
    '  quick(a, i + 1, hi)'
  ];

  const HOARE_CODE = [
    'quick(a, lo, hi)',
    '  if lo ≥ hi: lock a[lo]; return',
    '  p ← choosePivot(lo, hi); swap a[p], a[lo]',
    '  pivot ← a[lo]; i ← lo − 1; j ← hi + 1',
    '  loop',
    '    do i ← i+1 while a[i] < pivot',
    '    do j ← j−1 while a[j] > pivot',
    '    if i ≥ j: break',
    '    swap a[i], a[j]',
    '  quick(a, lo, j)',
    '  quick(a, j + 1, hi)'
  ];

  function* quickSort(a, h) {
    const n = a.length;
    if (n === 0) return;
    const options = h.options || {};
    const scheme = options.scheme === 'hoare' ? 'hoare' : 'lomuto';
    const pivotMode = options.pivot || 'last';

    if (scheme === 'hoare') {
      yield* hoare(0, n - 1);
    } else {
      yield* lomuto(0, n - 1);
    }

    function* choosePivot(lo, hi) {
      if (pivotMode === 'random' && hi > lo) {
        const offset = h.randomInt(hi - lo + 1);
        return lo + offset;
      }
      if (pivotMode === 'median' && hi - lo >= 2) {
        const mid = (lo + hi) >> 1;
        yield h.cmp(lo, mid, 2);
        yield h.cmp(mid, hi, 2);
        yield h.cmp(lo, hi, 2);
        const x = a[lo];
        const y = a[mid];
        const z = a[hi];
        if ((x <= y && y <= z) || (z <= y && y <= x)) return mid;
        if ((y <= x && x <= z) || (z <= x && x <= y)) return lo;
        return hi;
      }
      return hi;
    }

    function* lomuto(lo, hi) {
      if (lo > hi) return;
      if (lo === hi) {
        yield h.sorted(lo, 1);
        return;
      }
      yield h.range(lo, hi, 0);
      let p = yield* choosePivot(lo, hi);
      yield h.pivot(p, 3);
      if (p !== hi) {
        yield h.swap(p, hi, 3);
        p = hi;
      }

      let i = lo;
      for (let j = lo; j < hi; j++) {
        yield h.cmp(j, hi, 6);
        if (a[j] < a[hi]) {
          if (i !== j) yield h.swap(i, j, 7);
          i++;
        }
      }
      if (i !== hi) yield h.swap(i, hi, 8);
      yield h.pivot(-1, 8);
      yield h.sorted(i, 9);
      yield* lomuto(lo, i - 1);
      yield* lomuto(i + 1, hi);
    }

    function* hoare(lo, hi) {
      if (lo > hi) return;
      if (lo === hi) {
        yield h.sorted(lo, 1);
        return;
      }
      yield h.range(lo, hi, 0);
      let p = yield* choosePivot(lo, hi);
      if (p !== lo) {
        yield h.swap(lo, p, 2);
        p = lo;
      }
      yield h.pivot(p, 3);
      const pivot = a[p];
      let i = lo - 1;
      let j = hi + 1;

      for (;;) {
        do {
          i++;
          yield h.cmp(i, p, 5);
        } while (a[i] < pivot);

        do {
          j--;
          yield h.cmp(j, p, 6);
        } while (a[j] > pivot);

        if (i >= j) break;
        yield h.swap(i, j, 8);
        if (i === p) p = j;
        else if (j === p) p = i;
        yield h.pivot(p, 8);
      }

      yield h.pivot(-1, 9);
      yield* hoare(lo, j);
      yield* hoare(j + 1, hi);
    }
  }

  SAV.registerAlgorithm({
    id: 'quick',
    name: 'Quicksort',
    family: 'Quick',
    stability: 'unstable',
    complexity: { best: 'Ω(n log n)', avg: 'Θ(n log n)', worst: 'O(n²)', space: 'O(log n)' },
    description: 'Quicksort picks a pivot, partitions everything around it, and then sorts the two sides independently. Lomuto keeps a single boundary and places smaller values behind it; Hoare walks two pointers toward each other and usually swaps fewer times. Median-of-three softens the classic bad case where the last element is already the largest.',
    good: 'Average-case speed and cache locality; the go-to general-purpose in-memory sort when stability is not required.',
    bad: 'Adversarial or already sorted input with a naive pivot choice degrades to O(n²); recursion costs stack space and equal keys can be handled poorly by Lomuto.',
    code: LOMUTO_CODE,
    codeFor: function (options) {
      return options && options.scheme === 'hoare' ? HOARE_CODE : LOMUTO_CODE;
    },
    lines: { compare: 6, swap: 7, pivot: 3, sorted: 9 },
    run: quickSort
  });
})(typeof window !== 'undefined' ? window : globalThis);
