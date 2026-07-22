'use strict';
/* main.js - Sort helper + bootstrap for ai-model-rating.
   Progressive enhancement: table sorting and keyboard activation. */

const SORT_STATE_KEY = 'ai-model-rating-sort';

function sortByColumn(table, columnIndex, compareFn) {
  const tbody = table.querySelector('tbody');
  const headerRow = table.querySelector('thead tr');
  const rows = Array.from(tbody.rows);
  const headerCells = Array.from(headerRow.cells);
  const headerText = headerCells[columnIndex].textContent.trim().toLowerCase();

  const sortedRows = rows.slice().sort((a, b) => {
    const aText = a.cells[columnIndex].textContent.trim().toLowerCase();
    const bText = b.cells[columnIndex].textContent.trim().toLowerCase();
    return compareFn(aText, bText);
  });

  const fragment = document.createDocumentFragment();
  sortedRows.forEach(row => fragment.appendChild(row));
  tbody.appendChild(fragment);
}

function updateSortState(key, direction) {
  localStorage.setItem(`${SORT_STATE_KEY}-${key}`, direction);
}

function getSortState(key) {
  return localStorage.getItem(`${SORT_STATE_KEY}-${key}`);
}

function clearSortState() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(SORT_STATE_KEY))
    .forEach(k => localStorage.removeItem(k));
}

function applySort(thElement) {
  const table = thElement.closest('table');
  if (!table) return;

  const isSortable = thElement.classList.contains('sortable');
  if (!isSortable) return;

  const columnIndex = thElement.cellIndex;
  const currentSort = thElement.getAttribute('aria-sort') || 'none';
  const newDirection = currentSort === 'ascending' ? 'descending' : 'ascending';
  const compareFn = newDirection === 'ascending'
    ? (a, b) => (a < b ? -1 : a > b ? 1 : 0)
    : (a, b) => (a > b ? -1 : a < b ? 1 : 0);

  // Update aria-sort on all headers
  const allHeaders = table.querySelectorAll('th.sortable');
  allHeaders.forEach((header, idx) => {
    if (header === thElement) {
      header.setAttribute('aria-sort', newDirection);
    } else {
      const storedDir = getSortState(header.textContent.trim().toLowerCase());
      header.setAttribute('aria-sort', storedDir === 'ascending' ? 'ascending' : 'none');
    }
  });

  sortByColumn(table, columnIndex, compareFn);
  updateSortState(thElement.textContent.trim().toLowerCase(), newDirection);
}

function handleSortKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    applySort(event.currentTarget);
  }
}

function handleSortClick(event) {
  const cell = event.target.closest('th.sortable');
  if (!cell) {
    return;
  }

  applySort(cell);
}

function initSortableHeaders() {
  const page = document.querySelector('.page-main') || document;
  const tables = page.querySelectorAll('table');
  tables.forEach(table => {
    const headers = table.querySelectorAll('th.sortable');
    headers.forEach(header => {
      header.addEventListener('keydown', handleSortKeydown);
      header.addEventListener('click', handleSortClick);
    });
  });
}

function restoreSortState() {
  const page = document.querySelector('.page-main') || document;
  const tables = page.querySelectorAll('table');
  tables.forEach(table => {
    const headers = table.querySelectorAll('th.sortable');
    headers.forEach(header => {
      const storedDir = getSortState(header.textContent.trim().toLowerCase());
      if (storedDir === 'ascending' || storedDir === 'descending') {
        header.setAttribute('aria-sort', storedDir);
        const compareFn = storedDir === 'ascending'
          ? (a, b) => (a < b ? -1 : a > b ? 1 : 0)
          : (a, b) => (a > b ? -1 : a < b ? 1 : 0);
        sortByColumn(table, header.cellIndex, compareFn);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initSortableHeaders();
  restoreSortState();
});
