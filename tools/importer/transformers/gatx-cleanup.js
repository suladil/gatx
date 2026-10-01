/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: GATX site cleanup (templates: portal, maintenance).
 * Selectors verified in migration-work/cleaned.html and live sources
 * (http://localhost:8765/portal/, http://localhost:8765/maintenance/):
 * - body > div.utility          utility bar on portal ("Change Company Number(s) | Contact Us")
 * - header                      global header (brand, user info, partner logos, car lookup form, main nav;
 *                               on maintenance the utility bar is nested inside it)
 * - form / select / input / button  portal .widget.quick-search / .widget.service-team and
 *                               maintenance aside.filters .group (non-authorable controls -> text)
 * - aside.filters .filters-tab  maintenance vertical "« Report Filters" collapse tab (re-created by
 *                               the accordion-filters block)
 * - .filters .actions a.btn     maintenance Clear / Update links -> EDS secondary / primary buttons
 * - img with src under /icons/  maintenance .report-tools and report table icons -> :name: icon syntax
 * - style                       inline <style> in live source <head>/<body>
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

const CONTROL_SELECTOR = 'select, input, button';
const JOINER = ' — ';

function isToggle(control) {
  const type = (control.getAttribute('type') || '').toLowerCase();
  return control.tagName.toLowerCase() === 'input' && (type === 'checkbox' || type === 'radio');
}

function controlText(control) {
  const tag = control.tagName.toLowerCase();
  // Checkboxes / radios carry no authorable text - the label text is the content.
  if (isToggle(control)) return '';
  if (tag === 'select') {
    const selected = control.querySelector('option[selected]')
      || (control.options && control.selectedIndex >= 0 ? control.options[control.selectedIndex] : null)
      || control.querySelector('option');
    return selected ? selected.textContent.trim() : '';
  }
  if (tag === 'input') {
    return (control.getAttribute('placeholder') || control.getAttribute('value') || '').trim();
  }
  return control.textContent.trim();
}

// Replace every form control with static text. When a container holds only
// controls (no other text/elements), its content becomes the control texts joined
// with an em dash, e.g. "GATX — Enter a Car Number — Search »".
// Controls without text (checkboxes) are simply removed, leaving the label text.
function staticizeControls(root, doc) {
  const parents = new Set();
  root.querySelectorAll(CONTROL_SELECTOR).forEach((c) => parents.add(c.parentElement));

  parents.forEach((parent) => {
    if (!parent) return;
    const controls = [...parent.children].filter((c) => c.matches(CONTROL_SELECTOR));
    if (!controls.length) return;
    const onlyControls = [...parent.childNodes].every((n) => (
      (n.nodeType === 1 && n.matches(CONTROL_SELECTOR))
      || (n.nodeType === 3 && !n.textContent.trim())
    ));
    if (onlyControls && controls.length > 1) {
      parent.textContent = controls.map(controlText).filter(Boolean).join(JOINER);
    } else {
      controls.forEach((c) => {
        const text = controlText(c);
        if (!text) {
          // e.g. <label><input type="checkbox"> Enroute</label> -> <label>Enroute</label>
          const next = c.nextSibling;
          c.remove();
          if (next && next.nodeType === 3) next.textContent = next.textContent.replace(/^\s+/, '');
          return;
        }
        c.replaceWith(doc.createTextNode(text));
      });
    }
  });

  // Unwrap forms; wrap loose inline content in a paragraph.
  root.querySelectorAll('form').forEach((form) => {
    const hasBlockChildren = [...form.children].some((c) => /^(P|DIV|UL|OL|H[1-6]|TABLE)$/.test(c.tagName));
    if (!hasBlockChildren && form.textContent.trim()) {
      const p = doc.createElement('p');
      p.textContent = form.textContent.trim().replace(/\s+/g, ' ');
      form.replaceWith(p);
    } else {
      form.replaceWith(...form.childNodes);
    }
  });
}

// <img src=".../icons/print.svg"> -> ":print:" (EDS icon syntax). Works for relative
// and absolute src values. Links wrapping the icon are kept: <a href="#">:print:</a>.
function iconName(img) {
  const src = img.getAttribute('src') || '';
  let path;
  try {
    path = new URL(src, 'http://localhost/').pathname;
  } catch (e) {
    path = src.split(/[?#]/)[0];
  }
  const m = path.match(/\/icons\/(?:[^/]+\/)*([^/]+?)(?:\.[a-z0-9]+)?$/i);
  return m ? m[1] : null;
}

function convertIcons(root, doc) {
  root.querySelectorAll('img').forEach((img) => {
    const name = iconName(img);
    if (!name) return;
    const parent = img.parentElement;
    const target = parent && parent.tagName === 'PICTURE' ? parent : img;
    target.replaceWith(doc.createTextNode(`:${name}:`));
  });
}

// .filters .actions: <a class="btn clear"> -> <p><em><a>Clear</a></em></p> (secondary);
// any other a.btn (e.g. .btn.update) -> <p><strong><a>Update »</a></strong></p> (primary).
// Reports builder rows (.builder .save, .builder .actions) follow the same rule; the
// "Enter Report Name" input in .save is dropped (accordion-picker re-creates it).
function convertButtons(root, doc) {
  root.querySelectorAll('.filters .actions, .builder .save, .builder .actions').forEach((actions) => {
    const links = [...actions.querySelectorAll('a.btn')];
    if (!links.length) return;
    const paras = links.map((a) => {
      const link = doc.createElement('a');
      link.setAttribute('href', a.getAttribute('href') || '#');
      link.textContent = a.textContent.trim();
      const wrap = doc.createElement(a.classList.contains('clear') ? 'em' : 'strong');
      wrap.append(link);
      const p = doc.createElement('p');
      p.append(wrap);
      return p;
    });
    actions.replaceWith(...paras);
  });
}

// Page title "<h1><strong>Maintenance</strong> Service Events</h1>": bold text inside a
// heading does not survive html2md, so the emphasised section name becomes a label
// paragraph before the heading: <p>Maintenance</p><h1>Service Events</h1>
function splitTitleLabel(root, doc) {
  root.querySelectorAll('.page-title h1').forEach((h1) => {
    const strong = h1.querySelector('strong, b');
    if (!strong) return;
    const label = doc.createElement('p');
    label.textContent = strong.textContent.trim();
    strong.remove();
    h1.textContent = h1.textContent.trim();
    h1.before(label);
  });
}

// List items whose text starts with "+" (e.g. "+Furnished Commodity ...") are read as a
// nested list marker by the markdown step, which then swallows the rest of the page.
// A zero-width space before the "+" keeps the text identical but unambiguous.
function protectLeadingPlus(root, doc) {
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const li = node.parentElement && node.parentElement.closest('li');
    if (li && /^\s*[+]/.test(node.nodeValue) && li.textContent.trim().startsWith(node.nodeValue.trim())) {
      node.nodeValue = node.nodeValue.replace(/^(\s*)[+]/, '$1​+');
    }
  }
}

export default function transform(hookName, element, payload) {
  const doc = element.ownerDocument || document;

  if (hookName === TransformHook.beforeTransform) {
    // Global chrome (utility bar + header)
    WebImporter.DOMUtils.remove(element, ['body > div.utility', 'header']);
    // Maintenance: non-authored vertical collapse tab (accordion-filters block re-creates it)
    WebImporter.DOMUtils.remove(element, ['aside.filters .filters-tab']);
    // Icon images -> :name: before parsers run (e.g. table-report cells get icon syntax)
    convertIcons(element, doc);
    // Filter action links -> EDS button markup (default content)
    convertButtons(element, doc);
    // Maintenance page title: emphasised section name -> label paragraph
    splitTitleLabel(element, doc);
    // Convert form controls to static text before parsers run
    // (Quick Search form, Service Team company select, report filter controls)
    staticizeControls(element, doc);
  }

  if (hookName === TransformHook.afterTransform) {
    WebImporter.DOMUtils.remove(element, [
      'body > div.utility',
      'header',
      'aside.filters .filters-tab',
      'style',
      'script',
      'noscript',
      'link',
      'iframe',
    ]);
    // Any controls / icons left behind after parsing
    staticizeControls(element, doc);
    convertIcons(element, doc);
    protectLeadingPlus(element, doc);
  }
}
