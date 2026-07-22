'use strict';
/* sources.js - Load source metadata and render cards with freshness dates.
   Progressive enhancement: page works without JS via static HTML cards. */

(function () {
  var SOURCES_URL = 'data/sources.json';
  var MODELS_URL = 'data/models.json';

  // Source ID to score field mapping
  var SOURCE_SCORE_FIELDS = {
    lmarena: 'lmarena_elo',
    aa: 'aa_intelligence',
    ollm: 'ollm_avg',
    llmstats: 'llmstats_composite',
    benchlm: 'benchlm_overall'
  };

  // Map source kind to CSS badge class
  function kindBadge(kind) {
    switch (kind) {
      case 'human-eval': return 'badge badge--open';
      case 'open-source': return 'badge badge--open';
      case 'composite': return 'badge badge--apache';
      default: return 'badge';
    }
  }

  // Format kind for display
  function kindDisplay(kind) {
    switch (kind) {
      case 'human-eval': return 'Human eval';
      case 'open-source': return 'Open-source';
      case 'composite': return 'Composite';
      default: return kind;
    }
  }

  // Extract domain from URL
  function domainFromUrl(url) {
    try {
      var u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch (_) {
      return url;
    }
  }

  // Format a date string to YYYY-MM-DD
  function fmtDate(dt) {
    if (!dt) return '\u2014';
    var d = new Date(dt);
    if (isNaN(d.getTime())) return dt.substring(0, 10);
    return d.toISOString().substring(0, 10);
  }

  // Compute the latest updated_at date for a source across all models
  function computeLatestUpdate(sourceId, models) {
    var scoreField = SOURCE_SCORE_FIELDS[sourceId];
    if (!scoreField) return null;

    var latest = null;
    for (var i = 0; i < models.length; i++) {
      var m = models[i];
      if (m.scores && m.scores[scoreField] != null) {
        if (m.updated_at && (!latest || m.updated_at > latest)) {
          latest = m.updated_at;
        }
      }
    }
    return latest;
  }

  // Build a source card element
  function buildCard(source, lastUpdated, snapshotDate) {
    var card = document.createElement('div');
    card.className = 'card source-card';
    card.setAttribute('data-source-id', source.id);

    var heading = document.createElement('h3');
    heading.className = 'source-card__title';
    heading.textContent = source.name;

    var urlPara = document.createElement('p');
    urlPara.className = 'source-card__url';
    var link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'source-link';
    link.textContent = domainFromUrl(source.url);

    // External icon SVG
    var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('width', '12');
    icon.setAttribute('height', '12');
    icon.setAttribute('viewBox', '0 0 12 12');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('aria-hidden', 'true');
    var iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    iconPath.setAttribute('d', 'M1 11L11 1M11 1H4.5M11 1V7.5');
    iconPath.setAttribute('stroke', 'currentColor');
    iconPath.setAttribute('stroke-width', '1.25');
    iconPath.setAttribute('stroke-linecap', 'round');
    iconPath.setAttribute('stroke-linejoin', 'round');
    icon.appendChild(iconPath);
    link.appendChild(icon);

    urlPara.appendChild(link);

    var dl = document.createElement('dl');
    dl.className = 'source-card__details';

    // Metric row
    var metricRow = document.createElement('div');
    metricRow.className = 'source-card__row';
    var metricDt = document.createElement('dt');
    metricDt.textContent = 'Metric';
    var metricDd = document.createElement('dd');
    metricDd.textContent = source.metric;
    metricRow.appendChild(metricDt);
    metricRow.appendChild(metricDd);

    // Kind row
    var kindRow = document.createElement('div');
    kindRow.className = 'source-card__row';
    var kindDt = document.createElement('dt');
    kindDt.textContent = 'Kind';
    var kindDd = document.createElement('dd');
    var kindBadgeEl = document.createElement('span');
    kindBadgeEl.className = kindBadge(source.kind);
    kindBadgeEl.textContent = kindDisplay(source.kind);
    kindDd.appendChild(kindBadgeEl);
    kindRow.appendChild(kindDt);
    kindRow.appendChild(kindDd);

    // Last updated row
    var dateRow = document.createElement('div');
    dateRow.className = 'source-card__row';
    var dateDt = document.createElement('dt');
    dateDt.textContent = 'Last updated';
    var dateDd = document.createElement('dd');
    dateDd.className = 'source-card__date';
    var displayDate = lastUpdated ? fmtDate(lastUpdated) : (snapshotDate ? fmtDate(snapshotDate) : '\u2014');
    dateDd.textContent = displayDate;
    dateRow.appendChild(dateDt);
    dateRow.appendChild(dateDd);

    dl.appendChild(metricRow);
    dl.appendChild(kindRow);
    dl.appendChild(dateRow);

    card.appendChild(heading);
    card.appendChild(urlPara);
    card.appendChild(dl);

    return card;
  }

  function setStatus(msg, isError) {
    var el = document.getElementById('sources-status');
    if (!el) return;
    el.textContent = msg;
    if (isError) {
      el.style.color = 'var(--danger, #e5484d)';
    } else {
      el.style.color = '';
    }
  }

  function init() {
    var grid = document.getElementById('sources-grid');
    if (!grid) return;

    setStatus('Loading source metadata\u2026');

    // Fetch both sources.json and models.json in parallel
    var sourcesPromise = fetch(SOURCES_URL, { cache: 'no-store' }).then(function(r) {
      if (!r.ok) throw new Error('Failed to load sources metadata.');
      return r.json();
    }).then(function(data) {
      return data.sources || [];
    });

    var modelsPromise = fetch(MODELS_URL, { cache: 'no-store' }).then(function(r) {
      if (!r.ok) throw new Error('Failed to load model data.');
      return r.json();
    });

    Promise.all([sourcesPromise, modelsPromise])
      .then(function(results) {
        var sources = results[0];
        var modelsData = results[1];
        var models = modelsData.models || [];
        var snapshotDate = modelsData.snapshot_date || null;

        if (sources.length === 0) {
          setStatus('No sources found.', true);
          return;
        }

        // Clear static cards
        grid.innerHTML = '';

        // Build and append cards
        for (var i = 0; i < sources.length; i++) {
          var src = sources[i];
          var lastUpdated = computeLatestUpdate(src.id, models);
          var card = buildCard(src, lastUpdated, snapshotDate);
          grid.appendChild(card);
        }

        setStatus(sources.length + ' public sources loaded. Last snapshot: ' + (snapshotDate || 'unknown') + '.');
      })
      .catch(function(err) {
        console.error('sources.js error:', err);
        setStatus('Unable to load source data. The static cards below are still available.', true);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
