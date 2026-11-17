/* Sortlab — deterministic operation log, snapshots and exact seek. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;
  const O = SAV.ops;

  function seedFor(def, seed) {
    return ((seed >>> 0) ^ U.hashString(def.id)) >>> 0;
  }

  function buildLog(def, input, options, seed, opList, runSeed) {
    if (!def || typeof def.run !== 'function') throw new Error('Unknown algorithm');
    if (!Array.isArray(input)) throw new Error('Input must be an array');

    const ops = opList ? opList.slice() : generateOps(def, input, options, seed, runSeed);
    const n = input.length;

    let interval = 256;
    const snapshotCellsEstimate = Math.ceil(ops.length / interval) * (n * 2 + 8);
    if (snapshotCellsEstimate > 14000000) interval = 1024;
    if (Math.ceil(ops.length / interval) * (n * 2 + 8) > 14000000) interval = 4096;

    const view = O.createState(input);
    const snapshots = [];
    snapshots.push(makeSnapshot(view, 0));

    for (let i = 0; i < ops.length; i++) {
      if (i > 0 && i % interval === 0) snapshots.push(makeSnapshot(view, i));
      O.apply(view, ops[i]);
    }

    const sortedValues = input.slice().sort(function (x, y) { return x - y; });
    const verified = SAV.rng.isSortedValues(view.values) && SAV.rng.isPermutation(input, view.values);
    const finalCounts = {
      compares: view.counts.compares,
      swaps: view.counts.swaps,
      writes: view.counts.writes
    };
    let maxValue = 0;
    for (let i = 0; i < n; i++) {
      if (input[i] > maxValue) maxValue = input[i];
    }

    const log = {
      def: def,
      input: input.slice(),
      options: Object.assign({}, options || {}),
      seed: seed >>> 0,
      runSeed: runSeed == null ? seedFor(def, seed) : runSeed >>> 0,
      ops: ops,
      total: ops.length,
      sortedValues: sortedValues,
      maxValue: maxValue || 1,
      verified: verified,
      finalCounts: finalCounts,
      interval: interval,
      snapshots: snapshots,
      view: O.createState(input),
      viewIndex: -1,
      seek: function seek(target) {
        const index = Math.round(U.clamp(Number(target) || 0, 0, log.total));
        if (index === log.viewIndex) return log.view;
        if (index > log.viewIndex && log.viewIndex >= 0 && index - log.viewIndex <= log.interval * 2) {
          for (let k = log.viewIndex; k < index; k++) O.apply(log.view, log.ops[k]);
        } else {
          const bucket = Math.min(log.snapshots.length - 1, Math.floor(index / log.interval));
          const snapshot = log.snapshots[bucket];
          O.copyState(log.view, snapshot);
          for (let k = snapshot.index; k < index; k++) O.apply(log.view, log.ops[k]);
        }
        log.view.index = index;
        log.viewIndex = index;
        return log.view;
      }
    };

    log.seek(0);
    return log;
  }

  function generateOps(def, input, options, seed, runSeed) {
    const working = input.slice();
    const h = O.create(working, runSeed == null ? seedFor(def, seed) : runSeed, options || {});
    const ops = [];
    const generator = def.run(working, h);
    for (const op of generator) {
      if (!op || typeof op.t !== 'string') {
        throw new Error(def.name + ' produced an invalid operation');
      }
      ops.push(op);
      if (ops.length > O.MAX_LOG_OPS) {
        throw new Error('Operation log exceeded ' + U.fmtInt(O.MAX_LOG_OPS) + ' entries');
      }
    }
    return ops;
  }

  function makeSnapshot(state, index) {
    return {
      index: index,
      values: state.values.slice(),
      flags: state.flags.slice(),
      aux: state.aux.slice(),
      auxOn: state.auxOn,
      pivot: state.pivot,
      rangeA: state.rangeA,
      rangeB: state.rangeB,
      counts: {
        compares: state.counts.compares,
        swaps: state.counts.swaps,
        writes: state.counts.writes
      }
    };
  }

  async function buildLogAsync(def, input, options, seed) {
    const runSeed = seedFor(def, seed);
    const config = SAV.state;
    const wantWorker = input.length > config.WORKER_THRESHOLD && SAV.worker && SAV.worker.available();
    if (wantWorker) {
      try {
        const result = await SAV.worker.generate(def, input, options || {}, runSeed);
        return buildLog(def, input, options, seed, result.ops, runSeed);
      } catch (error) {
        if (global.console && global.console.warn) {
          global.console.warn('Worker log generation failed, falling back to the main thread.', error);
        }
      }
    }
    const yieldFrame = input.length > 900;
    if (yieldFrame) await U.nextFrame();
    return buildLog(def, input, options, seed, null, runSeed);
  }

  SAV.engine = SAV.engine || {};
  SAV.engine.seedFor = seedFor;
  SAV.engine.buildLog = buildLog;
  SAV.engine.buildLogAsync = buildLogAsync;
})(typeof window !== 'undefined' ? window : globalThis);
