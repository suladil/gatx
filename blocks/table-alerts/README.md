# table-alerts

Custom **table** block. Purpose: Fleet Alerts status matrix of open items by action urgency.

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: first row is the header: an empty first cell, then one cell per urgency column (e.g. Immediate Action, Near Term Action); each following row is a row label (e.g. Open Orders) followed by one numeric count per urgency column. Always 3 columns.

## Supported variations

No variations.

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- A separate `-item` model defines one repeated item.
