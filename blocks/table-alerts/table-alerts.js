/*
 * Table Alerts Block
 * Status matrix: a header row of action-urgency columns (first header cell is an
 * empty corner cell) and body rows of label + numeric counts.
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
  const colCount = rows.reduce((max, row) => Math.max(max, row.children.length), 0);

  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);
    const cells = [...row.children];

    // pad short rows so every row has the same column count
    while (cells.length < colCount) cells.push(document.createElement('div'));

    cells.forEach((cell, col) => {
      const isHeader = i === 0;
      const isLabel = !isHeader && col === 0;
      const el = document.createElement(isHeader || isLabel ? 'th' : 'td');
      el.innerHTML = cell.innerHTML;
      el.dataset.col = col + 1;

      if (isHeader) {
        el.setAttribute('scope', 'col');
        if (col === 0 && !el.textContent.trim()) {
          el.classList.add('table-alerts-corner');
          el.setAttribute('aria-hidden', 'true');
        } else {
          el.classList.add('table-alerts-heading');
        }
      } else if (isLabel) {
        el.setAttribute('scope', 'row');
        el.classList.add('table-alerts-label');
      } else {
        el.classList.add('table-alerts-value');
      }
      tr.append(el);
    });

    if (i === 0) thead.append(tr);
    else tbody.append(tr);
  });

  table.append(thead, tbody);
  block.dataset.columns = colCount;
  block.replaceChildren(table);
}
