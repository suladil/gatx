/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table-report. Base: table. Source: http://localhost:8765/maintenance/
 * Selector: .report table
 *
 * Output (xwalk container block, each row = one "table-report-row" item, 13 columns):
 *   Row 1 (header): the 13 thead <th> labels
 *   Rows 2..n: one per tbody <tr>, always 13 cells (short rows padded)
 * Field hints: column1text ... column13text (model table-report-row).
 * Empty cells are emitted as '' with no hint (hinting rule) so they stay empty in md2jcr.
 * Cell content is moved as-is: ':expand:' / ':alert:' / ':wrench:' icon text (produced by
 * gatx-cleanup.js from /icons/*.svg images; converted here too if an icon <img> is still
 * present) and the "Add Disposition" links.
 * Iteration is keyed on table rows (no nested interactive elements).
 */
const COLUMNS = 13;
const FIELDS = Array.from({ length: COLUMNS }, (_, i) => `column${i + 1}text`);

// <img src=".../icons/alert.svg"> -> ':alert:' (fallback when the cleanup transformer did not run)
function convertIconImages(cell, document) {
  cell.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    const m = src.split(/[?#]/)[0].match(/\/icons\/(?:[^/]+\/)*([^/]+?)(?:\.[a-z0-9]+)?$/i);
    if (!m) return;
    const target = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement : img;
    target.replaceWith(document.createTextNode(`:${m[1]}:`));
  });
}

function hintedCell(document, sourceCell, fieldName) {
  if (!sourceCell) return '';
  convertIconImages(sourceCell, document);
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

  // Only as many columns as the source table has (up to the model's 13 fields).
  const colCount = Math.min(COLUMNS, Math.max(...allRows.map((tr) => tr.querySelectorAll(':scope > th, :scope > td').length)));
  const cells = allRows.map((tr) => {
    const srcCells = [...tr.querySelectorAll(':scope > th, :scope > td')];
    return FIELDS.slice(0, colCount).map((field, i) => hintedCell(document, srcCells[i], field));
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-report', cells });
  element.replaceWith(block);
}
