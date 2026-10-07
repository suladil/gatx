/*
 * Shop a Car Request Block
 * Customer form for sending a railcar to a shop for maintenance or repair.
 * Rows (all optional): intro text | confirmation message | submission URL | details page.
 * The fields are fixed in code. Without a submission URL the form runs in demo
 * mode: it validates and shows the confirmation, but sends nothing.
 * "Save for Later" keeps a draft (without attachments) in the browser.
 * Submitted requests are kept in the browser so the request-details block can show
 * them; with a details page set, submitting opens it. ?edit=<request id> reopens a
 * request in the form for changes.
 */

import { resolveSitePath } from '../../scripts/scripts.js';

const DRAFT_KEY = 'gatx-shop-a-car-draft';
const REQUESTS_KEY = 'gatx-shop-a-car-requests';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const SECTIONS = [
  {
    title: 'Railcar Information',
    fields: [
      {
        name: 'railcarNumber',
        label: 'Railcar Number',
        required: true,
        placeholder: 'e.g. GATX 088325',
        pattern: '[A-Za-z]{2,4} ?[0-9]{1,6}',
        uppercase: true,
        errors: {
          valueMissing: 'Enter the railcar number.',
          patternMismatch: 'Enter a railcar number such as GATX 088325.',
        },
      },
      { name: 'company', label: 'Customer / Company Name', autocomplete: 'organization' },
      {
        name: 'currentLocation', label: 'Current Location', placeholder: 'City, State', wide: true,
      },
    ],
  },
  {
    title: 'Service Request',
    fields: [
      {
        name: 'serviceType',
        label: 'Type of Service',
        type: 'select',
        required: true,
        placeholder: 'Select a service',
        options: ['Inspection', 'Routine Maintenance', 'Repair', 'Damage Assessment', 'Other'],
        errors: { valueMissing: 'Select the type of service.' },
      },
      {
        name: 'serviceDate',
        label: 'Requested Service Date',
        type: 'date',
        required: true,
        errors: {
          valueMissing: 'Choose a requested service date.',
          rangeUnderflow: 'Choose today or a later date.',
        },
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'radio',
        options: ['Standard', 'High', 'Urgent'],
        value: 'Standard',
        wide: true,
      },
      {
        name: 'description',
        label: 'Description of Issue or Requested Work',
        type: 'textarea',
        required: true,
        maxlength: 2000,
        placeholder: 'Describe the issue, damage or work needed.',
        wide: true,
        errors: { valueMissing: 'Describe the issue or requested work.' },
      },
    ],
  },
  {
    title: 'Additional Information',
    fields: [
      { name: 'origin', label: 'Origin', placeholder: 'City, State' },
      { name: 'destination', label: 'Destination', placeholder: 'City, State' },
      {
        name: 'attachments',
        label: 'Supporting Documentation or Photos',
        type: 'file',
        accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic',
        hint: 'PDF, Word, Excel or image files, up to 10 MB each.',
        wide: true,
      },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

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

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value) {
  const [y, m, d] = value.split('-');
  return y ? `${m}/${d}/${y}` : value;
}

function buildLabel(field, id) {
  const label = el('label', { for: id, id: `${id}-label` }, field.label);
  if (field.required) label.append(el('span', { className: 'shop-a-car-required', 'aria-hidden': 'true' }, ' *'));
  return label;
}

function buildRadioGroup(field, id) {
  const group = el('fieldset', { className: 'shop-a-car-choices', 'aria-describedby': `${id}-error` });
  group.append(el('legend', {}, field.label));
  field.options.forEach((option) => {
    const optionId = `${id}-${option.toLowerCase()}`;
    group.append(el(
      'label',
      { for: optionId, className: `shop-a-car-choice shop-a-car-choice-${option.toLowerCase()}` },
      el('input', {
        type: 'radio', id: optionId, name: field.name, value: option, checked: option === field.value,
      }),
      el('span', {}, option),
    ));
  });
  return group;
}

function buildControl(field, id) {
  const common = {
    id,
    name: field.name,
    required: field.required,
    'aria-describedby': [field.hint && `${id}-hint`, `${id}-error`].filter(Boolean).join(' '),
  };
  if (field.type === 'select') {
    const select = el('select', common);
    select.append(el('option', { value: '', disabled: true, selected: true }, field.placeholder));
    field.options.forEach((option) => select.append(el('option', { value: option }, option)));
    return select;
  }
  if (field.type === 'textarea') {
    return el('textarea', {
      ...common, rows: 5, maxlength: field.maxlength, placeholder: field.placeholder,
    });
  }
  if (field.type === 'file') {
    return el('input', {
      ...common, type: 'file', multiple: true, accept: field.accept, className: 'shop-a-car-file-input',
    });
  }
  return el('input', {
    ...common,
    type: field.type || 'text',
    placeholder: field.placeholder,
    pattern: field.pattern,
    autocomplete: field.autocomplete || 'off',
    min: field.type === 'date' ? today() : undefined,
  });
}

function buildField(field) {
  const id = `shop-a-car-${field.name}`;
  const wrapper = el('div', {
    className: `shop-a-car-field shop-a-car-field-${field.type || 'text'}${field.wide ? ' shop-a-car-field-wide' : ''}`,
  });
  if (field.type === 'radio') {
    wrapper.append(buildRadioGroup(field, id));
  } else {
    wrapper.append(buildLabel(field, id), buildControl(field, id));
  }
  if (field.type === 'file') {
    wrapper.append(el('ul', { className: 'shop-a-car-file-list', 'aria-live': 'polite' }));
  }
  if (field.hint) wrapper.append(el('p', { id: `${id}-hint`, className: 'shop-a-car-hint' }, field.hint));
  wrapper.append(el('p', { id: `${id}-error`, className: 'shop-a-car-error' }));
  return wrapper;
}

function buildForm() {
  const form = el('form', { className: 'shop-a-car-form', novalidate: true });
  form.append(el('p', { className: 'shop-a-car-legend' }, el('span', { className: 'shop-a-car-required', 'aria-hidden': 'true' }, '*'), ' Required field'));
  SECTIONS.forEach((section, i) => {
    const fieldset = el('fieldset', { className: 'shop-a-car-section' });
    fieldset.append(el(
      'legend',
      {},
      el('span', { className: 'shop-a-car-step', 'aria-hidden': 'true' }, String(i + 1)),
      section.title,
    ));
    const grid = el('div', { className: 'shop-a-car-grid' });
    section.fields.forEach((field) => grid.append(buildField(field)));
    fieldset.append(grid);
    form.append(fieldset);
  });
  form.append(
    el('p', { className: 'shop-a-car-status', role: 'status' }),
    el(
      'div',
      { className: 'shop-a-car-actions' },
      el('button', { type: 'button', className: 'shop-a-car-save secondary' }, 'Save for Later'),
      el('button', { type: 'submit', className: 'shop-a-car-submit primary' }, 'Submit Request'),
    ),
  );
  return form;
}

/* validation */

function errorMessage(field, control) {
  const { validity } = control;
  const custom = field.errors || {};
  const key = ['valueMissing', 'patternMismatch', 'rangeUnderflow'].find((k) => validity[k]);
  return (key && custom[key]) || control.validationMessage;
}

function setError(form, field, message) {
  const id = `shop-a-car-${field.name}`;
  const error = form.querySelector(`#${id}-error`);
  const control = form.querySelector(`#${id}`);
  error.textContent = message || '';
  if (message) control?.setAttribute('aria-invalid', 'true');
  else control?.removeAttribute('aria-invalid');
  error.closest('.shop-a-car-field').classList.toggle('shop-a-car-field-invalid', !!message);
}

function validateField(form, field) {
  const control = form.elements[field.name];
  if (!control || field.type === 'radio') return true;
  if (field.type === 'file') {
    const tooBig = [...control.files].find((f) => f.size > MAX_FILE_SIZE);
    setError(form, field, tooBig ? `${tooBig.name} is larger than 10 MB.` : '');
    return !tooBig;
  }
  if (control.type === 'text') control.value = control.value.trim();
  if (field.uppercase) control.value = control.value.toUpperCase();
  const valid = control.checkValidity();
  setError(form, field, valid ? '' : errorMessage(field, control));
  return valid;
}

function validateForm(form) {
  const invalid = ALL_FIELDS.filter((field) => !validateField(form, field));
  if (invalid.length) form.elements[invalid[0].name].focus();
  return !invalid.length;
}

/* attachments */

function renderFiles(form) {
  const input = form.elements.attachments;
  const list = form.querySelector('.shop-a-car-file-list');
  list.replaceChildren(...[...input.files].map((file, index) => {
    const remove = el('button', { type: 'button', className: 'shop-a-car-file-remove', 'aria-label': `Remove ${file.name}` }, '×');
    remove.addEventListener('click', () => {
      const transfer = new DataTransfer();
      [...input.files].forEach((f, i) => { if (i !== index) transfer.items.add(f); });
      input.files = transfer.files;
      renderFiles(form);
      validateField(form, ALL_FIELDS.find((f) => f.name === 'attachments'));
    });
    return el(
      'li',
      {},
      el('span', { className: 'shop-a-car-file-name' }, file.name),
      el('span', { className: 'shop-a-car-file-size' }, formatSize(file.size)),
      remove,
    );
  }));
}

/* drafts */

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY));
  } catch (e) {
    return null;
  }
}

