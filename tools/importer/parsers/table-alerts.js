/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table-alerts. Base: table. Source: http://localhost:8765/portal/
 * Selector: .widget.fleet-alerts table
 *
 * Output (xwalk container block, each row = one "table-alerts-row" item, 3 columns):
 *   Row 1 (header): [empty] | Immediate Action | Near Term Action   (empty first cell kept)
 *   Rows 2..n: label | immediate count | near-term count
 * Field hints: column1text, column2text, column3text (model table-alerts-row).
 * Empty cells are emitted as '' with no hint (hinting rule).
 */
const FIELDS = ['column1text', 'column2text', 'column3text'];

function hintedCell(document, sourceCell, fieldName) {
  if (!sourceCell) return '';
  const hasContent = sourceCell.textContent.trim() !== '' || sourceCell.querySelector('img, picture, a');
  if (!hasContent) return '';
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${fieldName} `));
  while (sourceCell.firstChild) frag.appendChild(sourceCell.firstChild);
  return frag;
}

export default function parse(element, { document }) {
  const table = element.matches('table') ? element : element.querySelector('table');
  if (!table) return;

  // Header row: thead first; fallback to the first row containing <th>.
  const headerRow = table.querySelector(':scope > thead > tr')
    || [...table.querySelectorAll('tr')].find((tr) => tr.querySelector(':scope > th'));
  const bodyRows = [...table.querySelectorAll(':scope > tbody > tr, :scope > tr')]
    .filter((tr) => tr !== headerRow);

  const allRows = [headerRow, ...bodyRows].filter(Boolean);
  if (!allRows.length) return;

  const colCount = Math.max(FIELDS.length, ...allRows.map((tr) => tr.querySelectorAll(':scope > th, :scope > td').length));

  const cells = allRows.map((tr) => {
    const srcCells = [...tr.querySelectorAll(':scope > th, :scope > td')];
    const row = [];
    for (let i = 0; i < colCount; i += 1) {
      const field = FIELDS[i] || `column${i + 1}text`;
      row.push(hintedCell(document, srcCells[i], field));
    }
    return row;
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-alerts', cells });
  table.replaceWith(block);
  if (element !== table) element.replaceWith(block);
}
