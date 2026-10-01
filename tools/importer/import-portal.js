/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import tableAlertsParser from './parsers/table-alerts.js';
import tableTotalsParser from './parsers/table-totals.js';
import cardsContactParser from './parsers/cards-contact.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/gatx-cleanup.js';
import sectionsTransformer from './transformers/gatx-sections.js';

// PARSER REGISTRY
const parsers = {
  'table-alerts': tableAlertsParser,
  'table-totals': tableTotalsParser,
  'cards-contact': cardsContactParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'portal',
  description: 'GATX customer portal home dashboard: 4-column grid of widget panels (fleet alerts, quick search, fleet/maintenance/compliance tables, service team contacts)',
  urls: [
    'http://localhost:8765/portal/',
  ],
  blocks: [
    {
      name: 'table-alerts',
      instances: ['.widget.fleet-alerts table'],
    },
    {
      name: 'table-totals',
      instances: ['.widget.leased-fleet table', '.widget.maintenance table', '.widget.compliance table'],
    },
    {
      name: 'cards-contact',
      instances: ['.widget.service-team .team-member'],
    },
  ],
  sections: [
    {
      id: '1',
      name: 'Fleet Alerts',
      selector: ['.widget.fleet-alerts'],
      style: 'widget',
      blocks: ['table-alerts'],
      defaultContent: ['.widget.fleet-alerts > h2', '.widget.fleet-alerts > p.as-of'],
    },
    {
      id: '2',
      name: 'Quick Search',
      selector: ['.widget.quick-search'],
      style: 'widget',
      blocks: [],
      defaultContent: ['.widget.quick-search > h2', '.widget.quick-search > form', '.widget.quick-search > ul'],
    },
    {
      id: '3',
      name: 'Leased Fleet',
      selector: ['.widget.leased-fleet'],
      style: 'widget',
      blocks: ['table-totals'],
      defaultContent: ['.widget.leased-fleet > h2', '.widget.leased-fleet > p'],
    },
    {
      id: '4',
      name: 'Your Service Team',
      selector: ['.widget.service-team'],
      style: 'widget, tall',
      blocks: ['cards-contact'],
      defaultContent: ['.widget.service-team > h2', '.widget.service-team > p'],
    },
    {
      id: '5',
      name: 'News & Resources',
      selector: ['.widget.news'],
      style: 'widget',
      blocks: [],
      defaultContent: ['.widget.news > h2', '.widget.news > p', '.widget.news > h3'],
    },
    {
      id: '6',
      name: 'Maintenance',
      selector: ['.widget.maintenance'],
      style: 'widget',
      blocks: ['table-totals'],
      defaultContent: ['.widget.maintenance > h2', '.widget.maintenance > p'],
    },
    {
      id: '7',
      name: 'Compliance Full Service',
      selector: ['.widget.compliance'],
      style: 'widget',
      blocks: ['table-totals'],
      defaultContent: ['.widget.compliance > h2', '.widget.compliance > p'],
    },
  ],
};

// The source URL is a local stand-in rebuilt from a screenshot; the target page is /portal.
const TARGET_PATH = '/portal';

// TRANSFORMER REGISTRY - section transformer runs after cleanup
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. beforeTransform transformers (initial cleanup, section markers)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block, skipping elements already replaced by an earlier parser
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform transformers (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // Images cropped from the screenshot live in the project (/images/portal/), not on the
    // local stand-in source host, so keep them root-relative.
    const sourceHost = new URL(params.originalURL).host;
    main.querySelectorAll('img').forEach((img) => {
      const src = new URL(img.getAttribute('src'), params.originalURL);
      if (src.host === sourceHost) img.setAttribute('src', src.pathname);
    });

    // 6. Target path
    const path = WebImporter.FileUtils.sanitizePath(TARGET_PATH);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
