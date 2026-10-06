/* eslint-disable */
/* global WebImporter */
/**
 * Parser for shop-a-car. Source: http://localhost:8765/shop-a-car/
 * Selector: .request-form .shop-a-car
 *
 * Output (xwalk block, model shop-a-car):
 *   Row 1: [ <!-- field:intro --> intro paragraph(s) ]
 *   Row 2: [ confirmation message ] (empty -> block default)
 *   Row 3: [ submission URL ] (empty -> demo mode)
 * The form fields themselves are built by the block, so only the authored texts are kept.
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
  const intro = [...element.querySelectorAll('.intro')];
  const confirmation = [...element.querySelectorAll('.confirmation > *')];
  const action = element.getAttribute('data-action') || '';

  const cells = [
    [hinted(document, 'intro', intro)],
    [hinted(document, 'confirmation', confirmation)],
    [action ? hinted(document, 'action', [document.createTextNode(action)]) : ''],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'shop-a-car', cells });
  element.replaceWith(block);
}
