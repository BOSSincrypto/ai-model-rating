'use strict';
/* compare.js - Query-string hydration and diff view for ai-model-rating.
   Progressive enhancement: loads model data, renders side-by-side comparison,
   and shows readable win/loss/tie diffs. Without JS the noscript block
   provides static recent-model deep links. */

const QUERY_PARAMS = ['a', 'b'];
const EMPTY_MODEL = { id: '', name: '', provider: '', type: '', license: '', context_window: null, pricing: { input_per_1m: null, output_per_1m: null }, scores: { lmarena_elo: null, aa_intelligence: null, ollm_avg: null, llmstats_composite: null, benchlm_overall: null }, rank: null };
const FALLBACK_MSG = 'Use the recent-model links below to compare models while you verify the IDs.';

function readQueryModelIds() {
  var params = new URLSearchParams(window.location.search);
  var ids = [];
  QUERY_PARAMS.forEach(function(k) {
    var v = params.get(k);
    if (v && ids.indexOf(v) === -1) ids.push(v);
  });
  return ids.slice(0, 2);
}

function fmtNum(v) { return (v === null || v === undefined || Number.isNaN(v)) ? '\u2014' : String(v); }
function fmtCur(v) { return (typeof v === 'number' && !Number.isNaN(v)) ? '$' + v.toFixed(2) : '\u2014'; }
function fmtCtx(v) { return (typeof v === 'number' && !Number.isNaN(v)) ? new Intl.NumberFormat('en-US').format(v) : '\u2014'; }

function labelFor(key) {
  var m = { lmarena_elo: 'LMArena Elo', aa_intelligence: 'AA Intelligence', ollm_avg: 'Open LLM avg', llmstats_composite: 'LLM Stats', benchlm_overall: 'BenchLM' };
  return m[key] || key.replace(/_/g, ' ');
}

function diffIndicator(a, b) {
  var na = (a === null || a === undefined || Number.isNaN(a));
  var nb = (b === null || b === undefined || Number.isNaN(b));
  if (na && nb) return 'tie';
  if (na) return 'B wins';
  if (nb) return 'A wins';
  if (a > b) return 'A wins';
  if (a < b) return 'B wins';
  return 'tie';
}

function diffClass(text) {
  if (text === 'A wins') return 'diff-win';
  if (text === 'B wins') return 'diff-loss';
  return 'diff-tie';
}

function setStatus(msg, isError) {
  var el = document.getElementById('compare-status');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('compare-status--error', Boolean(isError));
}

function showFallback(msg) {
  var fb = document.getElementById('compare-fallback');
  var fbTxt = document.getElementById('compare-fallback-text');
  if (fbTxt && msg) fbTxt.textContent = msg;
  if (fb) fb.hidden = false;
  var res = document.getElementById('compare-results');
  if (res) res.hidden = true;
}

function showResults() {
  var res = document.getElementById('compare-results');
  if (res) res.hidden = false;
  var fb = document.getElementById('compare-fallback');
  if (fb) fb.hidden = true;
}

function buildCrossTable(a, b) {
  var tbody = document.getElementById('compare-cross-body');
  var lblA = document.querySelector('.compare-label-a');
  var lblB = document.querySelector('.compare-label-b');
  if (lblA) lblA.textContent = a.name || a.id || 'A';
  if (lblB) lblB.textContent = b.name || b.id || 'B';
  if (!tbody) return;
  tbody.innerHTML = '';

  var rows = [
    ['LMArena Elo', a.scores.lmarena_elo, b.scores.lmarena_elo, fmtNum],
    ['AA Intelligence', a.scores.aa_intelligence, b.scores.aa_intelligence, fmtNum],
    ['Open LLM avg', a.scores.ollm_avg, b.scores.ollm_avg, fmtNum],
    ['LLM Stats', a.scores.llmstats_composite, b.scores.llmstats_composite, fmtNum],
    ['BenchLM', a.scores.benchlm_overall, b.scores.benchlm_overall, fmtNum],
    ['Context window', a.context_window, b.context_window, fmtCtx],
    ['Output price ($/1M)', a.pricing.output_per_1m, b.pricing.output_per_1m, fmtCur],
  ];

  rows.forEach(function(r) {
    var tr = document.createElement('tr');
    var tdN = document.createElement('td');
    tdN.textContent = r[0];
    var tdA = document.createElement('td');
    tdA.textContent = r[3](r[1]);
    tdA.classList.add('numeric');
    var tdB = document.createElement('td');
    tdB.textContent = r[3](r[2]);
    tdB.classList.add('numeric');
    var tdD = document.createElement('td');
    var d = diffIndicator(r[1], r[2]);
    tdD.textContent = d;
    tdD.classList.add('numeric', diffClass(d));
    tr.appendChild(tdN);
    tr.appendChild(tdA);
    tr.appendChild(tdB);
    tr.appendChild(tdD);
    tbody.appendChild(tr);
  });
}

function loadModels() {
  var queryIds = readQueryModelIds();
  var resultsEl = document.getElementById('compare-results');

  if (queryIds.length === 0) {
    setStatus('Pick two models from the ratings table, then open their compare links.');
    showFallback('Pick two models from the ratings table and open their compare links directly.');
    return;
  }

  if (queryIds.length === 1) {
    setStatus('Add a second model ID with ?b= to enable the diff view.');
    showResults();
    buildCrossTable(EMPTY_MODEL, EMPTY_MODEL);
    showFallback('Add the second model ID to the URL and reload to generate the full comparison.');
    return;
  }

  setStatus('Loading model data\u2026');

  fetch('data/models.json', { cache: 'no-store' })
    .then(function(response) {
      if (!response.ok) throw new Error('Unable to load model data.');
      return response.json();
    })
    .then(function(data) {
      var models = new Map((data.models || []).map(function(m) { return [m.id, m]; }));
      var mA = models.get(queryIds[0]) || null;
      var mB = models.get(queryIds[1]) || null;

      if (!mA && !mB) {
        throw new Error('Neither model could be found. Check the IDs and try again.');
      }

      if (!mA || !mB) {
        setStatus('One model is missing from the current snapshot. Showing the known model with a placeholder for the unknown model.');
      } else {
        setStatus('Comparing ' + (mA.name || queryIds[0]) + ' and ' + (mB.name || queryIds[1]) + '.');
      }

      showResults();
      buildCrossTable(mA || EMPTY_MODEL, mB || EMPTY_MODEL);

      var unknownIds = queryIds.filter(function(id) { return !models.has(id); });
      if (unknownIds.length) {
        showFallback('One or more model IDs are not in the latest snapshot. ' + FALLBACK_MSG);
      }
    })
    .catch(function(error) {
      console.error('compare.js hydration failed:', error);
      setStatus(error.message || 'Something went wrong while loading the comparison.', true);
      showResults();
      buildCrossTable(EMPTY_MODEL, EMPTY_MODEL);
      showFallback('Model data could not be loaded. ' + FALLBACK_MSG);
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadModels);
} else {
  loadModels();
}
