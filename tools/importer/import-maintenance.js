/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import accordionFiltersParser from './parsers/accordion-filters.js';
import tableReportParser from './parsers/table-report.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/gatx-cleanup.js';
import sectionsTransformer from './transformers/gatx-sections.js';

// PARSER REGISTRY
const parsers = {
  'accordion-filters': accordionFiltersParser,
  'table-report': tableReportParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "maintenance",
  "urls": [
    "http://localhost:8765/maintenance/",
    "http://localhost:8765/car-facts/"
  ],
  "description": "GATX portal report pages (Maintenance - Service Events, Car Facts - Car Location Messages): page title band, report filters sidebar, one or two wide data-table report panels",
  "blocks": [
    {
      "name": "accordion-filters",
      "instances": [
        ".filters .group"
      ]
    },
    {
      "name": "table-report",
      "instances": [
        ".report table"
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
      "name": "Report Filters Sidebar",
      "selector": [
        "aside.filters"
      ],
      "style": "widget, tall, report-filters",
      "blocks": [
        "accordion-filters"
      ],
      "defaultContent": [
        ".filters h2",
        ".filters .hint",
        ".filters .actions",
        ".filters .shortcut"
      ]
    },
    {
      "id": "3",
      "name": "Service Events Report",
      "selector": [
        "section.report"
      ],
      "style": "widget, report",
      "blocks": [
        "table-report"
      ],
      "defaultContent": [
        ".report .report-tools",
        ".report .intro",
        ".report .pager"
      ]
    },
    {
      "id": "4",
      "name": "Second Report Panel",
      "selector": [
        "section.report + section.report"
      ],
      "style": "widget, report",
      "blocks": [
        "table-report"
      ],
      "defaultContent": [
        ".report + .report .report-tools"
      ]
    }
  ]
};


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
    // Stand-in source URLs mirror the target page paths (e.g. /car-facts/ imports to /car-facts)
    const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

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
