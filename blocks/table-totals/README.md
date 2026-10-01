# table-totals

Custom **table** block. Purpose: Fleet metrics by car type ending in a bold Totals row.

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: first row is the header (Car Type, then 1-3 metric column names); each following row is a car type label followed by its numbers; the LAST row is always the Totals row (label Totals plus the column totals) and renders bold. Works with 2, 3 or 4 columns.

## Supported variations

No variations.

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- A separate `-item` model defines one repeated item.
