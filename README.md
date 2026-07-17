# SI Inter Pack Operations Control

Angular 20 prototype for barcode tracking, corporate visibility, master data, dispatch and reporting across SI Inter Pack's 15-plant network.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200`. Use the role selector in the top-right user control to switch between Corporate Admin, Plant Operator and Sales views.

## Included workflows

- Corporate barcode dashboard with scan trends, plant drill-down and sync visibility
- Plant-scoped operator dashboard with barcode activity, entry methods and recent records
- Three-step Plant → Scan → Confirm barcode flow with locked operator plant, manual fallback, read-only confirmation and offline sync
- Searchable Barcode Records screen showing all plants for Corporate and only the assigned plant for Plant Operators
- Full CRUD for plants, articles, customers, purchase orders, inventory and users/roles
- Filter-reactive sales and dispatch ledger with CSV export
- Reports catalogue with a working Plant-wise Production report, CSV and print/PDF output
- Signal-based mock data stores with 39,000+ deterministic records spanning January 2020 through today
- Paginated datasets for 15,000 barcode scans, 12,000 dispatch entries, 8,000 orders, 2,500 stock records, 750 users, 500 customers and 300 articles
- Responsive notification centre with live barcode sync, reorder and historical-data alerts

## Architecture

- Standalone, lazy-loaded Angular feature components with `OnPush` change detection and signal-based view state
- Encapsulated stores that expose read-only signals and explicit mutation commands
- Memoized entity lookup maps so records remain correct when IDs are non-contiguous
- Shared accessible modal, confirmation, searchable select, pagination, validation-state and CSV export utilities
- Typed ApexCharts configuration with a shared chart theme and aggregated reporting data
- Role and plant-scope route guards, descriptive route titles and restored scroll position
- Keyboard-accessible navigation, dialogs, tables and dropdowns with reduced-motion support

## Verification

```bash
npm run build
node scripts/visual-check.mjs
```

`scripts/visual-check.mjs` audits every lazy route, the Corporate/Plant Operator/Sales guards and flows, CRUD save feedback, report export, scan touch targets, console errors and horizontal overflow from 390–1440px. It writes temporary screenshots to `artifacts/`.
