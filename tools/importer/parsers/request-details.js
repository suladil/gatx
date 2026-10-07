/* eslint-disable */
/* global WebImporter */
/**
 * Parser for request-details. Source: http://localhost:8765/shop-a-car-request/
 * Selector: .request-form .request-details
 *
 * Output (xwalk block, model request-details):
 *   Row 1: [ no request message ] (empty -> block default)
 *   Row 2: [ form page ] (empty -> /shop-a-car)
 *   Row 3: [ return page ] (empty -> /portal)
 * The request itself is rendered by the block, so only the authored settings are kept.
 */
function hinted(document, fieldName, nodes) {
  const content = nodes.filter(Boolean);
  if (!content.length) return '';
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${fieldName} `));
  content.forEach((n) => frag.appendChild(n));
  return frag;
}

export default function parse(element, { document }) {
  const text = (value, name) => (value ? hinted(document, name, [document.createTextNode(value)]) : '');
  const cells = [
    [hinted(document, 'emptyMessage', [...element.querySelectorAll('.empty-message > *')])],
    [text(element.getAttribute('data-form-page'), 'formPage')],
    [text(element.getAttribute('data-back-page'), 'backPage')],
  ];
  const block = WebImporter.Blocks.createBlock(document, { name: 'request-details', cells });
  element.replaceWith(block);
}
