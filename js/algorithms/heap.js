/* Heap sort — in-place max-heap, unstable, O(n log n) in every case. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* heapSort(a, h) {
    const n = a.length;
    if (n === 0) return;
    if (n === 1) {
      yield h.sorted(0, 6);
      return;
    }

    for (let i = (n >> 1) - 1; i >= 0; i--) {
      yield* siftDown(i, n - 1);
    }

    for (let end = n - 1; end > 0; end--) {
      yield h.range(0, end, 3);
      yield h.swap(0, end, 4);
      yield h.sorted(end, 5);
      yield* siftDown(0, end - 1);
    }
    yield h.range(-1, -1, 7);
    yield h.sorted(0, 7);

    function* siftDown(root, last) {
      let node = root;
      for (;;) {
        let child = (node << 1) + 1;
        if (child > last) return;
        if (child + 1 <= last) {
          yield h.cmp(child, child + 1, 11);
          if (a[child + 1] > a[child]) child++;
        }
        yield h.cmp(node, child, 12);
        if (a[node] < a[child]) {
          yield h.swap(node, child, 12);
          node = child;
        } else {
          return;
        }
      }
    }
  }

  SAV.registerAlgorithm({
    id: 'heap',
    name: 'Heap sort',
    family: 'Heap',
    stability: 'unstable',
    complexity: { best: 'Ω(n log n)', avg: 'Θ(n log n)', worst: 'O(n log n)', space: 'O(1)' },
    description: 'Heap sort first rearranges the array into a max-heap, where every parent is at least as large as its children. It then repeatedly swaps the root (the maximum) to the end and sifts the new root down. The sorted suffix grows from the right, and the algorithm never needs more than constant extra memory.',
    good: 'Hard real-time budgets and memory-constrained systems: O(n log n) is guaranteed and the sort is in place.',
    bad: 'Stability and cache friendliness: the jumps between parent and child scatter memory access, and equal values can reorder.',
    code: [
      'heapSort(a)',
      '  for i ← n/2 − 1 down to 0',
      '    siftDown(i, n − 1)',
      '  for end ← n − 1 down to 1',
      '    swap a[0], a[end]',
      '    lock a[end]',
      '    siftDown(0, end − 1)',
      '  lock a[0]',
      'siftDown(root, last)',
      '  child ← 2·root + 1',
      '  while child ≤ last',
      '    if child+1 ≤ last and a[child+1] > a[child]: child ← child+1',
      '    if a[root] < a[child]: swap; root ← child',
      '    else stop'
    ],
    lines: { compare: 11, swap: 11, sorted: 4, range: 3 },
    run: heapSort
  });
})(typeof window !== 'undefined' ? window : globalThis);
