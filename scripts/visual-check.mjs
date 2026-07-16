import { chromium } from 'playwright-core';
import { statSync } from 'node:fs';

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results = [];
const errors = [];
const checks = [];

function check(name, pass, detail = '') {
  checks.push({ name, pass, detail });
}

async function inspect(name, path, viewport, action) {
  const page = await browser.newPage({ viewport });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${name}: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  await page.goto(`http://127.0.0.1:4200${path}`, { waitUntil: 'networkidle' });
  if (action) await action(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth, title: document.title, lazyChunks: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('chunk-')).length }));
  results.push({ name, ...dimensions, overflow: dimensions.document > dimensions.viewport });
  await page.close();
}

await inspect('corporate-overview', '/dashboard', { width: 1440, height: 900 }, async (page) => {
  await page.waitForTimeout(500);
});

await inspect('theme-dark-collapsed', '/dashboard', { width: 1440, height: 900 }, async (page) => {
  const before = await page.locator('html').getAttribute('data-theme');
  await page.locator('.theme-toggle').click();
  await page.waitForTimeout(250);
  const changed = await page.locator('html').getAttribute('data-theme');
  check('Theme toggle changes mode', before !== changed, `${before} -> ${changed}`);
  await page.reload({ waitUntil: 'networkidle' });
  check('Theme preference persists', await page.locator('html').getAttribute('data-theme') === changed);
  await page.locator('.collapse-nav').click();
  await page.waitForTimeout(300);
  const shellState = await page.evaluate(() => ({ collapsed: document.querySelector('.app-frame')?.classList.contains('sidebar-collapsed'), sidebarWidth: document.querySelector('.sidebar')?.getBoundingClientRect().width ?? 999 }));
  check('Sidebar collapses smoothly', !!shellState.collapsed && shellState.sidebarWidth < 100, JSON.stringify(shellState));
});

await inspect('dashboard-desktop', '/dashboard', { width: 1440, height: 900 }, async (page) => {
  await page.selectOption('.filter-bar select[aria-label="Plant"]', '4');
  await page.getByRole('button', { name: /Open PNQ-01 dashboard/i }).click();
  await page.waitForURL(/plant\/dashboard\/4/);
  await page.waitForTimeout(500);
  check('Corporate plant drill-down', (await page.locator('body').innerText()).includes('Pune Plant 1'));
});

await inspect('plant-dashboard-tablet', '/plant/dashboard/1', { width: 768, height: 1024 }, async (page) => {
  check('Plant dashboard charts render', await page.locator('apx-chart').count() === 2);
  await page.getByRole('button', { name: '30 days' }).click();
  await page.waitForTimeout(500);
});

await inspect('scan-desktop', '/scan', { width: 1280, height: 800 });

await inspect('scan-mobile', '/scan', { width: 390, height: 844 }, async (page) => {
  const firstAction = page.getByRole('button', { name: /Continue to stage/i });
  await firstAction.scrollIntoViewIfNeeded();
  const tapDebug = await firstAction.evaluate((target) => { const box = target.getBoundingClientRect(); const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2); return { box: { top: box.top, bottom: box.bottom }, hit: hit?.tagName, hitClass: hit?.getAttribute('class'), unobstructed: !!hit && target.contains(hit) }; });
  check('Scan primary tap target geometry', tapDebug.unobstructed, JSON.stringify(tapDebug));
  await firstAction.click({ force: true });
  await page.getByRole('button', { name: /Packed/i }).click({ force: true });
  await page.getByPlaceholder('e.g. SIP-SDZ-FSC-01').fill('SIP-SDZ-FSC-01');
  await page.getByRole('button', { name: 'Continue', exact: true }).click({ force: true });
  await page.getByRole('button', { name: /Record 24 units/i }).click({ force: true });
  check('Scan success feedback', await page.getByText('Scan recorded', { exact: true }).isVisible());
});

