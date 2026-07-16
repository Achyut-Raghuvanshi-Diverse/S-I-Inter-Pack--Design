import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results = [];
const errors = [];

async function inspect(name, path, viewport, action) {
  const page = await browser.newPage({ viewport });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${name}: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  await page.goto(`http://127.0.0.1:4200${path}`, { waitUntil: 'networkidle' });
  if (action) await action(page);
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth, title: document.title }));
  results.push({ name, ...dimensions, overflow: dimensions.document > dimensions.viewport });
  await page.close();
}

await inspect('dashboard-desktop', '/dashboard', { width: 1440, height: 900 }, async (page) => {
  await page.selectOption('.filter-bar select[aria-label="Plant"]', '4');
  await page.waitForTimeout(350);
});

await inspect('scan-mobile', '/scan', { width: 390, height: 844 }, async (page) => {
  await page.getByRole('button', { name: /Continue to stage/i }).click();
  await page.getByRole('button', { name: /Packed/i }).click();
  await page.getByPlaceholder('e.g. SIP-SDZ-FSC-01').fill('SIP-SDZ-FSC-01');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /Record 24 units/i }).click();
  await page.waitForTimeout(200);
});

await inspect('plants-desktop', '/master-data/plants', { width: 1366, height: 800 }, async (page) => {
  await page.getByRole('button', { name: /Add plant/i }).click();
});

await inspect('reports-desktop', '/reports', { width: 1440, height: 900 });

await browser.close();
console.log(JSON.stringify({ results, errors }, null, 2));
