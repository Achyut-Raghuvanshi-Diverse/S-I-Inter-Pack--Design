import { chromium } from 'playwright-core';

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
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth, title: document.title, lazyChunks: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('chunk-')).length }));
  results.push({ name, ...dimensions, overflow: dimensions.document > dimensions.viewport });
  await page.close();
}

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
  await page.locator('[formcontrolname="code"]').fill('QAOEM');
  await page.locator('[formcontrolname="name"]').fill('QA Vehicle Systems');
  await page.locator('[formcontrolname="gstin"]').fill('06ABCDE1234F1Z5');
  await page.locator('[formcontrolname="contact"]').fill('Karan Singh');
  await page.locator('[formcontrolname="phone"]').fill('+91 98100 11122');
  await page.locator('[formcontrolname="city"]').fill('Gurgaon');
  await page.getByRole('button', { name: 'Add customer' }).click();
  await page.waitForTimeout(350);
  await page.getByPlaceholder(/Search customers/i).fill('QA Vehicle');
  check('Customer create and redirect', await page.getByText('QA Vehicle Systems', { exact: true }).isVisible());
  check('Shared save toast', await page.getByText('Customer saved', { exact: true }).isVisible());
});

await inspect('orders-desktop', '/master-data/orders', { width: 1366, height: 800 }, async (page) => {
  await page.getByRole('button', { name: 'Open order' }).first().click();
  await page.locator('[formcontrolname="status"]').selectOption('In Production');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.waitForTimeout(350);
  check('Sales order edit flow', await page.getByText('Order saved', { exact: true }).isVisible());
});

for (const [name, path] of [
  ['plants-list', '/master-data/plants'], ['articles-list', '/master-data/articles'],
  ['inventory-list', '/master-data/inventory'], ['users-list', '/master-data/users'],
  ['sales-ledger', '/sales'], ['reports', '/reports'],
]) {
  await inspect(name, path, { width: 1280, height: 800 });
}

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
await rolePage.getByText('What is happening to this article?').waitFor();
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
