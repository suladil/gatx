/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-filters. Base: accordion. Source: http://localhost:8765/maintenance/
 * Selector: .filters .group
 *
 * The selector matches EACH .group, but all groups belong to ONE block. On the first match
 * the parser collects the contiguous run of sibling .group elements, builds a single block
 * (one row per group) and removes the other groups; later matches are detached and skipped.
 * If handed a container instead, it uses the container's .group descendants.
 *
 * Output (xwalk container block, item model accordion-filters-item, 4 columns):
 *   [ <!-- field:title --> h3 text
 *   | <!-- field:type --> checkbox | prefixed-text | date-range
 *   | <!-- field:options --> <ul><li>..</li></ul>
 *   | <!-- field:help --> .hint paragraph (empty cell, no hint, when absent) ]
 *
 * Works on both the raw source DOM (checkbox/text inputs, <select>) and the DOM after
 * gatx-cleanup.js (inputs removed, <select> replaced by its selected option text,
 * all-control containers joined with ' — ').
 * Iteration is keyed on div.group (block-level wrapper; no nested interactive elements).
 */
const ITEM_SELECTOR = '.group';
const JOINER = ' — ';
const DATE_LABEL = /^(start|end|from|to)(\s+date)?$/i;

function collectGroups(element) {
  if (!element.matches(ITEM_SELECTOR)) {
    return [...element.querySelectorAll(ITEM_SELECTOR)];
  }
  let first = element;
  while (first.previousElementSibling && first.previousElementSibling.matches(ITEM_SELECTOR)) {
    first = first.previousElementSibling;
  }
  const groups = [];
  let cur = first;
  while (cur && cur.matches(ITEM_SELECTOR)) {
    groups.push(cur);
    cur = cur.nextElementSibling;
  }
  return groups;
}

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

function hinted(document, fieldName, nodes) {
  const content = (Array.isArray(nodes) ? nodes : [nodes]).filter(Boolean);
  if (!content.length) return '';
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${fieldName} `));
  content.forEach((n) => frag.appendChild(typeof n === 'string' ? document.createTextNode(n) : n));
  return frag;
}

function buildList(document, items) {
  if (!items.length) return null;
  const ul = document.createElement('ul');
  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    ul.append(li);
  });
  return ul;
}

// Label text without any nested control text.
function labelText(label) {
  const copy = label.cloneNode(true);
  copy.querySelectorAll('input, select, button, textarea').forEach((c) => c.remove());
  return clean(copy.textContent);
}

function analyzeGroup(group) {
  const hint = group.querySelector(':scope > p.hint, :scope > .hint');
  const labels = [...group.querySelectorAll('label')];
  const listItems = [...group.querySelectorAll('li')];

  // Date range: labels wrapping text inputs, or Start/End labels (after cleanup).
  const hasTextInLabel = labels.some((l) => l.querySelector('input:not([type="checkbox"]):not([type="radio"])'));
  const labelTexts = (labels.length ? labels.map(labelText) : listItems.map((li) => clean(li.textContent)))
    .filter(Boolean);
  if (labelTexts.length && (hasTextInLabel || labelTexts.every((t) => DATE_LABEL.test(t)))) {
    return { type: 'date-range', options: labelTexts, hint };
  }

  // Prefixed text: a prefix <select> (raw) or a non-hint paragraph holding its text (cleaned).
  const select = group.querySelector('select');
  if (select) {
    const opts = [...select.querySelectorAll('option')].map((o) => clean(o.textContent)).filter(Boolean);
    return { type: 'prefixed-text', options: opts, hint };
  }
  if (!labelTexts.length) {
    const line = [...group.querySelectorAll(':scope > p')].find((p) => p !== hint && clean(p.textContent));
    if (line) {
      const prefix = clean(line.textContent).split(JOINER)[0].trim();
      return { type: 'prefixed-text', options: prefix ? [prefix] : [], hint };
    }
  }

  return { type: 'checkbox', options: labelTexts, hint };
}

export default function parse(element, { document }) {
  const groups = collectGroups(element);
  if (!groups.length) return;

  const cells = groups.map((group) => {
    const heading = group.querySelector('h3, h4, h2, legend, strong');
    const title = heading ? clean(heading.textContent) : '';
    const { type, options, hint } = analyzeGroup(group);

    let helpNode = null;
    if (hint && clean(hint.textContent)) {
      helpNode = document.createElement('p');
      helpNode.append(...hint.childNodes);
    }

    return [
      hinted(document, 'title', title || null),
      hinted(document, 'type', type),
      hinted(document, 'options', buildList(document, options)),
      hinted(document, 'help', helpNode),
    ];
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-filters', cells });

  if (element.matches(ITEM_SELECTOR)) {
    groups[0].replaceWith(block);
    groups.slice(1).forEach((g) => g.remove());
    if (element.parentNode && element !== groups[0]) element.remove();
  } else {
    element.replaceWith(block);
  }
}
