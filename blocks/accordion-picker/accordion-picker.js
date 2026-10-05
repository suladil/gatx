/*
 * Accordion Picker Block
 * Report column picker: each row is a column group (title | options list)
 * rendered as a searchable checkbox group in a 2-column grid.
 * Also wires the section h2 directly before the block as a collapse toggle and
 * adds an "Enter Report Name" input before the section's first primary button
 * after the block (e.g. "Save Report Template »").
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

let uid = 0;

function nextId(prefix) {
  uid += 1;
  return `accordion-picker-${prefix}-${uid}`;
}

function listItems(cell) {
  if (!cell) return [];
  const lis = [...cell.querySelectorAll('li')];
  if (lis.length) return lis.map((li) => li.textContent.trim()).filter(Boolean);
  return [...cell.querySelectorAll('p')]
    .map((p) => p.textContent.trim())
    .filter(Boolean);
}

function iconButton(icon, label, className) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `accordion-picker-icon-button ${className}`;
  btn.setAttribute('aria-label', label);
  btn.title = label;
  const img = document.createElement('img');
  img.src = `${window.hlx?.codeBasePath || ''}/icons/${icon}.svg`;
  img.alt = '';
  img.width = 16;
  img.height = 16;
  btn.append(img);
  return btn;
}

function linkButton(text, className) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `accordion-picker-link ${className}`;
  btn.textContent = text;
  return btn;
}

function buildCheckboxes(items) {
  const list = document.createElement('ul');
  list.className = 'accordion-picker-checkboxes';
  items.forEach((label) => {
    const li = document.createElement('li');
    const id = nextId('cb');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.value = label;
    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.textContent = label;
    li.append(input, lbl);
    list.append(li);
  });
  return list;
}

function filterList(list, query) {
  const q = query.trim().toLowerCase();
  [...list.children].forEach((li) => {
    const match = !q || li.textContent.toLowerCase().includes(q);
    li.classList.toggle('accordion-picker-filtered', !match);
  });
}

function moveCheckedToTop(list) {
  const items = [...list.children];
  const checked = items.filter((li) => li.querySelector('input:checked'));
  const unchecked = items.filter((li) => !li.querySelector('input:checked'));
  list.append(...checked, ...unchecked);
}

function setAll(list, checked) {
  list.querySelectorAll('li:not(.accordion-picker-filtered) input[type="checkbox"]')
    .forEach((input) => { input.checked = checked; });
}

function buildGroup(row) {
  const [titleCell, optionsCell] = [...row.children];
  const title = titleCell ? titleCell.textContent.trim() : '';
  const items = listItems(optionsCell);

  const group = document.createElement('div');
  group.className = 'accordion-picker-group';
  group.setAttribute('role', 'group');
  moveInstrumentation(row, group);

  // header: title + search + clear + move-to-top
  const header = document.createElement('div');
  header.className = 'accordion-picker-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'accordion-picker-title';
  titleEl.id = nextId('title');
  if (titleCell) {
    const p = titleCell.querySelector('p');
    titleEl.append(...(p || titleCell).childNodes);
  }
  group.setAttribute('aria-labelledby', titleEl.id);

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'accordion-picker-search';
  search.placeholder = 'Search';
  search.setAttribute('aria-label', `Search ${title} columns`);

  const clearBtn = iconButton('clear', `Clear ${title} search`, 'accordion-picker-clear');
  const moveBtn = iconButton('move-up', `Move selected ${title} columns to the top`, 'accordion-picker-move-up');

  header.append(titleEl, search, clearBtn, moveBtn);

  // body: select all / unselect all + checkbox list
  const body = document.createElement('div');
  body.className = 'accordion-picker-body';

  const actions = document.createElement('p');
  actions.className = 'accordion-picker-actions';
  const selectAll = linkButton('Select All', 'accordion-picker-select-all');
  const unselectAll = linkButton('Unselect All', 'accordion-picker-unselect-all');
  selectAll.setAttribute('aria-label', `Select all ${title} columns`);
  unselectAll.setAttribute('aria-label', `Unselect all ${title} columns`);
  actions.append(selectAll, ' / ', unselectAll);

  const list = buildCheckboxes(items);
  body.append(actions, list);

  search.addEventListener('input', () => filterList(list, search.value));
  clearBtn.addEventListener('click', () => {
    search.value = '';
    filterList(list, '');
    search.focus();
  });
  moveBtn.addEventListener('click', () => moveCheckedToTop(list));
  selectAll.addEventListener('click', () => setAll(list, true));
  unselectAll.addEventListener('click', () => setAll(list, false));

  group.append(header, body);
  return group;
}

/** Last element of the wrapper directly before the block's wrapper, if it is an h2. */
function findHeading(wrapper) {
  const prev = wrapper?.previousElementSibling;
  const last = prev?.lastElementChild;
  return last && last.tagName === 'H2' ? last : null;
}

/** First primary button (strong > a) in the section after the block's wrapper. */
function findSaveButton(wrapper) {
  let el = wrapper?.nextElementSibling;
  while (el) {
    const btn = el.querySelector('a.button.primary, strong > a');
    if (btn) return btn;
    el = el.nextElementSibling;
  }
  return null;
}

function saveRowOf(saveButton) {
  return saveButton.closest('.button-container') || saveButton.parentElement;
}

function addReportName(saveButton) {
  const container = saveRowOf(saveButton);
  if (!container || container.querySelector('.accordion-picker-report-name')) return container;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'accordion-picker-report-name';
  input.name = 'reportName';
  input.placeholder = 'Enter Report Name';
  input.setAttribute('aria-label', 'Enter Report Name');
  // place directly before the button (or its <strong> wrapper)
  const anchor = saveButton.parentElement !== container ? saveButton.parentElement : saveButton;
  anchor.before(input);
  container.classList.add('accordion-picker-save-row');
  return container;
}

/**
 * Adds the report name input to the save row after the block, matching the
 * picker's collapsed state. Safe to call again after the Universal Editor
 * replaces the save button.
 */
export function decorateSaveRow(wrapper) {
  const saveButton = findSaveButton(wrapper);
  if (!saveButton) return null;
  const row = addReportName(saveButton);
  row.classList.toggle('accordion-picker-hidden', wrapper.classList.contains('accordion-picker-hidden'));
  return row;
}

/** Targets are looked up on each click so a replaced save row is still toggled. */
function addToggle(heading, getTargets, block) {
  if (heading.querySelector('.accordion-picker-toggle')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'accordion-picker-toggle';
  btn.setAttribute('aria-expanded', 'true');
  if (!block.id) block.id = nextId('panel');
  btn.setAttribute('aria-controls', block.id);
  const indicator = document.createElement('span');
  indicator.className = 'accordion-picker-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  indicator.textContent = '▼';
  btn.append(indicator, ...heading.childNodes);
  heading.append(btn);
  heading.classList.add('accordion-picker-heading');

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    indicator.textContent = expanded ? '▶' : '▼';
    heading.classList.toggle('accordion-picker-heading-collapsed', expanded);
    getTargets().forEach((t) => t.classList.toggle('accordion-picker-hidden', expanded));
  });
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  [...block.children].forEach((row) => {
    row.replaceWith(buildGroup(row));
  });

  const wrapper = block.closest('.accordion-picker-wrapper') || block;
  decorateSaveRow(wrapper);

  const heading = findHeading(wrapper);
  if (heading) {
    const getTargets = () => {
      const saveButton = findSaveButton(wrapper);
      return [wrapper, saveButton && saveRowOf(saveButton)].filter(Boolean);
    };
    addToggle(heading, getTargets, block);
  }
}