await inspect('customers-desktop', '/master-data/customers', { width: 1366, height: 800 }, async (page) => {
  await page.getByRole('button', { name: 'Add customer' }).click();
  const modal = page.locator('app-modal');
  await modal.getByRole('dialog').waitFor();
  check('Customer create opens modal', await modal.getByRole('dialog').isVisible());
  await modal.locator('[formcontrolname="code"]').fill('QAOEM');
  await modal.locator('[formcontrolname="name"]').fill('QA Vehicle Systems');
  await modal.locator('[formcontrolname="gstin"]').fill('06ABCDE1234F1Z5');
  await modal.locator('[formcontrolname="contact"]').fill('Karan Singh');
  await modal.locator('[formcontrolname="phone"]').fill('+91 98100 11122');
  await modal.locator('[formcontrolname="city"]').fill('Gurgaon');
  await modal.getByRole('button', { name: 'Add customer' }).click();
  await page.waitForTimeout(350);
  await page.getByPlaceholder(/Search customers/i).fill('QA Vehicle');
  check('Customer create and redirect', await page.getByText('QA Vehicle Systems', { exact: true }).isVisible());
  check('Shared save toast', await page.getByText('Customer saved', { exact: true }).isVisible());
});

await inspect('plants-list', '/master-data/plants', { width: 1280, height: 800 }, async (page) => {
  check('Plants table uses 10 rows', await page.locator('.data-table tbody tr').count() === 10);
  await page.getByRole('button', { name: 'Add new plant' }).click();
  await page.getByRole('dialog').waitFor();
  check('Plant create opens modal', await page.getByRole('dialog').isVisible());
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  check('Modal closes with Escape', await page.getByRole('dialog').count() === 0);
  await page.getByRole('button', { name: 'Edit plant' }).first().click();
  await page.getByRole('heading', { name: 'Edit plant' }).waitFor();
  check('Plant edit reuses modal', await page.getByRole('heading', { name: 'Edit plant' }).isVisible());
  await page.locator('app-modal').getByRole('button', { name: 'Cancel' }).click();
});

await inspect('plant-modal-mobile', '/master-data/plants', { width: 390, height: 844 }, async (page) => {
  await page.getByRole('button', { name: 'Add new plant' }).click();
  await page.getByRole('dialog').waitFor();
  check('Modal fits mobile viewport', await page.getByRole('dialog').evaluate((dialog) => dialog.getBoundingClientRect().width <= innerWidth && dialog.getBoundingClientRect().height <= innerHeight));
});

await inspect('articles-list', '/master-data/articles', { width: 1280, height: 800 }, async (page) => {
  check('Articles table uses 10 rows', await page.locator('.data-table tbody tr').count() === 10);
  await page.getByRole('button', { name: 'Add new article' }).click();
  await page.getByRole('dialog').waitFor();
  check('Article create opens modal', await page.getByRole('dialog').isVisible());
  await page.getByRole('searchbox', { name: 'Search producing plants' }).fill('Pune');
  check('Article plant selector is searchable', await page.locator('.checkbox-grid .check-card').count() === 2);
  await page.locator('app-modal').getByRole('button', { name: 'Cancel' }).click();
});

await inspect('users-list', '/master-data/users', { width: 1280, height: 800 }, async (page) => {
  await page.getByRole('button', { name: 'Add user' }).click();
  await page.getByRole('dialog').waitFor();
  check('User create opens modal', await page.getByRole('dialog').isVisible());
  await page.locator('app-modal').getByRole('button', { name: 'Cancel' }).click();
});

await inspect('orders-desktop', '/master-data/orders', { width: 1366, height: 800 }, async (page) => {
  await page.getByRole('button', { name: 'Open order' }).first().click();
  await page.locator('[formcontrolname="status"]').selectOption('In Production');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.waitForTimeout(350);
  check('Sales order edit flow', await page.getByText('Order saved', { exact: true }).isVisible());
});

for (const [name, path] of [
  ['inventory-list', '/master-data/inventory'], ['sales-ledger', '/sales'],
]) {
  await inspect(name, path, { width: 1280, height: 800 }, async (page) => {
    check(`${name} table uses at most 10 rows`, await page.locator('.data-table tbody tr').count() <= 10);
    check(`${name} has standard pagination`, await page.locator('app-pagination').count() === 1);
  });
}

