/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table-totals. Base: table. Source: http://localhost:8765/portal/
 * Selectors: .widget.leased-fleet table, .widget.maintenance table, .widget.compliance table
 *
 * UE model (blocks/table-totals/_table-totals.json):
 *   - single row model table-totals-row with fields column1text..column4text.
 *
 * Output:
 *   Row 1: header row from <thead>
 *   Rows 2..: <tbody> rows
 *   Last row: <tfoot> Totals row, flattened as an ordinary row
 * N = column count of the source table (clamped to 2..4, the columns the model offers).
 */
function hintedCell(document, sourceCell, fieldName) {
  if (!sourceCell) return '';
  const hasContent = sourceCell.textContent.trim() !== '' || sourceCell.querySelector('img, picture, a');
  if (!hasContent) return '';
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${fieldName} `));
  while (sourceCell.firstChild) frag.appendChild(sourceCell.firstChild);
  return frag;
}

function hintedText(document, text, fieldName) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${fieldName} `));
  frag.appendChild(document.createTextNode(text));
  return frag;
}

export default function parse(element, { document }) {
  const table = element.matches('table') ? element : element.querySelector('table');
  if (!table) return;

  const headRows = [...table.querySelectorAll(':scope > thead > tr')];
  const bodyRows = [...table.querySelectorAll(':scope > tbody > tr, :scope > tr')];
  const footRows = [...table.querySelectorAll(':scope > tfoot > tr')];
  const allRows = [...headRows, ...bodyRows, ...footRows];
  if (!allRows.length) return;

  const rawCols = Math.max(...allRows.map((tr) => tr.querySelectorAll(':scope > th, :scope > td').length));
  const colCount = Math.min(4, Math.max(2, rawCols));

  // Single row model (table-totals-row, column1text..column4text); unused columns stay empty
  // and are dropped by the block decorator.
  const cells = [];
  allRows.forEach((tr) => {
    const srcCells = [...tr.querySelectorAll(':scope > th, :scope > td')];
    const row = [];
    for (let i = 0; i < colCount; i += 1) {
      row.push(hintedCell(document, srcCells[i], `column${i + 1}text`));
    }
    cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-totals', cells });
  table.replaceWith(block);
  if (element !== table) element.replaceWith(block);
}
