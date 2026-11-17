/* Sortlab — optional blob worker for very large logs and background races. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;

  let worker = null;
  let sequence = 0;
  const pending = new Map();

  function available() {
    const urlApi = global.URL;
    return typeof global.Worker === 'function' &&
      typeof global.Blob === 'function' &&
      !!urlApi &&
      typeof urlApi.createObjectURL === 'function';
  }

  function workerSource() {
    const createOpsSource = SAV.ops.create.toString();
    return [
      "'use strict';",
      'var createOps = ' + createOpsSource + ';',
      'function isSorted(values) {',
      '  for (var i = 1; i < values.length; i++) { if (values[i - 1] > values[i]) return false; }',
      '  return true;',
      '}',
      'function isPermutation(a, b) {',
      '  if (a.length !== b.length) return false;',
      '  var x = a.slice().sort(function (m, n) { return m - n; });',
      '  var y = b.slice().sort(function (m, n) { return m - n; });',
      '  for (var i = 0; i < x.length; i++) { if (x[i] !== y[i]) return false; }',
      '  return true;',
      '}',
      'function runJob(job, input, keepOps) {',
      '  var a = input.slice();',
      '  var h = createOps(a, job.seed, job.options || {});',
      '  var run = (new Function("return (" + job.source + ");"))();',
      '  var counts = { compares: 0, swaps: 0, writes: 0 };',
      '  var ops = keepOps ? [] : null;',
      '  var total = 0;',
      '  var iterator = run(a, h);',
      '  var step = iterator.next();',
      '  while (!step.done) {',
      '    var op = step.value;',
      '    if (!op || typeof op.t !== "string") throw new Error("Invalid operation");',
      '    total++;',
      '    if (op.t === "compare") counts.compares++;',
      '    else if (op.t === "swap") counts.swaps++;',
      '    else if (op.t === "write") counts.writes++;',
      '    if (keepOps) ops.push(op);',
      '    if (total > 3000000) throw new Error("Operation log exceeded the 3,000,000 entry limit");',
      '    step = iterator.next();',
      '  }',
      '  return {',
      '    ops: ops,',
      '    total: total,',
      '    counts: counts,',
      '    final: a,',
      '    sorted: isSorted(a),',
      '    verified: isSorted(a) && isPermutation(input, a)',
      '  };',
      '}',
      'self.onmessage = function (event) {',
      '  var data = event.data || {};',
      '  try {',
      '    if (data.kind === "generate") {',
      '      var generated = runJob({ source: data.source, seed: data.seed, options: data.options }, data.input, true);',
      '      self.postMessage({ id: data.id, ok: true, result: generated });',
      '      return;',
      '    }',
      '    if (data.kind === "batch") {',
      '      var results = [];',
      '      for (var i = 0; i < data.jobs.length; i++) {',
      '        var job = data.jobs[i];',
      '        try {',
      '          var outcome = runJob(job, data.input, false);',
      '          results.push({ id: job.id, ok: true, total: outcome.total, counts: outcome.counts, verified: outcome.verified });',
      '        } catch (error) {',
      '          results.push({ id: job.id, ok: false, error: String(error && error.message || error) });',
      '        }',
      '      }',
      '      self.postMessage({ id: data.id, ok: true, results: results });',
      '      return;',
      '    }',
      '    throw new Error("Unknown worker request");',
      '  } catch (error) {',
      '    self.postMessage({ id: data.id, ok: false, error: String(error && error.message || error) });',
      '  }',
      '};'
    ].join('\n');
  }

  function ensureWorker() {
    if (worker) return worker;
    if (!available()) throw new Error('Web Worker is not available');
    const blob = new Blob([workerSource()], { type: 'text/javascript' });
    const url = global.URL.createObjectURL(blob);
    worker = new global.Worker(url);
    global.URL.revokeObjectURL(url);
    worker.onmessage = function (event) {
      const data = event.data || {};
      const task = pending.get(data.id);
      if (!task) return;
      pending.delete(data.id);
      clearTimeout(task.timer);
      if (data.ok) task.resolve(data.result !== undefined ? data.result : data.results);
      else task.reject(new Error(data.error || 'Worker failed'));
    };
    worker.onerror = function (event) {
      const error = new Error(event.message || 'Worker crashed');
      pending.forEach(function (task) {
        clearTimeout(task.timer);
        task.reject(error);
      });
      pending.clear();
      reset();
    };
    return worker;
  }

  function reset() {
    if (worker) {
      try { worker.terminate(); } catch (error) { /* already gone */ }
    }
    worker = null;
  }

  function request(payload, timeoutMs) {
    return new Promise(function (resolve, reject) {
      let instance;
      try {
        instance = ensureWorker();
      } catch (error) {
        reject(error);
        return;
      }
      const id = ++sequence;
      const timer = setTimeout(function () {
        pending.delete(id);
        reset();
        reject(new Error('Worker timed out'));
      }, timeoutMs || 30000);
      pending.set(id, { resolve: resolve, reject: reject, timer: timer });
      try {
        instance.postMessage(Object.assign({ id: id }, payload));
      } catch (error) {
        pending.delete(id);
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  function generate(def, input, options, runSeed) {
    return request({
      kind: 'generate',
      source: def.run.toString(),
      input: input,
      options: options || {},
      seed: runSeed >>> 0
    }, 30000).then(function (result) {
      return { ops: result.ops, final: result.final, verified: result.verified, total: result.total };
    });
  }

  function batch(defs, input, options, seed) {
    const jobs = defs.map(function (def) {
      return {
        id: def.id,
        source: def.run.toString(),
        options: options || {},
        seed: SAV.engine.seedFor(def, seed)
      };
    });
    return request({
      kind: 'batch',
      input: input,
      jobs: jobs
    }, 45000);
  }

  function terminate() {
    reset();
  }

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('pagehide', terminate);
  }

  SAV.worker = {
    available: available,
    generate: generate,
    batch: batch,
    terminate: terminate
  };
})(typeof window !== 'undefined' ? window : globalThis);
