'use strict';
/* trends.js - Load history snapshots and render SVG sparklines for top models.
   Progressive enhancement: page works without JS via noscript static table. */

(function () {
  var HISTORY_DIR = 'data/history/';
  var MODELS_URL = 'data/models.json';

  // Compute composite score: average of available 0-100 scale scores.
  // For lmarena_elo (Elo scale ~1300-1510), normalize: (elo - 800) / 8.
  function compositeScore(model) {
    var vals = [];
    var s = model.scores;
    if (s.aa_intelligence != null && !isNaN(s.aa_intelligence)) vals.push(s.aa_intelligence);
    if (s.ollm_avg != null && !isNaN(s.ollm_avg)) vals.push(s.ollm_avg);
    if (s.llmstats_composite != null && !isNaN(s.llmstats_composite)) vals.push(s.llmstats_composite);
    if (s.benchlm_overall != null && !isNaN(s.benchlm_overall)) vals.push(s.benchlm_overall);
    if (s.lmarena_elo != null && !isNaN(s.lmarena_elo)) vals.push((s.lmarena_elo - 800) / 8);
    if (vals.length === 0) return null;
    var sum = 0;
    for (var i = 0; i < vals.length; i++) sum += vals[i];
    return sum / vals.length;
  }

  // Generate SVG polyline points from data, scaled to viewBox 0 0 100 24
  function sparklinePoints(values, width, height) {
    if (!values || values.length === 0) return '';
    var min = values[0], max = values[0];
    for (var i = 1; i < values.length; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
    var pad = (max - min) * 0.1 || 1;
    var range = (max - min) + pad * 2;
    if (range === 0) range = 1;
    var stepX = width / (values.length - 1 || 1);
    var pts = [];
    for (var j = 0; j < values.length; j++) {
      var x = j * stepX;
      var y = height - ((values[j] - min + pad) / range) * height;
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    return pts.join(' ');
  }

  // Build inline SVG sparkline element
  function buildSparkline(values, trendUp) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 24');
    svg.setAttribute('class', 'sparkline');
    svg.setAttribute('aria-hidden', 'true');
    var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', sparklinePoints(values, 100, 24));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke-width', '1.25');
    polyline.setAttribute('stroke', trendUp ? 'var(--accent, #4f9cff)' : 'var(--danger, #e5484d)');
    svg.appendChild(polyline);
    return svg;
  }

  // Format a number for display
  function fmt(val) {
    return (val == null || isNaN(val)) ? '\u2014' : val.toFixed(1);
  }

  // Format date label (MM/DD)
  function fmtDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00Z');
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function setStatus(msg, isError) {
    var el = document.getElementById('trends-status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? 'var(--danger, #e5484d)' : '';
  }

  // Render trend cards
  function renderTrends(currentModels, snapshots) {
    var container = document.getElementById('trends-container');
    if (!container) return;

    var dates = snapshots.map(function(s) { return s.snapshot_date; });
    var topModels = currentModels.slice(0, 10);

    // Build header row with dates
    var headerHtml = '<thead><tr><th>Model</th><th>Provider</th><th>Rank</th>';
    for (var d = 0; d < dates.length; d++) {
      headerHtml += '<th class="trend-date">' + fmtDate(dates[d]) + '</th>';
    }
    headerHtml += '<th>Trend</th><th>Score</th></tr></thead>';

    var bodyHtml = '<tbody>';
    for (var m = 0; m < topModels.length; m++) {
      var model = topModels[m];
      var vals = [];
      var lastVal = null;
      for (var s = 0; s < snapshots.length; s++) {
        var snapModels = snapshots[s].models || [];
        var match = null;
        for (var sm = 0; sm < snapModels.length; sm++) {
          if (snapModels[sm].id === model.id) {
            match = snapModels[sm];
            break;
          }
        }
        var c = match ? compositeScore(match) : null;
        vals.push(c);
        if (c != null) lastVal = c;
      }
      var displayVals = [];
      for (var v = 0; v < vals.length; v++) {
        if (vals[v] != null) displayVals.push(vals[v]);
      }
      var trendUp = displayVals.length >= 2 ? displayVals[displayVals.length - 1] >= displayVals[0] : true;

      bodyHtml += '<tr>';
      bodyHtml += '<td class="trend-model-name">' + model.name + '</td>';
      bodyHtml += '<td>' + model.provider + '</td>';
      bodyHtml += '<td class="numeric">#' + model.rank + '</td>';
      for (var sv = 0; sv < vals.length; sv++) {
        bodyHtml += '<td class="numeric trend-score">' + fmt(vals[sv]) + '</td>';
      }
      // If we have fewer snapshots with data for this model than total snapshots,
      // fill remaining cells
      for (var fill = vals.length; fill < dates.length; fill++) {
        bodyHtml += '<td class="numeric trend-score">\u2014</td>';
      }
      // Sparkline placeholder - filled by JS after render
      bodyHtml += '<td class="trend-sparkline-cell"><span class="trend-sparkline-placeholder" data-model-id="' + model.id + '"></span></td>';
      bodyHtml += '<td class="numeric trend-score">' + fmt(lastVal != null ? lastVal : model.scores.llmstats_composite) + '</td>';
      bodyHtml += '</tr>';
    }
    bodyHtml += '</tbody>';

    container.innerHTML = '<table class="trend-table">' + headerHtml + bodyHtml + '</table>';

    // Now inject SVG sparklines into placeholders
    var placeholders = container.querySelectorAll('.trend-sparkline-placeholder');
    for (var ph = 0; ph < placeholders.length; ph++) {
      var placeholder = placeholders[ph];
      var modelId = placeholder.getAttribute('data-model-id');
      // Find model index
      for (var mi = 0; mi < topModels.length; mi++) {
        if (topModels[mi].id === modelId) {
          var modelVals = [];
          for (var si = 0; si < snapshots.length; si++) {
            var snapModels2 = snapshots[si].models || [];
            var match2 = null;
            for (var sm2 = 0; sm2 < snapModels2.length; sm2++) {
              if (snapModels2[sm2].id === modelId) {
                match2 = snapModels2[sm2];
                break;
              }
            }
            var cv = match2 ? compositeScore(match2) : null;
            if (cv != null) modelVals.push(cv);
          }
          if (modelVals.length >= 2) {
            var up = modelVals[modelVals.length - 1] >= modelVals[0];
            var svg = buildSparkline(modelVals, up);
            placeholder.parentNode.replaceChild(svg, placeholder);
          } else {
            placeholder.textContent = '\u2014';
          }
          break;
        }
      }
    }
  }

  // Load all history snapshots
  function loadSnapshots(snapshotFiles, callback) {
    if (!snapshotFiles || snapshotFiles.length === 0) {
      callback([]);
      return;
    }
    var loaded = [];
    var remaining = snapshotFiles.length;
    function loadNext(idx) {
      if (idx >= snapshotFiles.length) {
        callback(loaded.sort(function(a, b) { return a.snapshot_date.localeCompare(b.snapshot_date); }));
        return;
      }
      var url = HISTORY_DIR + snapshotFiles[idx];
      fetch(url, { cache: 'no-store' })
        .then(function(r) {
          if (!r.ok) throw new Error('Failed to load ' + url);
          return r.json();
        })
        .then(function(data) {
          loaded.push(data);
          loadNext(idx + 1);
        })
        .catch(function() {
          // Skip failed snapshots
          loadNext(idx + 1);
        });
    }
    loadNext(0);
  }

  // List history files via models.json sources array or by fetching directory listing
  function getHistoryFiles() {
    // We use a simple naming convention: YYYY-MM-DD.json
    // Fetch models.json to get the latest info, then try loading known filenames
    // Since we can't list a directory via fetch, we'll use a known list approach.
    // We fetch the current snapshot to get the list, then derive filenames from
    // a hardcoded convention or we dynamically try fetching dates.
    // Best approach: load models.json first, then try common dates.
    // Instead, we'll try fetching a manifest or just attempt well-known filenames.
    // For simplicity, we try a fixed set of recent dates going back 6 weeks.
    return null; // Signal to use the fallback approach
  }

  function init() {
    // Load current models first
    fetch(MODELS_URL, { cache: 'no-store' })
      .then(function(r) {
        if (!r.ok) throw new Error('Unable to load current model data.');
        return r.json();
      })
      .then(function(currentData) {
        var currentModels = (currentData.models || []).slice().sort(function(a, b) { return a.rank - b.rank; });
        if (currentModels.length === 0) {
          setStatus('No model data available.', true);
          return;
        }

        // Try to load history snapshots for last 6 weeks
        // We generate dates going back from snapshot_date
        var baseDate = new Date(currentData.snapshot_date + 'T00:00:00Z');
        var snapFiles = [];
        // Generate 6 weekly dates: current week + 5 prior weeks
        // The snapshot_date itself is the latest, then go back 5 more weeks
        for (var w = 0; w < 6; w++) {
          var d = new Date(baseDate);
          d.setDate(d.getDate() - w * 7);
          var y = d.getUTCFullYear();
          var mo = String(d.getUTCMonth() + 1).padStart(2, '0');
          var day = String(d.getUTCDate()).padStart(2, '0');
          snapFiles.push(y + '-' + mo + '-' + day + '.json');
        }

        setStatus('Loading history snapshots\u2026');

        loadSnapshots(snapFiles, function(snapshots) {
          if (snapshots.length === 0) {
            setStatus('Unable to load historical snapshots. Only the current snapshot is available.', true);
            // Still render with just current data
            var container = document.getElementById('trends-container');
            if (container) {
              container.innerHTML = '<p class="trends-empty">Not enough history data to generate trend lines. Check back after weekly data refreshes.</p>';
            }
            return;
          }

          if (snapshots.length < 2) {
            setStatus('Only one snapshot available. Trend lines require at least two data points.');
          } else {
            setStatus('Showing trends across ' + snapshots.length + ' weekly snapshots.');
          }

          var container = document.getElementById('trends-container');
          if (container) container.hidden = false;

          renderTrends(currentModels, snapshots);
        });
      })
      .catch(function(err) {
        console.error('trends.js error:', err);
        setStatus('Something went wrong while loading trend data.', true);
        var container = document.getElementById('trends-container');
        if (container) {
          container.innerHTML = '<p class="trends-empty">Unable to load model data. Please try again later.</p>';
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