await inspect('reports', '/reports', { width: 1280, height: 800 }, async (page) => {
  const plantFilter = page.locator('app-search-select');
  await plantFilter.getByRole('combobox', { name: 'Filter report by plant' }).click();
  await plantFilter.getByRole('searchbox', { name: 'Search options' }).fill('Pune');
  await page.waitForTimeout(100);
  const filteredOptionCount = await plantFilter.getByRole('option').count();
  check('Plant filter dropdown is searchable', filteredOptionCount === 2, String(filteredOptionCount));
  await page.keyboard.press('Escape');
  for (const report of ['Plant-wise Production', 'Article-wise Sales', 'Profitability', 'Customer-wise Sales', 'Inventory Aging']) {
    await page.getByRole('tab', { name: new RegExp(report) }).click();
    const count = await page.locator('.report-table tbody tr').count();
    check(`${report} report renders with pagination`, count > 0 && count <= 10 && await page.locator('app-pagination').count() === 1, String(count));
  }
  await page.emulateMedia({ media: 'print' });
  const printLayout = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth, reportWidth: document.querySelector('.report-output')?.scrollWidth ?? 0 }));
  check('Report print layout fits page', printLayout.documentWidth <= printLayout.viewportWidth && printLayout.reportWidth <= printLayout.viewportWidth, JSON.stringify(printLayout));
  await page.pdf({ path: 'artifacts/report-print.pdf', format: 'A4', landscape: true, printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
  check('Report PDF generated', statSync('artifacts/report-print.pdf').size > 5000);
  await page.emulateMedia({ media: 'screen' });
});

const rolePage = await browser.newPage({ viewport: { width: 768, height: 1024 } });
rolePage.on('pageerror', (error) => errors.push(`roles: ${error.message}`));
await rolePage.goto('http://127.0.0.1:4200/dashboard', { waitUntil: 'networkidle' });
await rolePage.selectOption('.user-control select', 'Plant Operator');
await rolePage.waitForURL(/plant\/dashboard$/);
check('Plant Operator lands on My Plant', rolePage.url().endsWith('/plant/dashboard'));
check('Plant Operator nav has exactly two work links', await rolePage.locator('.nav-list a').count() === 2);
check('Plant dashboard hides other plants', !(await rolePage.locator('body').innerText()).includes('Pune Plant'));
await rolePage.evaluate(() => { history.pushState({}, '', '/plant/dashboard/4'); window.dispatchEvent(new PopStateEvent('popstate')); });
await rolePage.waitForURL(/plant\/dashboard$/);
check('Plant scope guard blocks another plant', rolePage.url().endsWith('/plant/dashboard'));
await rolePage.evaluate(() => { history.pushState({}, '', '/scan'); window.dispatchEvent(new PopStateEvent('popstate')); });
await rolePage.waitForURL(/\/scan$/);
await rolePage.getByText('Choose the production stage').waitFor();
check('Operator scan skips plant selector', await rolePage.locator('app-scan select').count() === 0);

await rolePage.selectOption('.user-control select', 'Sales');
await rolePage.waitForURL(/master-data\/orders/);
check('Sales lands on purchase orders', rolePage.url().includes('/master-data/orders'));
check('Sales tailored nav', await rolePage.locator('.nav-list a').count() === 6);
await rolePage.getByRole('button', { name: 'Open order' }).first().click();
await rolePage.getByRole('button', { name: 'Cancel' }).waitFor();
check('Sales can open an order', await rolePage.getByRole('button', { name: 'Cancel' }).count() === 1);
await rolePage.getByRole('button', { name: 'Cancel' }).click();
await rolePage.getByRole('button', { name: 'Open navigation' }).click();
await rolePage.getByRole('link', { name: 'Reports centre' }).click();
await rolePage.waitForURL(/\/reports$/);
const reportDownload = rolePage.waitForEvent('download');
await rolePage.getByRole('button', { name: 'Export CSV' }).click();
check('Sales report export', !!(await reportDownload));
await rolePage.evaluate(() => { history.pushState({}, '', '/master-data/users'); window.dispatchEvent(new PopStateEvent('popstate')); });
await rolePage.waitForURL(/master-data\/orders/);
check('Sales guard blocks user administration', rolePage.url().includes('/master-data/orders'));
await rolePage.close();

await browser.close();
console.log(JSON.stringify({ results, checks, errors, passed: errors.length === 0 && checks.every((item) => item.pass) && results.every((item) => !item.overflow) }, null, 2));
