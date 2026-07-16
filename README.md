# SI Inter Pack Operations Control

Angular 20 prototype for plant-floor tracking, corporate intelligence, master data, dispatch and reporting across SI Inter Pack's 15-plant network.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200`. Use the role selector in the top-right user control to switch between Corporate Admin, Plant Operator and Sales views.

## Included workflows

- Corporate KPI dashboard with ApexCharts and plant drill-down
- Camera barcode/QR scan flow with manual fallback, validation, offline queue, retry and undo
- Plant and article CRUD with dedicated forms, validation, sorting, search and pagination
- Filter-reactive sales and dispatch ledger with CSV export
- Reports catalogue with a working Plant-wise Production report, CSV and print/PDF output
- Signal-based mock data stores with 15 plants, 12 articles and realistic dispatch activity

## Verification

```bash
npm run build
```

`scripts/visual-check.mjs` runs the key browser paths against a local dev server using the installed Chrome browser and writes temporary screenshots to `artifacts/`.

