/*
 * Accordion Filters Block
 * Report filter sidebar: each row is a filter group (title | type | options | help)
 * rendered as an open, collapsible box with generated (non-functional) controls.
 * Also appends a vertical "Report Filters" tab that collapses/expands the section.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

const TYPES = ['checkbox', 'prefixed-text', 'date-range'];
let uid = 0;

function nextId(prefix) {
  uid += 1;
  return `accordion-filters-${prefix}-${uid}`;
}

function listItems(cell) {
  if (!cell) return [];
  const lis = [...cell.querySelectorAll('li')];
  if (lis.length) return lis.map((li) => li.textContent.trim()).filter(Boolean);
  return [...cell.querySelectorAll('p')]
    .map((p) => p.textContent.trim())
    .filter(Boolean);
}

function buildCheckboxes(items) {
  const list = document.createElement('ul');
  list.className = 'accordion-filters-checkboxes';
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

function buildPrefixedText(items, title) {
  const wrap = document.createElement('div');
  wrap.className = 'accordion-filters-prefixed';
  const select = document.createElement('select');
  select.setAttribute('aria-label', `${title} prefix`);
  (items.length ? items : ['']).forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    select.append(option);
  });
  const input = document.createElement('input');
  input.type = 'text';
  input.setAttribute('aria-label', title);
  wrap.append(select, input);
  return wrap;
}

function buildDateRange(items) {
  const wrap = document.createElement('div');
  wrap.className = 'accordion-filters-dates';
  const labels = items.length ? items : ['Start', 'End'];
  labels.forEach((label) => {
    const row = document.createElement('div');
    row.className = 'accordion-filters-date';
    const id = nextId('date');
    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.inputMode = 'numeric';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'accordion-filters-calendar';
    btn.setAttribute('aria-label', `Choose ${label} date`);
    const img = document.createElement('img');
    img.src = `${window.hlx?.codeBasePath || ''}/icons/calendar.svg`;
    img.alt = '';
    img.width = 16;
    img.height = 16;
    btn.append(img);
    row.append(lbl, input, btn);
    wrap.append(row);
  });
  return wrap;
}

function addSectionToggle(block) {
  const section = block.closest('.section');
  if (!section || section.querySelector('.accordion-filters-toggle')) return;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'accordion-filters-toggle';
  toggle.setAttribute('aria-expanded', 'true');
  toggle.innerHTML = '<span aria-hidden="true">«</span> Report Filters';
  toggle.addEventListener('click', () => {
    const collapsed = section.classList.toggle('filters-collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.querySelector('span').textContent = collapsed ? '»' : '«';
  });
  section.append(toggle);
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  [...block.children].forEach((row) => {
    const [titleCell, typeCell, optionsCell, helpCell] = [...row.children];
    const title = titleCell ? titleCell.textContent.trim() : '';
    const rawType = typeCell ? typeCell.textContent.trim().toLowerCase() : '';
    const type = TYPES.includes(rawType) ? rawType : 'checkbox';
    const items = listItems(optionsCell);

    const details = document.createElement('details');
    details.className = `accordion-filters-group accordion-filters-${type}`;
    details.open = true;
    moveInstrumentation(row, details);

    const summary = document.createElement('summary');
    summary.className = 'accordion-filters-title';
    if (titleCell) {
      const p = titleCell.querySelector('p');
      summary.append(...(p || titleCell).childNodes);
    }

    const body = document.createElement('div');
    body.className = 'accordion-filters-body';
    if (type === 'prefixed-text') body.append(buildPrefixedText(items, title));
    else if (type === 'date-range') body.append(buildDateRange(items));
    else body.append(buildCheckboxes(items));

    if (helpCell && helpCell.textContent.trim()) {
      const help = document.createElement('div');
      help.className = 'accordion-filters-help';
      help.append(...helpCell.childNodes);
      body.append(help);
    }

    details.append(summary, body);
    row.replaceWith(details);
  });

  addSectionToggle(block);
}
