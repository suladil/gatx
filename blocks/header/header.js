/*
 * Header block
 * Reads the nav fragment (content/nav.plain.html) and lays it out as:
 *   utility bar | brand, account, partner links, lookup form | tab navigation
 * All copy, links and images come from the fragment; this file only adds
 * structure, the lookup form controls, and menu behavior.
 */

// order of the top-level sections in the nav fragment
const SECTION_ROLES = ['utility', 'brand', 'account', 'partners', 'lookup', 'tabs'];

// full header layout (visible tabs) starts at this width
const isDesktop = window.matchMedia('(width >= 900px)');

/**
 * Fetches the nav fragment. /content/nav.plain.html is served locally,
 * /nav.plain.html on DA/EDS.
 * @returns {Promise<Element|null>} wrapper holding the fragment sections
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = await resp.text();

  // resolve relative image paths against the fragment location
  wrapper.querySelectorAll('img').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), resp.url).href;
  });
  return wrapper;
}

/**
 * Normalizes a path so /content/portal and /portal compare equal.
 * @param {string} href
 * @returns {string}
 */
function normalizePath(href) {
  const { pathname } = new URL(href, window.location.href);
  return pathname.replace(/^\/content(?=\/)/, '').replace(/(\.plain)?\.html$/, '').replace(/\/$/, '') || '/';
}

/**
 * Marks the tab whose link points at the current page.
 * @param {Element} tabs
 */
function markActiveTab(tabs) {
  const current = normalizePath(window.location.href);
  tabs.querySelector('ul')?.classList.add('nav-list');
  tabs.querySelectorAll('a').forEach((a) => {
    a.classList.add('nav-trigger');
    const href = a.getAttribute('href');
    if (href && !href.startsWith('#') && normalizePath(a.href) === current) {
      a.setAttribute('aria-current', 'page');
      a.closest('li').classList.add('active');
    }
  });
}

/**
 * Turns the lookup section into a form.
 * Content model: heading = title, list items = prefix options,
 * plain paragraph = input placeholder, bold paragraph = button label.
 * @param {Element} section
 */
function buildLookupForm(section) {
  const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
  const options = [...section.querySelectorAll('li')].map((li) => li.textContent.trim());
  const paragraphs = [...section.querySelectorAll('p')];
  const buttonPara = paragraphs.find((p) => p.querySelector('strong, b'));
  const placeholderPara = paragraphs.find((p) => p !== buttonPara);

  const form = document.createElement('form');
  form.className = 'nav-lookup-form';
  form.setAttribute('role', 'search');
  form.addEventListener('submit', (e) => e.preventDefault());

  const title = heading ? heading.textContent.trim() : '';
  const inputId = 'nav-lookup-input';

  if (options.length) {
    const select = document.createElement('select');
    select.setAttribute('aria-label', `${title} prefix`);
    options.forEach((label) => select.append(new Option(label, label)));
    form.append(select);
  }

  const label = document.createElement('label');
  label.className = 'nav-visually-hidden';
  label.htmlFor = inputId;
  label.textContent = placeholderPara ? placeholderPara.textContent.trim() : title;
  const input = document.createElement('input');
  input.id = inputId;
  input.type = 'search';
  input.placeholder = label.textContent;
  form.append(label, input);

  if (buttonPara) {
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = buttonPara.textContent.trim();
    form.append(button);
  }

  const titleEl = document.createElement('p');
  titleEl.className = 'nav-lookup-title';
  titleEl.textContent = title;

  section.replaceChildren(titleEl, form);
}

/**
 * Opens or closes the mobile menu.
 * @param {Element} nav
 * @param {boolean} [force] desired state
 */
function toggleMenu(nav, force) {
  const expanded = force !== undefined ? force : nav.getAttribute('aria-expanded') !== 'true';
  nav.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const button = nav.querySelector('.nav-hamburger button');
  button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  button.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
  document.body.style.overflowY = expanded && !isDesktop.matches ? 'hidden' : '';
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  block.textContent = '';
  if (!fragment) return;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');

  const sections = {};
  [...fragment.children].forEach((section, i) => {
    const role = SECTION_ROLES[i] || `section-${i}`;
    section.classList.add(`nav-${role}`);
    sections[role] = section;
  });

  if (sections.lookup) buildLookupForm(sections.lookup);
  if (sections.tabs) markActiveTab(sections.tabs);

  // utility bar spans the full width above the main bar
  const utility = document.createElement('div');
  utility.className = 'nav-utility-bar';
  const utilityInner = document.createElement('div');
  utilityInner.className = 'nav-inner';
  if (sections.utility) utilityInner.append(sections.utility);
  utility.append(utilityInner);

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav-menu" aria-expanded="false" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.querySelector('button').addEventListener('click', () => toggleMenu(nav));

  // everything except the logo collapses into the mobile menu
  const menu = document.createElement('div');
  menu.className = 'nav-menu';
  menu.id = 'nav-menu';
  ['tabs', 'account', 'lookup', 'partners'].forEach((role) => {
    if (sections[role]) menu.append(sections[role]);
  });

  const main = document.createElement('div');
  main.className = 'nav-main-bar';
  const mainInner = document.createElement('div');
  mainInner.className = 'nav-inner';
  if (sections.brand) mainInner.append(sections.brand);
  mainInner.append(hamburger, menu);
  main.append(mainInner);

  nav.append(utility, main);
  nav.setAttribute('aria-expanded', 'false');

  // close the menu with Escape
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && nav.getAttribute('aria-expanded') === 'true') {
      toggleMenu(nav, false);
      hamburger.querySelector('button').focus();
    }
  });

  // reset the mobile menu when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => toggleMenu(nav, false));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
