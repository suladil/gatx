/*
 * Cards Contact Block
 * Single-column list of contacts: photo on the left, name / role / phone-fax on the right.
 */

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((div) => {
      const onlyPicture = div.querySelector('picture') && !div.textContent.trim();
      if (onlyPicture) div.className = 'cards-contact-image';
      else if (!div.textContent.trim() && !div.children.length) div.remove();
      else div.className = 'cards-contact-body';
    });

    if (!li.querySelector('.cards-contact-image')) li.classList.add('cards-contact-no-image');

    // name / role hooks for the design pass
    const body = li.querySelector('.cards-contact-body');
    if (body) {
      const name = body.querySelector('h1, h2, h3, h4, h5, h6') || body.firstElementChild;
      if (name) name.classList.add('cards-contact-name');
      const role = name?.nextElementSibling;
      if (role && role.tagName === 'P') role.classList.add('cards-contact-role');
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '200' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(ul);
}
