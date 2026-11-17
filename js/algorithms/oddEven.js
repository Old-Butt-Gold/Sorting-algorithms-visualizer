/* Odd–even transposition sort — brick sort with alternating phases. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* oddEven(a, h) {
    const n = a.length;
    if (n === 0) return;
    let sorted = false;
    while (!sorted) {
      sorted = true;
      for (let i = 1; i + 1 < n; i += 2) {
        yield h.cmp(i, i + 1, 3);
        if (a[i] > a[i + 1]) {
          yield h.swap(i, i + 1, 3);
          sorted = false;
        }
      }
      for (let i = 0; i + 1 < n; i += 2) {
        yield h.cmp(i, i + 1, 4);
        if (a[i] > a[i + 1]) {
          yield h.swap(i, i + 1, 4);
          sorted = false;
        }
      }
    }
    for (let i = 0; i < n; i++) yield h.sorted(i, 6);
  }

  SAV.registerAlgorithm({
    id: 'odd-even',
    name: 'Odd–even sort',
    family: 'Exchange',
    stability: 'stable',
    complexity: { best: 'Ω(n)', avg: 'Θ(n²)', worst: 'O(n²)', space: 'O(1)' },
    description: 'Odd–even sort alternates two neighbour phases: first every odd-indexed pair, then every even-indexed pair. Each phase is independent, which is why the algorithm maps naturally onto parallel hardware. On a serial machine it is bubble sort with a more regular access pattern.',
    good: 'Parallel implementations and teaching compare-exchange networks.',
    bad: 'Serial use: still quadratic, and the two-phase loop adds overhead without changing the asymptotics.',
    code: [
      'oddEven(a)',
      '  repeat',
      '    sorted ← true',
      '    for odd i: if a[i] > a[i+1]: swap',
      '    for even i: if a[i] > a[i+1]: swap',
      '  until no swaps',
      '  lock every position'
    ],
    lines: { compare: 3, swap: 3, sorted: 6 },
    run: oddEven
  });
})(typeof window !== 'undefined' ? window : globalThis);
