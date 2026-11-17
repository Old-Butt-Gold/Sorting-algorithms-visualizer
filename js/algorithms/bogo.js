/* Bogo sort — a deliberately absurd demo, capped so it can never hang the lab. */
(function (global) {
  'use strict';
  const SAV = global.SAV;

  function* bogo(a, h) {
    const n = a.length;
    if (n <= 1) {
      if (n === 1) yield h.sorted(0, 4);
      return;
    }

    for (let attempt = 0; attempt < 4000; attempt++) {
      let ordered = true;
      for (let i = 1; i < n; i++) {
        yield h.cmp(i - 1, i, 2);
        if (a[i - 1] > a[i]) {
          ordered = false;
          break;
        }
      }
      if (ordered) {
        for (let i = 0; i < n; i++) yield h.sorted(i, 4);
        return;
      }
      for (let i = n - 1; i > 0; i--) {
        const j = h.randomInt(i + 1);
        if (j !== i) yield h.swap(i, j, 3);
      }
    }
    // Cap reached: deliberately leave the array unsorted so the log verifier
    // reports the truth instead of pretending the demo succeeded.
  }

  SAV.registerAlgorithm({
    id: 'bogo',
    name: 'Bogo sort',
    family: 'Fun',
    stability: 'stable',
    complexity: { best: 'Ω(n)', avg: 'Θ(n · n!)', worst: 'unbounded', space: 'O(1)' },
    description: 'Bogo sort checks whether the array is sorted and, if not, shuffles it and tries again. It is the punchline of sorting: correct, stable, and hopeless. This version is capped at 4000 shuffles and the lab limits its array size, so the joke never freezes the page.',
    good: 'Nothing practical. It is a memorable demonstration of why algorithmic complexity matters.',
    bad: 'Absolutely everything: expected time is Θ(n · n!), and the worst case has no finite bound.',
    code: [
      'bogo(a)',
      '  repeat',
      '    if sorted(a): stop',
      '    shuffle(a)',
      '  lock every position'
    ],
    lines: { compare: 2, swap: 3, sorted: 4 },
    run: bogo
  });
})(typeof window !== 'undefined' ? window : globalThis);
