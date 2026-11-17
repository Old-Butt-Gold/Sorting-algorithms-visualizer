/* Sortlab — algorithm registry. Generators know arrays and ops, never the DOM. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const list = [];
  const byId = Object.create(null);

  const FAMILY_ORDER = [
    'Exchange',
    'Insertion',
    'Selection',
    'Heap',
    'Merge',
    'Quick',
    'Distribution',
    'Fun'
  ];

  function registerAlgorithm(def) {
    if (!def || !def.id || typeof def.run !== 'function') {
      throw new Error('registerAlgorithm: id and generator are required');
    }
    if (byId[def.id]) throw new Error('Duplicate algorithm id: ' + def.id);
    const algorithm = Object.assign({
      stability: 'unstable',
      complexity: { best: '—', avg: '—', worst: '—', space: '—' },
      family: 'Exchange',
      lines: { compare: 0, swap: 0, write: 0, pivot: 0, range: 0, sorted: 0, auxWrite: 0 }
    }, def);
    list.push(algorithm);
    byId[algorithm.id] = algorithm;
    return algorithm;
  }

  function getAlgorithm(id) {
    return byId[id] || null;
  }

  function groups() {
    const map = new Map();
    list.forEach(function (algorithm) {
      if (!map.has(algorithm.family)) map.set(algorithm.family, []);
      map.get(algorithm.family).push(algorithm);
    });
    const out = [];
    FAMILY_ORDER.forEach(function (family) {
      if (map.has(family)) out.push({ family: family, algorithms: map.get(family) });
    });
    map.forEach(function (algorithms, family) {
      if (FAMILY_ORDER.indexOf(family) < 0) out.push({ family: family, algorithms: algorithms });
    });
    return out;
  }

  function lineFor(algorithm, op, options) {
    if (!op) return -1;
    if (typeof op.l === 'number') return op.l;
    if (algorithm.lineFor) {
      const custom = algorithm.lineFor(op, options);
      if (typeof custom === 'number') return custom;
    }
    const key = op.t;
    const map = algorithm.lines || {};
    return typeof map[key] === 'number' ? map[key] : -1;
  }

  function codeFor(algorithm, options) {
    if (typeof algorithm.codeFor === 'function') return algorithm.codeFor(options || {});
    return algorithm.code || [];
  }

  SAV.algorithms = list;
  SAV.registerAlgorithm = registerAlgorithm;
  SAV.getAlgorithm = getAlgorithm;
  SAV.algorithmGroups = groups;
  SAV.algorithmLine = lineFor;
  SAV.algorithmCode = codeFor;
})(typeof window !== 'undefined' ? window : globalThis);
