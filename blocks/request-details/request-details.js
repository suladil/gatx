/*
 * Request Details Block
 * Shows a submitted Shop a Car request (?id=<request id>, or the most recent one) with
 * every field grouped like the form, plus Modify Request (reopens the form prefilled).
 * Rows (all optional): empty message | form page (default /shop-a-car) | back link page
 * (default /portal). Requests are read from the browser, where the shop-a-car block
 * keeps them until there is a request system to read from.
 */

import { resolveSitePath } from '../../scripts/scripts.js';
import {
  SECTIONS, findRequest, readRequests, formatDate,
} from '../shop-a-car/shop-a-car.js';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === false) return;
    if (key === 'className') node.className = value;
    else node.setAttribute(key, value === true ? '' : value);
  });
  node.append(...children);
  return node;
}

function cellLink(cell, fallback) {
  return cell?.querySelector('a')?.getAttribute('href') || cell?.textContent.trim() || fallback;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function fieldValue(field, request) {
  if (field.type === 'file') {
    const files = request.attachments || [];
    if (!files.length) return el('span', { className: 'request-details-empty' }, 'None attached');
    return el('ul', { className: 'request-details-files' }, ...files.map((name) => el('li', {}, name)));
  }
  const value = (request.values || {})[field.name];
  if (!value) return el('span', { className: 'request-details-empty' }, '—');
  if (field.type === 'date') return formatDate(value);
  if (field.name === 'priority') {
    return el('span', { className: `request-details-priority request-details-priority-${value.toLowerCase()}` }, value);
  }
  return value;
}

function buildNotice(params) {
  if (params.has('submitted')) {
    return el(
      'div',
      { className: 'request-details-notice', role: 'status' },
      el('strong', {}, 'Request received. '),
      'Your GATX service team will review it and confirm the shop and schedule. You can return to the portal at any time to review its status.',
    );
  }
  if (params.has('updated')) {
    return el('div', { className: 'request-details-notice', role: 'status' }, el('strong', {}, 'Changes saved. '), 'Your request has been updated.');
  }
  return null;
}

function buildRequest(request, { formPage, backPage, params }) {
  const wrap = el('div', { className: 'request-details-body' });

  const notice = buildNotice(params);
  if (notice) wrap.append(notice);

  const modified = request.updatedAt && request.updatedAt - request.submittedAt > 1000;
  wrap.append(el(
    'div',
    { className: 'request-details-header' },
    el(
      'div',
      {},
      el('p', { className: 'request-details-label' }, 'Shop a Car Request'),
      el('h2', {}, request.id),
      el(
        'p',
        { className: 'request-details-meta' },
        `Submitted ${formatTime(request.submittedAt)}`,
        modified ? ` · Last modified ${formatTime(request.updatedAt)}` : '',
      ),
    ),
    el('span', { className: 'request-details-status' }, request.status || 'Submitted'),
  ));

  SECTIONS.forEach((section, i) => {
    const group = el('section', { className: 'request-details-section' });
    group.append(el(
      'h3',
      {},
      el('span', { className: 'request-details-step', 'aria-hidden': 'true' }, String(i + 1)),
      section.title,
    ));
    const list = el('dl', {});
    section.fields.forEach((field) => {
      list.append(
        el('div', { className: `request-details-item${field.wide ? ' request-details-item-wide' : ''}` }, el('dt', {}, field.label), el('dd', {}, fieldValue(field, request))),
      );
    });
    group.append(list);
    wrap.append(group);
  });

  wrap.append(el(
    'div',
    { className: 'request-details-actions' },
    el('a', { href: resolveSitePath(backPage), className: 'request-details-back' }, 'Return to Portal'),
    el('a', { href: resolveSitePath(`${formPage}?edit=${encodeURIComponent(request.id)}`), className: 'request-details-modify' }, 'Modify Request'),
  ));
  return wrap;
}

function buildEmpty(message, formPage) {
  const wrap = el('div', { className: 'request-details-body request-details-none' });
  if (message) {
    wrap.append(...message.childNodes);
  } else {
    wrap.append(
      el('h2', {}, 'No request to show'),
      el('p', {}, 'Submit a Shop a Car request and its details will appear here.'),
    );
  }
  wrap.append(el(
    'div',
    { className: 'request-details-actions' },
    el('a', { href: resolveSitePath(formPage), className: 'request-details-modify' }, 'Shop a Car'),
  ));
  return wrap;
}

/**
 * @param {Element} block
 */
export default function decorate(block) {
  const [emptyCell, formCell, backCell] = [...block.children].map((row) => row.firstElementChild);
  const formPage = cellLink(formCell, '/shop-a-car');
  const backPage = cellLink(backCell, '/portal');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const request = id ? findRequest(id) : readRequests()[0];

  const message = emptyCell?.textContent.trim() ? emptyCell : null;
  block.replaceChildren(request
    ? buildRequest(request, { formPage, backPage, params })
    : buildEmpty(message, formPage));
}
