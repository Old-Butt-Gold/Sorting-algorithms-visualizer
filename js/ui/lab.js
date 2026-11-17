/* Sortlab — race picker, podium and the background comparison table. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;
  const ui = SAV.ui = SAV.ui || {};

  const PLACE_LABELS = ['1st place', '2nd place', '3rd place', '4th place'];

  const DIST_NOTES = {
    random: 'Random input gives every algorithm the same statistical starting point, so the Θ(n log n) group separates cleanly from the quadratic group.',
    nearly: 'Nearly sorted input rewards algorithms with a linear best case: insertion, gnome and the insertion runs inside Timsort barely move anything.',
    reversed: 'Reversed input is the worst shape for exchange sorts: every value is on the wrong side, so bubble and cocktail pay the full quadratic price.',
    few: 'Few unique values expose partition behaviour. Lomuto can degrade when many keys are equal, while counting and radix turn repetition into a small key space.',
    sawtooth: 'Sawtooth input mixes short ascending ramps with hard resets, which helps run-aware sorts and still punishes naive neighbour exchange.',
    gaussian: 'Gaussian input clusters values near the middle, giving distribution sorts a narrow effective range and leaving comparison sorts with a typical workload.',
    sorted: 'Already sorted input is the best-case probe: early-exit bubble, insertion and Timsort finish in a single linear pass, while selection still scans everything.'
  };

  function $(id) {
    return document.getElementById(id);
  }

  function initLab(app) {
    const picker = $('racePicker');
    const startBtn = $('raceStart');
    const stopBtn = $('raceStop');
    const summary = $('raceSummary');
    const podium = $('podium');
    const compareRun = $('compareRun');
    const compareStatus = $('compareStatus');
    const compareTable = $('compareTableWrap');
    const compareNote = $('compareNote');
    const tabRace = $('tabRace');
    const tabCompare = $('tabCompare');
    const racePanel = $('racePanel');
    const comparePanel = $('comparePanel');

    const selected = new Set(['bubble', 'insertion', 'quick']);
    const buttons = new Map();
    let running = false;
    let compareBusy = false;

    if (picker) {
      SAV.algorithms.forEach(function (def) {
        if (def.id === 'bogo') return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'race-pick';
        button.dataset.alg = def.id;
        button.setAttribute('aria-pressed', 'false');
        const tick = document.createElement('span');
        tick.className = 'tick';
        tick.textContent = '✓';
        tick.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.textContent = def.name;
        button.appendChild(tick);
        button.appendChild(label);
        button.addEventListener('click', function () {
          if (running) {
            ui.toast('Finish or stop the current race before changing the line-up.', 'info');
            return;
          }
          if (selected.has(def.id)) {
            if (selected.size <= 2) {
              ui.toast('A race needs at least two algorithms.', 'warn');
              return;
            }
            selected.delete(def.id);
          } else {
            if (selected.size >= 4) {
              ui.toast('Four lanes is the limit — the canvas stays readable that way.', 'warn');
              return;
            }
            selected.add(def.id);
          }
          syncPicks();
        });
        buttons.set(def.id, button);
        picker.appendChild(button);
      });
    }

    function syncPicks() {
      buttons.forEach(function (button, id) {
        const on = selected.has(id);
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (startBtn) startBtn.disabled = running || selected.size < 2;
      if (summary && !running) {
        summary.textContent = selected.size + ' lanes selected · same array, same operation speed';
      }
    }

    function setTab(which) {
      const race = which === 'race';
      if (tabRace) {
        tabRace.classList.toggle('is-active', race);
        tabRace.setAttribute('aria-selected', race ? 'true' : 'false');
      }
      if (tabCompare) {
        tabCompare.classList.toggle('is-active', !race);
        tabCompare.setAttribute('aria-selected', race ? 'false' : 'true');
      }
      if (racePanel) racePanel.hidden = !race;
      if (comparePanel) comparePanel.hidden = race;
    }

    if (tabRace) tabRace.addEventListener('click', function () { setTab('race'); });
    if (tabCompare) tabCompare.addEventListener('click', function () { setTab('compare'); });

    if (startBtn) {
      startBtn.addEventListener('click', function () {
        if (selected.size < 2) {
          ui.toast('Pick at least two algorithms to race.', 'warn');
          return;
        }
        if (podium) {
          podium.hidden = true;
          podium.textContent = '';
        }
        const ids = Array.from(selected);
        const started = app.startRace(ids);
        if (started) {
          running = true;
          startBtn.disabled = true;
          if (stopBtn) stopBtn.disabled = false;
          if (summary) summary.textContent = 'Race running · pause, step and scrub apply to every lane';
          setTab('race');
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', function () {
        app.stopRace();
        running = false;
        if (startBtn) startBtn.disabled = selected.size < 2;
        if (stopBtn) stopBtn.disabled = true;
        if (summary) summary.textContent = selected.size + ' lanes selected · same array, same operation speed';
        if (podium) podium.hidden = true;
      });
    }

    if (compareRun) {
      compareRun.addEventListener('click', async function () {
        if (compareBusy) return;
        compareBusy = true;
        compareRun.disabled = true;
        if (compareStatus) compareStatus.textContent = 'Running every algorithm on the current array…';
        if (compareTable) compareTable.textContent = '';
        if (compareNote) compareNote.textContent = '';
        try {
          const context = app.getComparisonContext();
          const rows = await runComparison(context, function (done, total) {
            if (compareStatus) compareStatus.textContent = 'Running… ' + done + ' / ' + total;
          });
          renderComparison(rows, context);
          if (compareStatus) compareStatus.textContent = rows.length + ' algorithms completed on n=' + context.input.length;
        } catch (error) {
          if (compareStatus) compareStatus.textContent = 'Comparison failed';
          ui.toast(error && error.message ? error.message : 'Could not finish the comparison.', 'error');
        } finally {
          compareBusy = false;
          compareRun.disabled = false;
        }
      });
    }

    function renderComparison(rows, context) {
      if (!compareTable) return;
      compareTable.textContent = '';
      const table = document.createElement('table');
      table.className = 'data-table';
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      ['Algorithm', 'Comparisons', 'Swaps', 'Writes', 'Operations', 'Check'].forEach(function (title) {
        const th = document.createElement('th');
        th.textContent = title;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const best = rows.reduce(function (winner, row) {
        return !winner || row.total < winner.total ? row : winner;
      }, null);

      rows.forEach(function (row) {
        const tr = document.createElement('tr');
        if (best && row.id === best.id) tr.className = 'is-best';

        const nameCell = document.createElement('td');
        const cell = document.createElement('div');
        cell.className = 'algo-cell';
        const strong = document.createElement('strong');
        strong.textContent = row.def.name;
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = row.def.complexity.avg;
        cell.appendChild(strong);
        cell.appendChild(pill);
        nameCell.appendChild(cell);
        tr.appendChild(nameCell);

        [row.compares, row.swaps, row.writes, row.total].forEach(function (value) {
          const td = document.createElement('td');
          td.className = 'mono';
          td.textContent = U.fmtInt(value);
          tr.appendChild(td);
        });

        const check = document.createElement('td');
        check.textContent = row.verified ? 'sorted ✓' : 'not verified';
        if (!row.verified) check.style.color = 'var(--danger)';
        tr.appendChild(check);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      compareTable.appendChild(table);

      if (compareNote && best) {
        const config = context.config;
        const why = DIST_NOTES[config.dist] || '';
        const detail = rowDetail(best);
        compareNote.textContent = '';
        const lead = document.createElement('strong');
        lead.textContent = best.def.name + ' wins on this array. ';
        compareNote.appendChild(lead);
        compareNote.appendChild(document.createTextNode(
          'It finished in ' + U.fmtInt(best.total) + ' operations (' + detail + '). ' + why
        ));
      }
    }

    function rowDetail(row) {
      return U.fmtInt(row.compares) + ' comparisons, ' + U.fmtInt(row.swaps) + ' swaps, ' + U.fmtInt(row.writes) + ' writes';
    }

    async function runComparison(context, progress) {
      const defs = context.defs;
      const results = [];
      if (SAV.worker && SAV.worker.available() && context.input.length > 120) {
        try {
          const batch = await SAV.worker.batch(defs, context.input, context.options, context.seed);
          for (let i = 0; i < batch.length; i++) {
            const item = batch[i];
            const def = defs.find(function (d) { return d.id === item.id; });
            if (!def) continue;
            if (!item.ok) {
              results.push({ id: def.id, def: def, compares: 0, swaps: 0, writes: 0, total: 0, verified: false, failed: true });
              continue;
            }
            results.push({
              id: def.id,
              def: def,
              compares: item.counts.compares,
              swaps: item.counts.swaps,
              writes: item.counts.writes,
              total: item.total,
              verified: item.verified
            });
          }
        } catch (error) {
          results.length = 0;
        }
      }

      if (!results.length) {
        for (let i = 0; i < defs.length; i++) {
          await U.nextFrame();
          if (progress) progress(i, defs.length);
          const def = defs[i];
          try {
            const log = await SAV.engine.buildLogAsync(def, context.input, context.options, context.seed);
            results.push({
              id: def.id,
              def: def,
              compares: log.finalCounts.compares,
              swaps: log.finalCounts.swaps,
              writes: log.finalCounts.writes,
              total: log.total,
              verified: log.verified
            });
          } catch (error) {
            results.push({ id: def.id, def: def, compares: 0, swaps: 0, writes: 0, total: 0, verified: false, failed: true });
          }
        }
        if (progress) progress(defs.length, defs.length);
      }

      results.sort(function (a, b) {
        if (a.failed && !b.failed) return 1;
        if (!a.failed && b.failed) return -1;
        return a.total - b.total;
      });
      return results;
    }

    function showPodium(results) {
      if (!podium) return;
      podium.textContent = '';
      if (!results || !results.length) {
        podium.hidden = true;
        return;
      }
      const ordered = results.slice().sort(function (a, b) { return a.total - b.total; });
      ordered.forEach(function (row, index) {
        const card = document.createElement('div');
        card.className = 'podium-card' + (index === 0 ? ' first' : '');
        const place = document.createElement('span');
        place.className = 'podium-place';
        place.textContent = PLACE_LABELS[index] || (index + 1) + 'th place';
        const name = document.createElement('strong');
        name.className = 'podium-name';
        name.textContent = row.name || (row.def && row.def.name) || row.id;
        const stats = document.createElement('span');
        stats.className = 'podium-stats';
        stats.textContent = U.fmtInt(row.total) + ' ops · ' + U.fmtInt(row.counts ? row.counts.compares : row.compares) + ' cmp · ' +
          U.fmtInt(row.counts ? row.counts.swaps : row.swaps) + ' swaps';
        card.appendChild(place);
        card.appendChild(name);
        card.appendChild(stats);
        podium.appendChild(card);
      });
      podium.hidden = false;
      running = false;
      if (startBtn) startBtn.disabled = selected.size < 2;
      if (stopBtn) stopBtn.disabled = false;
      if (summary) summary.textContent = 'Race complete · finish order is decided by the operation count';
    }

    function setRunning(value) {
      running = value;
      if (startBtn) startBtn.disabled = value || selected.size < 2;
      if (stopBtn) stopBtn.disabled = !value;
      if (summary && value) summary.textContent = 'Race running · pause, step and scrub apply to every lane';
    }

    syncPicks();

    return {
      showPodium: showPodium,
      setRunning: setRunning,
      setTab: setTab,
      getSelection: function () { return Array.from(selected); },
      isRunning: function () { return running; }
    };
  }

  ui.initLab = initLab;
})(typeof window !== 'undefined' ? window : globalThis);
