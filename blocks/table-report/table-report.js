/*
 * Table Report Block
 * Wide data report: row 1 is the header, following rows are data rows.
 * Wraps the table in a horizontally scrollable container.
 * Cell content (incl. decorated :icon: spans and links) is moved, not re-serialized.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

const ICON_SPLIT = /(:[a-z0-9-]+:)/;
const ICON_ONLY = /^:([a-z0-9-]+):$/;

/**
 * Build a decorated icon span (same markup as aem.js decorateIcons).
 * @param {string} name
 */
function createIcon(name) {
  const span = document.createElement('span');
  span.className = `icon icon-${name}`;
  const img = document.createElement('img');
  img.dataset.iconName = name;
  img.src = `${window.hlx?.codeBasePath || ''}/icons/${name}.svg`;
  img.alt = '';
  img.loading = 'lazy';
  img.width = 16;
  img.height = 16;
  span.append(img);
  return span;
}

/**
 * Convert literal :icon-name: tokens left undecorated upstream into icon spans.
 * Already-decorated span.icon elements are left untouched.
 * @param {Element} el
 */
function convertIconTokens(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes
    .filter((node) => ICON_SPLIT.test(node.nodeValue))
    .forEach((node) => {
      const parts = node.nodeValue.split(ICON_SPLIT).filter(Boolean);
      node.replaceWith(...parts.map((part) => {
        const match = part.match(ICON_ONLY);
        return match ? createIcon(match[1]) : document.createTextNode(part);
      }));
    });
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const rows = [...block.children];
  const maxCols = rows.reduce((max, row) => Math.max(max, row.children.length), 0);

  // the row model has 13 fields; keep only columns with content in at least one row
  const isFilled = (cell) => cell && (cell.textContent.trim() || cell.querySelector('img, picture, a, span.icon'));
  const usedCols = [...Array(maxCols).keys()]
    .filter((col) => rows.some((row) => isFilled(row.children[col])));
  const colCount = usedCols.length;

  rows.forEach((row, i) => {
    const isHeader = i === 0;
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);
    const cells = usedCols.map((col) => row.children[col] || document.createElement('div'));

    cells.forEach((cell, col) => {
      const el = document.createElement(isHeader ? 'th' : 'td');
      if (isHeader) el.setAttribute('scope', 'col');
      el.dataset.col = col + 1;
      // unwrap a single paragraph so cells stay compact
      const only = cell.children.length === 1 && cell.firstElementChild.tagName === 'P'
        ? cell.firstElementChild : cell;
      el.append(...only.childNodes);
      if (!isHeader) convertIconTokens(el);
      if (!isHeader && el.querySelector('span.icon') && !el.textContent.trim()) {
        el.classList.add('table-report-icon');
      }
      tr.append(el);
    });

    if (isHeader) thead.append(tr);
    else tbody.append(tr);
  });

  table.append(thead, tbody);
  const scroller = document.createElement('div');
  scroller.className = 'table-report-scroll';
  scroller.tabIndex = 0;
  scroller.setAttribute('role', 'region');
  scroller.setAttribute('aria-label', 'Report table');
  scroller.append(table);
  block.dataset.columns = colCount;
  block.replaceChildren(scroller);
}
