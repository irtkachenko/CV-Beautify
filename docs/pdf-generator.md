# PDF Generation

This project generates PDFs using a **browser print flow**.

## Entry points

- `client/src/lib/pdf-generator-fixed.ts` (current flow)
- `client/src/lib/pdf-generator.ts` (legacy/alternative)

## How it works (current)

- The app either:
  - opens a new window and mounts prepared HTML into it (`generatePdfFromUrl`), or
  - clones an existing element into a print window (`generatePdfFromElement`).
- Styles are cloned into the print document.
- A small print stylesheet enforces `@page { size: A4; margin: 0; }` and forces color adjustments.
- Pagination helpers (`applyPrintPagination`) insert spacer blocks to avoid cutting important blocks at page boundaries.

## Notes / invariants

- Printing relies on the browser. There is no server-side PDF renderer here.
- For authenticated HTML fetch, `generatePdfFromUrl` uses `authedFetch`.
