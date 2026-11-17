/* Timsort (simplified) — insertion runs, then merging runs. Stable. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* timSort(a, h) {
    const n = a.length;
    if (n === 0) return;

    const minRun = computeMinRun(n);
    for (let start = 0; start < n; start += minRun) {
      const end = Math.min(start + minRun - 1, n - 1);
      yield h.range(start, end, 1);
      for (let i = start + 1; i <= end; i++) {
        let j = i;
        while (j > start) {
          yield h.cmp(j - 1, j, 3);
          if (a[j - 1] > a[j]) {
            yield h.swap(j - 1, j, 3);
            j--;
          } else {
            break;
          }
        }
      }
    }
    yield h.range(-1, -1, 3);

    for (let width = minRun; width < n; width *= 2) {
      for (let left = 0; left < n; left += width * 2) {
        const mid = Math.min(left + width - 1, n - 1);
        const right = Math.min(left + width * 2 - 1, n - 1);
        if (mid < right) yield* mergeRuns(left, mid, right);
      }
    }

    for (let i = 0; i < n; i++) yield h.sorted(i, 6);

    function computeMinRun(size) {
      let rest = 0;
      let work = size;
      while (work >= 32) {
        rest |= work & 1;
        work >>= 1;
      }
      return work + rest;
    }

    function* mergeRuns(lo, mid, hi) {
      yield h.range(lo, hi, 5);
      for (let i = lo; i <= hi; i++) yield h.aw(i, a[i], 5);

      let i = lo;
      let j = mid + 1;
      let k = lo;
      while (i <= mid && j <= hi) {
        yield h.cmpAux(i, j, 5);
        const left = h.auxGet(i);
        const right = h.auxGet(j);
        if (left <= right) {
          yield h.write(k, left, 5);
          i++;
        } else {
          yield h.write(k, right, 5);
          j++;
        }
        k++;
      }
      while (i <= mid) {
        yield h.write(k, h.auxGet(i), 5);
        i++;
        k++;
      }
      while (j <= hi) {
        yield h.write(k, h.auxGet(j), 5);
        j++;
        k++;
      }
      yield h.ax(-1, 5);
    }
  }

  SAV.registerAlgorithm({
    id: 'tim',
    name: 'Timsort',
    family: 'Merge',
    stability: 'stable',
    complexity: { best: 'Ω(n)', avg: 'Θ(n log n)', worst: 'O(n log n)', space: 'O(n)' },
    description: 'Timsort starts by insertion-sorting short blocks, then merges neighbouring runs. Real-world arrays are rarely random, so those pre-sorted runs are wide and many merges disappear. This teaching version keeps the insertion-run and merge skeleton but skips galloping and run-stack balancing.',
    good: 'Real-world data with natural order: nearly sorted logs, partially updated tables, time-series chunks.',
    bad: 'The simplified version lacks galloping and the production run stack, so adversarial shapes are not as well defended.',
    code: [
      'timsort(a)',
      '  run ← minRun(n); sort each block by insertion',
      '  for i inside a block',
      '    compare and swap neighbours',
      '  for width ← run; width < n; width ← width×2',
      '    merge neighbouring runs through a buffer',
      '  lock every position'
    ],
    lines: { compare: 3, swap: 3, write: 5, auxWrite: 5, sorted: 6 },
    run: timSort
  });
})(typeof window !== 'undefined' ? window : globalThis);
