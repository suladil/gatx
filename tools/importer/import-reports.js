/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import accordionPickerParser from './parsers/accordion-picker.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/gatx-cleanup.js';
import sectionsTransformer from './transformers/gatx-sections.js';

// PARSER REGISTRY
const parsers = {
  'accordion-picker': accordionPickerParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "reports",
  "urls": [
    "http://localhost:8765/reports/"
  ],
  "description": "GATX portal report builder page: page title band, wide builder panel with column picker, stacked right sidebar panels",
  "blocks": [
    {
      "name": "accordion-picker",
      "instances": [
        ".builder .col-group"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "Page Title",
      "selector": [
        ".page-title"
      ],
      "style": "page-title",
      "blocks": [],
      "defaultContent": [
        ".page-title .section-name",
        ".page-title h1"
      ]
    },
    {
      "id": "2",
      "name": "Report Builder",
      "selector": [
        "section.builder"
      ],
      "style": "widget, report-builder",
      "blocks": [
        "accordion-picker"
      ],
      "defaultContent": [
        ".builder .user",
        ".builder h2.bar",
        ".builder .save",
        ".builder .as-of",
        ".builder .actions"
      ]
    },
    {
      "id": "3",
      "name": "Fleet Summary",
      "selector": [
        "aside.side > section.panel:first-child"
      ],
      "style": "widget, tall, report-side",
      "blocks": [],
      "defaultContent": [
        "aside.side > section.panel:first-child h2",
        "aside.side > section.panel:first-child .hint",
        "aside.side > section.panel:first-child ul"
      ]
    },
    {
      "id": "4",
      "name": "My Saved Templates",
      "selector": [
        "aside.side > section.panel.saved"
      ],
      "style": "widget, tall, report-side",
      "blocks": [],
      "defaultContent": [
        "aside.side > section.panel.saved h2"
      ]
    },
    {
      "id": "5",
      "name": "Helpful Hints",
      "selector": [
        "aside.side > section.panel.hints"
      ],
      "style": "widget, tall, report-side",
      "blocks": [],
      "defaultContent": [
        "aside.side > section.panel.hints h2",
        "aside.side > section.panel.hints ul"
      ]
    }
  ]
};

// The source URL is a local stand-in rebuilt from a screenshot; the target page is /portal.
const TARGET_PATH = '/reports';

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