function saveDraft(form) {
  const values = {};
  ALL_FIELDS.filter((f) => f.type !== 'file').forEach((field) => {
    values[field.name] = form.elements[field.name].value;
  });
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), values }));
}

function restoreDraft(form, draft) {
  Object.entries(draft.values || {}).forEach(([name, value]) => {
    const control = form.elements[name];
    if (control && value) control.value = value;
  });
}

/* submitted requests (kept in the browser until there is a request system to read from) */

export function readRequests() {
  try {
    return JSON.parse(localStorage.getItem(REQUESTS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function findRequest(id) {
  return readRequests().find((request) => request.id === id) || null;
}

function newRequestId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `SCR-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${serial}`;
}

function saveRequest(form, existing) {
  const values = {};
  ALL_FIELDS.filter((f) => f.type !== 'file').forEach((field) => {
    values[field.name] = form.elements[field.name].value;
  });
  const files = [...form.elements.attachments.files].map((f) => f.name);
  const now = Date.now();
  const request = existing
    ? {
      ...existing, values, attachments: files.length ? files : existing.attachments, updatedAt: now,
    }
    : {
      id: newRequestId(), status: 'Submitted', submittedAt: now, updatedAt: now, values, attachments: files,
    };
  const others = readRequests().filter((r) => r.id !== request.id);
  localStorage.setItem(REQUESTS_KEY, JSON.stringify([request, ...others].slice(0, 20)));
  return request;
}

function showStatus(form, message, action) {
  const status = form.querySelector('.shop-a-car-status');
  status.replaceChildren(message);
  if (action) status.append(' ', action);
}

function savedTime(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/* confirmation */

function defaultConfirmation(updated) {
  const wrap = document.createElement('div');
  wrap.append(
    el('p', {}, updated
      ? 'Your changes have been saved and sent to the GATX service team.'
      : 'Thank you. Your Shop a Car request has been received and sent to the GATX service team for review.'),
    el('p', {}, 'You can return to the portal at any time to review the status of this request.'),
    el('p', {}, el('a', { href: '/portal' }, 'Return to Portal')),
  );
  return wrap;
}

function buildConfirmation(message, request, onReset, updated) {
  const { values } = request;
  const panel = el('div', { className: 'shop-a-car-confirmation', tabindex: '-1' });
  panel.append(el('h2', {}, updated ? 'Request Updated' : 'Request Received'));
  const body = el('div', { className: 'shop-a-car-confirmation-message' });
  body.append(...(message ? message.cloneNode(true) : defaultConfirmation(updated)).childNodes);
  // first link in the message is the main action
  const link = body.querySelector('a');
  if (link) link.classList.add('shop-a-car-portal-link');

  const summary = el('dl', { className: 'shop-a-car-summary' });
  [
    ['Request Number', request.id],
    ['Railcar Number', values.railcarNumber],
    ['Type of Service', values.serviceType],
    ['Priority', values.priority],
    ['Requested Service Date', formatDate(values.serviceDate)],
  ].forEach(([term, value]) => summary.append(el('dt', {}, term), el('dd', {}, value)));

  const again = el('button', { type: 'button', className: 'shop-a-car-again secondary' }, 'Submit Another Request');
  again.addEventListener('click', onReset);
  // reopens this request in the form (?edit=<id>) on the current page
  const modify = el('a', {
    href: `${window.location.pathname}?edit=${encodeURIComponent(request.id)}`,
    className: 'shop-a-car-modify',
  }, 'Modify Request');
  panel.append(body, summary, el('div', { className: 'shop-a-car-actions' }, again, modify));
  return panel;
}

/* submit */

async function send(form, action) {
  if (!action) return; // demo mode: nothing is sent
  const response = await fetch(action, { method: 'POST', body: new FormData(form) });
  if (!response.ok) throw new Error(`Submission failed: ${response.status}`);
}

/**
 * @param {Element} block
 */
export default function decorate(block) {
  const [intro, confirmation, actionRow, detailsRow] = [...block.children]
    .map((row) => row.firstElementChild);
  const action = actionRow?.querySelector('a')?.href || actionRow?.textContent.trim() || '';
  const detailsPage = detailsRow?.querySelector('a')?.getAttribute('href') || detailsRow?.textContent.trim() || '';
  const message = confirmation?.textContent.trim() ? confirmation : null;
  const editId = new URLSearchParams(window.location.search).get('edit');
  const editing = editId ? findRequest(editId) : null;
  const submitLabel = editing ? 'Update Request' : 'Submit Request';
  const detailsUrl = (request, flag) => resolveSitePath(`${detailsPage}?id=${encodeURIComponent(request.id)}&${flag}=1`);

  const form = buildForm();
  const content = el('div', { className: 'shop-a-car-body' });
  if (intro?.textContent.trim() && !editing) {
    content.append(el('div', { className: 'shop-a-car-intro' }, ...intro.childNodes));
  }
  content.append(form);
  block.replaceChildren(content);

  const draft = editId ? null : readDraft();
  if (editing) {
    // modify an existing request: prefill it, no drafts
    restoreDraft(form, editing);
    form.querySelector('.shop-a-car-save').remove();
    form.querySelector('.shop-a-car-submit').textContent = submitLabel;
    const banner = el(
      'div',
      { className: 'shop-a-car-editing' },
      el('p', {}, el('strong', {}, `Modifying request ${editing.id}`), ' — update the details below and click Update Request.'),
    );
    if (editing.attachments?.length) {
      banner.append(el('p', {}, `Attached: ${editing.attachments.join(', ')}. Choose files only to replace them.`));
    }
    if (detailsPage) {
      banner.append(el('p', {}, el('a', { href: resolveSitePath(`${detailsPage}?id=${encodeURIComponent(editing.id)}`) }, 'Cancel and return to the request')));
    }
    form.prepend(banner);
  } else if (editId) {
    showStatus(form, `Request ${editId} couldn't be found on this device. You can submit a new request below.`);
  }
  if (draft) {
    restoreDraft(form, draft);
    const discard = el('button', { type: 'button', className: 'shop-a-car-link-button' }, 'Discard draft');
    discard.addEventListener('click', () => {
      localStorage.removeItem(DRAFT_KEY);
      form.reset();
      ALL_FIELDS.forEach((field) => field.type !== 'radio' && setError(form, field, ''));
      renderFiles(form);
      showStatus(form, 'Draft discarded.');
    });
    showStatus(form, `Restored your draft saved ${savedTime(draft.savedAt)}.`, discard);
  }

  ALL_FIELDS.forEach((field) => {
    const control = form.elements[field.name];
    if (field.type === 'radio') return;
    control.addEventListener('blur', () => { if (control.value) validateField(form, field); });
    control.addEventListener(field.type === 'select' || field.type === 'file' ? 'change' : 'input', () => {
      if (field.type === 'file') renderFiles(form);
      if (control.closest('.shop-a-car-field-invalid') || field.type === 'file') validateField(form, field);
    });
  });

  form.querySelector('.shop-a-car-save')?.addEventListener('click', () => {
    saveDraft(form);
    const note = form.elements.attachments.files.length ? ' Attachments are not saved with drafts.' : '';
    showStatus(form, `Draft saved ${savedTime(Date.now())}. You can finish this request later on this device.${note}`);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) {
      showStatus(form, 'Please correct the highlighted fields.');
      return;
    }
    const submit = form.querySelector('.shop-a-car-submit');
    submit.disabled = true;
    submit.textContent = editing ? 'Updating…' : 'Submitting…';
    try {
      await send(form, action);
      const request = saveRequest(form, editing);
      if (!editing) localStorage.removeItem(DRAFT_KEY);
      if (detailsPage) {
        window.location.assign(detailsUrl(request, editing ? 'updated' : 'submitted'));
        return;
      }
      const panel = buildConfirmation(message, request, () => {
        if (editing) {
          // leave modify mode for a fresh request
          window.location.assign(window.location.pathname);
          return;
        }
        form.reset();
        renderFiles(form);
        showStatus(form, '');
        panel.replaceWith(form);
        content.classList.remove('shop-a-car-done');
        form.elements.railcarNumber.focus();
      }, !!editing);
      form.replaceWith(panel);
      content.classList.add('shop-a-car-done');
      panel.focus();
      panel.scrollIntoView({ block: 'start' });
    } catch (err) {
      showStatus(form, 'Your request could not be submitted. Please try again, or save it for later.');
    } finally {
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  });
}
