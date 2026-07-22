'use strict';
/* filters.js - Filter sidebar for ai-model-rating index page.
   Search, provider, type, license, range filters with hash-based
   state persistence and aria-live result count. */

(function () {
  var $ = function (s, p) { return (p || document).querySelector(s); };
  var $$ = function (s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); };
  function lc(s) { return (s || '').toLowerCase().trim(); }
  function num(s) { return parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0; }

  function readHash() {
    var h = location.hash.replace(/^#\/?/, '');
    if (!h) return {};
    try { var p = new URLSearchParams(h), o = {}; p.forEach(function (v, k) { o[k] = v; }); return o; } catch (_) { return {}; }
  }

  function writeHash(s) {
    var p = new URLSearchParams();
    if (s.search) p.set('search', s.search);
    if (s.provider) p.set('provider', s.provider);
    if (s.type) p.set('type', s.type);
    if (s.license) p.set('license', s.license);
    if (s.maxContext) p.set('maxContext', s.maxContext);
    if (s.maxPrice) p.set('maxPrice', s.maxPrice);
    var q = p.toString(), d = q ? '#' + q : '';
    if (location.hash !== d) history.replaceState(null, '', d);
  }

  function applyFilters() {
    var s = readHash(), table = $('#results-table');
    if (!table) return;
    var rows = $$('tbody tr', table), n = 0;
    rows.forEach(function (r) {
      var ok = true;
      if (s.search && ok) { ok = lc(r.cells[1]).indexOf(lc(s.search)) > -1; }
      if (s.provider && ok) { ok = lc(r.cells[2]) === lc(s.provider); }
      if (s.type && ok) { ok = lc(r.cells[7]).indexOf(lc(s.type)) > -1; }
      if (s.license && ok) { ok = lc(r.cells[8]).indexOf(lc(s.license)) > -1; }
      if (s.maxContext && ok) { ok = num(r.cells[5]) <= parseFloat(s.maxContext); }
      if (s.maxPrice && ok) { ok = num(r.cells[6]) <= parseFloat(s.maxPrice); }
      r.hidden = !ok;
      if (ok) n++;
    });

    var el = $('#results-count');
    if (el) {
      var f = [];
      if (s.search) f.push('name "' + s.search + '"');
      if (s.provider) f.push('provider ' + s.provider);
      if (s.type) f.push('type ' + s.type);
      if (s.license) f.push('license ' + s.license);
      if (s.maxPrice) f.push('price <= $' + s.maxPrice);
      if (s.maxContext) f.push('context <= ' + Number(s.maxContext).toLocaleString());
      var t = f.length ? ' matching ' + f.join(', ') : '';
      el.textContent = n + ' model' + (n !== 1 ? 's' : '') + t + ' from public sources.';
    }
    sync(s);
  }

  function sync(s) {
    var ids = ['filter-search','filter-provider','filter-type','filter-license','filter-max-context','filter-max-price'];
    var keys = ['search','provider','type','license','maxContext','maxPrice'];
    for (var i = 0; i < ids.length; i++) {
      var el = $('#' + ids[i]);
      if (el && document.activeElement !== el) el.value = s[keys[i]] || '';
    }
  }

  function onChange() {
    var s = {};
    var v = $('#filter-search').value.trim(); if (v) s.search = v;
    v = $('#filter-provider').value; if (v) s.provider = v;
    v = $('#filter-type').value; if (v) s.type = v;
    v = $('#filter-license').value; if (v) s.license = v;
    v = $('#filter-max-context').value; if (v) s.maxContext = v;
    v = $('#filter-max-price').value; if (v) s.maxPrice = v;
    writeHash(s);
    applyFilters();
  }

  function clearAll() {
    ['filter-search','filter-provider','filter-type','filter-license','filter-max-context','filter-max-price'].forEach(function (id) {
      var el = $('#' + id); if (el) el.value = '';
    });
    history.replaceState(null, '', location.pathname + location.search);
    applyFilters();
  }

  function populateOptions() {
    var table = $('#results-table');
    var ps = $('#filter-provider'), ls = $('#filter-license');
    if (!table || !ps || !ls) return;
    var provs = {}, lics = {};
    $$('tbody tr', table).forEach(function (r) {
      var p = lc(r.cells[2]), l = lc(r.cells[8]);
      if (p) provs[p] = 1;
      if (l) lics[l] = 1;
    });
    Object.keys(provs).sort().forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = k; ps.appendChild(o);
    });
    Object.keys(lics).sort().forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = k; ls.appendChild(o);
    });
  }

  function init() {
    populateOptions();
    var bind = function (id, evt) { var el = $(id); if (el) el.addEventListener(evt, onChange); };
    bind('#filter-search', 'input');
    bind('#filter-provider', 'change');
    bind('#filter-type', 'change');
    bind('#filter-license', 'change');
    bind('#filter-max-context', 'input');
    bind('#filter-max-price', 'input');
    var clear = $('#filter-clear'); if (clear) clear.addEventListener('click', clearAll);
    applyFilters();
    window.addEventListener('hashchange', applyFilters);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
