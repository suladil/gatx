/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import requestDetailsParser from './parsers/request-details.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/gatx-cleanup.js';
import sectionsTransformer from './transformers/gatx-sections.js';

// PARSER REGISTRY
const parsers = {
  'request-details': requestDetailsParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "shop-a-car-request",
  "urls": [
    "http://localhost:8765/shop-a-car-request/"
  ],
  "description": "GATX portal Shop a Car request details page: wide request details panel with a What Happens Next sidebar panel",
  "blocks": [
    {
      "name": "request-details",
      "instances": [
        ".request-form .request-details"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "Request Details",
      "selector": [
        "section.request-form"
      ],
      "style": "widget, request-form",
      "blocks": [
        "request-details"
      ],
      "defaultContent": []
    },
    {
      "id": "2",
      "name": "What Happens Next",
      "selector": [
        "section.panel.next"
      ],
      "style": "widget, tall, report-side",
      "blocks": [],
      "defaultContent": [
        "section.panel.next h2",
        "section.panel.next ul"
      ]
    }
  ]
};

// The source URL is a local stand-in (tools/importer/sources/shop-a-car-request/); the target page is /shop-a-car-request.
const TARGET_PATH = '/shop-a-car-request';

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
