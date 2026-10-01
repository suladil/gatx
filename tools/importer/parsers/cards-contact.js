/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-contact. Base: cards. Source: http://localhost:8765/portal/
 * Selector: .widget.service-team .team-member
 *
 * The selector matches EACH .team-member, but all members belong to ONE block. On the
 * first match the parser collects the contiguous run of sibling .team-member elements,
 * builds a single block (one row per member) and removes the other members; the import
 * script skips those later matches because they are detached. If the parser is handed a
 * container instead, it uses the container's .team-member children.
 *
 * Output (xwalk container block, item model cards-contact-card):
 *   Each row: [ <!-- field:image --> img (alt kept -> imageAlt) | <!-- field:text --> h3 name, p role, p Phone/Fax (<br> kept) ]
 * Iteration is keyed on div.team-member (block-level wrapper; no nested interactive elements).
 */
const ITEM_SELECTOR = '.team-member';

function collectMembers(element) {
  if (!element.matches(ITEM_SELECTOR)) {
    return [...element.querySelectorAll(ITEM_SELECTOR)];
  }
  // Walk back to the first member of the contiguous sibling run, then collect forward.
  let first = element;
  while (first.previousElementSibling && first.previousElementSibling.matches(ITEM_SELECTOR)) {
    first = first.previousElementSibling;
  }
  const members = [];
  let cur = first;
  while (cur && cur.matches(ITEM_SELECTOR)) {
    members.push(cur);
    cur = cur.nextElementSibling;
  }
  return members;
}

function hinted(document, fieldName, nodes) {
  const content = nodes.filter(Boolean);
  if (!content.length) return '';
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${fieldName} `));
  content.forEach((n) => frag.appendChild(n));
  return frag;
}

export default function parse(element, { document }) {
  const members = collectMembers(element);
  if (!members.length) return;

  const cells = members.map((member) => {
    const img = member.querySelector('picture') || member.querySelector('img');

    // Text wrapper: the non-image child div; fallback to the member itself.
    const textWrap = member.querySelector(':scope > div') || member;
    const textNodes = [...textWrap.children].filter((el) => !el.matches('img, picture'));

    return [
      hinted(document, 'image', [img]),
      hinted(document, 'text', textNodes),
    ];
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-contact', cells });

  if (element.matches(ITEM_SELECTOR)) {
    members[0].replaceWith(block);
    members.slice(1).forEach((m) => m.remove());
    if (element.parentNode && element !== members[0]) element.remove();
  } else {
    element.replaceWith(block);
  }
}
