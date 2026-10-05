/* eslint-disable */
/* global WebImporter */
/**
 * Parser for quote. Source: http://localhost:8765/safety-milestone/
 * Selector: article blockquote.quote
 *
 * Output (xwalk block, model quote):
 *   Row 1: [ <!-- field:quotation --> quotation paragraph(s) ]
 *   Row 2: [ <!-- field:attribution --> attribution paragraph (em kept -> cite) ]
 * The attribution is the last paragraph when it is wrapped in <em>/<cite>.
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
  const paras = [...element.querySelectorAll(':scope > p')];
  const last = paras[paras.length - 1];
  const hasAttribution = paras.length > 1 && last.querySelector('em, cite')
    && last.textContent.trim() === last.querySelector('em, cite').textContent.trim();
  const quotation = hasAttribution ? paras.slice(0, -1) : paras;

  const cells = [[hinted(document, 'quotation', quotation)]];
  if (hasAttribution) cells.push([hinted(document, 'attribution', [last])]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'quote', cells });
  element.replaceWith(block);
}
