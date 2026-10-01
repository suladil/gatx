/*
 * Table Totals Block
 * Metrics table (2-4 columns): header row, data rows, and a final Totals row.
 * Each row always has 4 cells; columns that are empty in every row are dropped.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const rows = [...block.children];
  const maxCols = rows.reduce((max, row) => Math.max(max, row.children.length), 0);

  // keep only columns that have content in at least one row
  const isFilled = (cell) => cell && (cell.textContent.trim() || cell.querySelector('img, picture'));
  const usedCols = [...Array(maxCols).keys()]
    .filter((col) => rows.some((row) => isFilled(row.children[col])));
  const colCount = usedCols.length;

  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);
    const cells = usedCols.map((col) => row.children[col] || document.createElement('div'));

    cells.forEach((cell, col) => {
      const isHeader = i === 0;
      const isLabel = !isHeader && col === 0;
      const el = document.createElement(isHeader || isLabel ? 'th' : 'td');
      el.innerHTML = cell.innerHTML;
      el.dataset.col = col + 1;

      if (isHeader) {
        el.setAttribute('scope', 'col');
        el.classList.add('table-totals-heading');
      } else if (isLabel) {
        el.setAttribute('scope', 'row');
        el.classList.add('table-totals-label');
      } else {
        el.classList.add('table-totals-value');
      }
      tr.append(el);
    });

    if (i === 0) thead.append(tr);
    else tbody.append(tr);
  });

  // the last body row is always the Totals row
  const totalsRow = tbody.lastElementChild;
  if (totalsRow) totalsRow.classList.add('table-totals-total');

  table.append(thead, tbody);
  block.dataset.columns = colCount;
  block.classList.add(`table-totals-cols-${colCount}`);
  block.replaceChildren(table);
}
