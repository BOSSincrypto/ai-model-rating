'use strict';
/* main.js - Sort helper + bootstrap for ai-model-rating.
   Progressive enhancement: table sorting and keyboard activation. */

const SORT_STATE_KEY = 'ai-model-rating-sort';

function sortByText(tds, compareFn) {
  const rows = Array.from(tds.parentElement.parentElement.rows);
  const sorted = rows.slice(1).sort((a, b) => {
    const aText = (a.cells[tds.cellIndex] ? a.cells[tds.cellIndex].textContent.trim() : '').toLowerCase();
    const bText = (b.cells[tds.cellIndex] ? b.cells[tds.cellIndex].textContent.trim() : '').toLowerCase();
    return compareFn(aText, bText);
  });

  const fragment = document.createDocumentFragment();
  sorted.forEach(row => fragment.appendChild(row));
  tds.parentElement.parentElement.tbody.appendChild(fragment);
}

function updateSortState(key, direction) {
  localStorage.setItem(`${SORT_STATE_KEY}-${key}`, direction);
}

function getSortState(key) {
  return localStorage.getItem(`${SORT_STATE_KEY}-${key}`);
}

function clearSortState() {
  Object.keys(localStorage)
    .filter(key => key.startsWith(SORT_STATE_KEY))
    .forEach(key => localStorage.removeItem(key));
}

function applySort(cell) {
  const table = cell.closest('table');
  if (!cell.classList.contains('sortable')) {
    return;
  }

  const currentSort = cell.getAttribute('aria-sort');
  const newDirection = currentSort === 'ascending' ? 'descending' : 'ascending';
  const compareFn = newDirection === 'ascending' ? (a, b) => (a < b ? -1 : a > b ? 1 : 0) : (a, b) => (a > b ? -1 : a < b ? 1 : 0);

  table.querySelectorAll('th.sortable').forEach(header => {
    const key = header.textContent.trim().toLowerCase();
    if (header === cell) {
      header.setAttribute('aria-sort', newDirection);
    } else {
      header.setAttribute('aria-sort', getSortState(key) === 'ascending' ? 'ascending' : 'none');
    }
  });

  const tds = table.querySelector(`thead th:nth-child(${cell.cellIndex + 1})`);
  if (tds) {
    sortByText(tds, compareFn);
  }

  updateSortState(cell.textContent.trim().toLowerCase(), newDirection);
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
  Object.keys(localStorage)
    .filter(key => key.startsWith(SORT_STATE_KEY))
    .forEach(key => {
      const headerText = key.replace(SORT_STATE_KEY + '-', '');
      const header = Array.from(document.querySelectorAll('th.sortable')).find(
        header => header.textContent.trim().toLowerCase() === headerText
      );
      if (header && getSortState(headerText) === 'ascending') {
        applySort(header);
      }
    });
}

document.addEventListener('DOMContentLoaded', function() {
  initSortableHeaders();
  restoreSortState();
});
