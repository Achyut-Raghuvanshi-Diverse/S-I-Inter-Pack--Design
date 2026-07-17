import { chromium } from 'playwright-core';
import { statSync } from 'node:fs';

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const appUrl = process.env.VISUAL_BASE_URL ?? 'http://localhost:4200';
const results = [];
const errors = [];
const checks = [];

function check(name, pass, detail = '') {
  checks.push({ name, pass, detail });
}

async function chooseMenuOption(page, comboboxName, optionName) {
  await page.getByRole('combobox', { name: comboboxName }).click();
  await page.getByRole('option', { name: new RegExp(optionName, 'i') }).click();
  await page.waitForTimeout(75);
}

async function chooseDemoRole(page, optionName) {
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitemradio', { name: new RegExp(optionName, 'i') }).click();
  await page.waitForTimeout(75);
}

async function inspect(name, path, viewport, action) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(() => sessionStorage.setItem('si-demo-session', 'aditya.mehra@siinterpack.in'));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${name}: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  await page.goto(`${appUrl}${path}`, { waitUntil: 'networkidle' });
  if (action) await action(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth, title: document.title, lazyChunks: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('chunk-')).length }));
  results.push({ name, ...dimensions, overflow: dimensions.document > dimensions.viewport });
  await page.close();
}

const loginPage = await browser.newPage({ viewport: { width: 1920, height: 912 } });
loginPage.on('pageerror', (error) => errors.push(`login: ${error.message}`));
await loginPage.goto(`${appUrl}/dashboard`, { waitUntil: 'networkidle' });
check('Protected routes redirect to login', loginPage.url().includes('/login?returnUrl='));
check('Login exposes three selectable demo accounts', await loginPage.locator('.demo-account').count() === 3);
await loginPage.screenshot({ path: 'artifacts/login-desktop.png', fullPage: true });
const loginLayout = await loginPage.evaluate(() => ({ viewportHeight: innerHeight, documentHeight: document.documentElement.scrollHeight, footerBottom: Math.round(document.querySelector('.login-card footer')?.getBoundingClientRect().bottom ?? 9999) }));
check('Login fits desktop without a page scroller', loginLayout.documentHeight <= loginLayout.viewportHeight && loginLayout.footerBottom <= loginLayout.viewportHeight, JSON.stringify(loginLayout));
check('Login does not expose a theme toggle', await loginPage.locator('.login-theme').count() === 0);
await loginPage.locator('#login-email').fill('unknown@siinterpack.in');
await loginPage.locator('#login-password').fill('Incorrect');
await loginPage.getByRole('button', { name: 'Sign in securely' }).click();
await loginPage.locator('.login-error').waitFor();
check('Invalid login shows an accessible error', await loginPage.getByRole('alert').isVisible());
await loginPage.getByRole('button', { name: 'Use Plant Operator demo account' }).click();
check('Demo account fills credentials', await loginPage.locator('#login-email').inputValue() === 'rakesh.yadav@siinterpack.in' && await loginPage.locator('#login-password').inputValue() === 'Plant@2026');
await loginPage.getByRole('button', { name: 'Sign in securely' }).click();
await loginPage.waitForURL(/plant\/dashboard$/);
check('Demo login opens role landing page', loginPage.url().endsWith('/plant/dashboard'));
await loginPage.locator('.theme-toggle').click();
await loginPage.getByRole('button', { name: 'Open account menu' }).click();
await loginPage.getByRole('menuitem', { name: /Sign out/i }).click();
await loginPage.waitForURL(/login\?signedOut=true/);
await loginPage.locator('.session-message').waitFor();
check('Sign out clears the session', await loginPage.locator('.session-message').isVisible());
const loginTheme = await loginPage.locator('.login-page').evaluate((element) => ({ colorScheme: getComputedStyle(element).colorScheme, surface: getComputedStyle(element).getPropertyValue('--surface-page').trim() }));
check('Login remains light after signing out from dark mode', loginTheme.colorScheme === 'light' && loginTheme.surface === '#f5f6fa', JSON.stringify(loginTheme));
await loginPage.close();

const mobileLoginPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobileLoginPage.goto(`${appUrl}/login`, { waitUntil: 'networkidle' });
await mobileLoginPage.screenshot({ path: 'artifacts/login-mobile.png', fullPage: true });
const mobileLoginWidth = await mobileLoginPage.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
check('Login is responsive on mobile', mobileLoginWidth.document <= mobileLoginWidth.viewport && await mobileLoginPage.locator('.demo-account').count() === 3, JSON.stringify(mobileLoginWidth));
await mobileLoginPage.close();

await inspect('corporate-overview', '/dashboard', { width: 1440, height: 900 }, async (page) => {
  await page.waitForTimeout(500);
  check('Routes expose descriptive document titles', (await page.title()).includes('Corporate Dashboard'));
  check('Keyboard users have a skip link', await page.getByRole('link', { name: 'Skip to main content' }).count() === 1);
});

await inspect('theme-dark-collapsed', '/dashboard', { width: 1440, height: 900 }, async (page) => {
  const before = await page.locator('html').getAttribute('data-theme');
  await page.locator('.theme-toggle').click();
  await page.waitForTimeout(250);
  const changed = await page.locator('html').getAttribute('data-theme');
  check('Theme toggle changes mode', before !== changed, `${before} -> ${changed}`);
  await page.reload({ waitUntil: 'networkidle' });
  check('Theme preference persists', await page.locator('html').getAttribute('data-theme') === changed);
  await page.locator('.desktop-sidebar-toggle').click();
  await page.waitForTimeout(300);
  const shellState = await page.evaluate(() => ({ collapsed: document.querySelector('.app-frame')?.classList.contains('sidebar-collapsed'), sidebarWidth: document.querySelector('.sidebar')?.getBoundingClientRect().width ?? 999 }));
  check('Sidebar collapses smoothly', !!shellState.collapsed && shellState.sidebarWidth < 100, JSON.stringify(shellState));
});

await inspect('role-menu-desktop', '/dashboard', { width: 1280, height: 800 }, async (page) => {
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.waitForTimeout(75);
  check('Account menu exposes workspace switching and logout', await page.locator('.role-menu').isVisible() && await page.getByRole('menuitemradio', { name: /Plant Operator/i }).isVisible() && await page.getByRole('menuitem', { name: /Sign out/i }).isVisible());
});

await inspect('notifications-desktop', '/dashboard', { width: 1280, height: 800 }, async (page) => {
  await page.getByRole('button', { name: 'Notifications' }).click();
  const panel = page.getByLabel('Notification centre');
  await panel.waitFor();
  const copy = await panel.innerText();
  check('Notification centre uses rich alert cards', await panel.locator('.notification-card').count() === 3);
  check('Notification centre reflects live app totals', copy.includes('39,065 records available') && copy.includes('403 items below reorder level'), copy);
});

await inspect('notifications-mobile', '/dashboard', { width: 390, height: 844 }, async (page) => {
  await page.getByRole('button', { name: 'Notifications' }).click();
  const panel = page.getByLabel('Notification centre');
  await panel.waitFor();
  const box = await panel.boundingBox();
  check('Notification centre fits mobile viewport', !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, JSON.stringify(box));
  await panel.getByRole('button', { name: 'Mark all as read' }).click();
  await page.waitForTimeout(75);
  check('Notifications can be marked as read', await page.locator('.notification-count').count() === 0 && (await panel.innerText()).toLowerCase().includes('all caught up'));
});

await inspect('dropdown-menu-desktop', '/barcode-records', { width: 1280, height: 800 }, async (page) => {
  await page.getByRole('combobox', { name: 'Filter barcode records by plant' }).click();
  await page.getByRole('searchbox', { name: 'Search options' }).fill('Pune');
  await page.waitForTimeout(75);
  check('Shared dropdown is custom and searchable', await page.locator('.select-popover').isVisible() && await page.locator('select').count() === 0);
});

await inspect('dashboard-desktop', '/dashboard', { width: 1440, height: 900 }, async (page) => {
  await chooseMenuOption(page, 'Plant', 'Pune Plant 1');
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

await inspect('scan-desktop', '/scan', { width: 1280, height: 800 }, async (page) => {
  const recentMetrics = await page.locator('.recent-panel').evaluate((panel) => {
    const list = panel.querySelector('.recent-list');
    return { height: panel.getBoundingClientRect().height, clientHeight: list?.clientHeight ?? 0, scrollHeight: list?.scrollHeight ?? 0 };
  });
  check('Recent scans has a fixed desktop height', Math.round(recentMetrics.height) === 445, JSON.stringify(recentMetrics));
  check('Recent scans uses a contained scroller', recentMetrics.scrollHeight > recentMetrics.clientHeight, JSON.stringify(recentMetrics));
});

await inspect('scan-mobile', '/scan', { width: 390, height: 844 }, async (page) => {
  const mobileRecent = await page.locator('.recent-panel').evaluate((panel) => ({ height: panel.getBoundingClientRect().height, listOverflow: (panel.querySelector('.recent-list')?.scrollHeight ?? 0) > (panel.querySelector('.recent-list')?.clientHeight ?? 0) }));
  check('Recent scans remains fixed and scrollable on mobile', Math.round(mobileRecent.height) === 420 && mobileRecent.listOverflow, JSON.stringify(mobileRecent));
  const firstAction = page.getByRole('button', { name: /Continue to scan/i });
  await firstAction.scrollIntoViewIfNeeded();
  const tapDebug = await firstAction.evaluate((target) => { const box = target.getBoundingClientRect(); const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2); return { box: { top: box.top, bottom: box.bottom }, hit: hit?.tagName, hitClass: hit?.getAttribute('class'), unobstructed: !!hit && target.contains(hit) }; });
  check('Scan primary tap target geometry', tapDebug.unobstructed, JSON.stringify(tapDebug));
  await firstAction.click({ force: true });
  const manualCode = page.getByPlaceholder('Type barcode or article code');
  await manualCode.waitFor();
  check('Scan step has manual fallback', await manualCode.isVisible());
  await manualCode.fill('8904123001018');
  await page.getByRole('button', { name: 'Continue', exact: true }).click({ force: true });
  await page.getByRole('button', { name: /Confirm & save/i }).click({ force: true });
  check('Scan success feedback', await page.getByText('Barcode saved', { exact: true }).isVisible());
});

await inspect('barcode-records-desktop', '/barcode-records', { width: 1280, height: 800 }, async (page) => {
  check('Corporate sees barcode records from all plants', await page.locator('.data-table tbody tr').count() === 10);
  check('Barcode history contains 15,000 records', (await page.locator('app-pagination').innerText()).includes('15000'));
  await chooseMenuOption(page, 'Filter barcode records by plant', 'Gurgaon Plant 1');
  check('Corporate can filter barcode records by plant', await page.locator('.data-table tbody tr').count() === 10);
  await page.getByRole('combobox', { name: 'Filter barcode records by year' }).click();
  await page.getByRole('option', { name: '2020', exact: true }).click();
  await page.waitForTimeout(75);
  check('Barcode history is discoverable from 2020', await page.locator('.data-table tbody tr').count() === 10);
  check('Barcode records use standard pagination', await page.locator('app-pagination').count() === 1);
});

await inspect('barcode-records-mobile', '/barcode-records', { width: 390, height: 844 }, async (page) => {
  check('Barcode records fit mobile viewport', await page.locator('.barcode-table-panel').isVisible());
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
  const deletePlantButton = page.getByRole('button', { name: 'Delete plant' }).first();
  await deletePlantButton.click();
  await page.getByRole('dialog').waitFor();
  check('Destructive actions use an accessible confirmation dialog', await page.getByRole('heading', { name: /Delete .* Plant/i }).isVisible());
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(75);
  check('Modal returns focus to its trigger', await deletePlantButton.evaluate((button) => document.activeElement === button));
});

await inspect('plant-modal-mobile', '/master-data/plants', { width: 390, height: 844 }, async (page) => {
  await page.getByRole('button', { name: 'Add new plant' }).click();
  await page.getByRole('dialog').waitFor();
  check('Modal fits mobile viewport', await page.getByRole('dialog').evaluate((dialog) => dialog.getBoundingClientRect().width <= innerWidth && dialog.getBoundingClientRect().height <= innerHeight));
  await page.getByRole('combobox', { name: 'Operating status' }).click();
  const dropdownBox = await page.locator('.select-popover').boundingBox();
  check('Form dropdown fits mobile viewport', !!dropdownBox && dropdownBox.x >= 0 && dropdownBox.y >= 0 && dropdownBox.x + dropdownBox.width <= 390 && dropdownBox.y + dropdownBox.height <= 844);
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
  check('Orders contain 8,000 historical records', (await page.locator('app-pagination').innerText()).includes('8000'));
  await page.getByRole('button', { name: 'Add order' }).click();
  await page.getByRole('dialog').waitFor();
  check('Add order opens in a modal', await page.getByRole('heading', { name: 'Add order' }).isVisible());
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Open order' }).first().click();
  await page.getByRole('dialog').waitFor();
  check('Edit order opens in a modal', await page.getByRole('heading', { name: 'Edit order' }).isVisible());
  await page.locator('app-search-select[formcontrolname="status"]').getByRole('combobox').click();
  await page.getByRole('option', { name: /^In Production$/i }).click();
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
    const expectedTotal = name === 'inventory-list' ? '2500' : '12000';
    check(`${name} exposes the full historical dataset`, (await page.locator('app-pagination').innerText()).includes(expectedTotal), expectedTotal);
    if (name === 'inventory-list') {
      await page.getByRole('button', { name: 'Add stock record' }).click();
      await page.getByRole('dialog').waitFor();
      check('Add stock record opens in a modal', await page.getByRole('heading', { name: 'Add stock record' }).isVisible());
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Edit stock record' }).first().click();
      await page.getByRole('dialog').waitFor();
      check('Edit stock record opens in a modal', await page.getByRole('heading', { name: 'Edit stock record' }).isVisible());
    }
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
  await page.getByRole('tab', { name: /Article-wise Sales/ }).click();
  await page.getByRole('columnheader', { name: 'Orders' }).waitFor();
  const allArticleRows = await page.locator('app-pagination').innerText();
  await chooseMenuOption(page, 'Filter report by product category', 'Seat covers');
  await page.waitForTimeout(100);
  const seatCoverRows = await page.locator('app-pagination').innerText();
  check('Report product category filter changes the dataset', allArticleRows.includes('300') && seatCoverRows.includes('75'), `${allArticleRows} -> ${seatCoverRows}`);
  await chooseMenuOption(page, 'Filter report by product category', 'All product categories');
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
await rolePage.addInitScript(() => sessionStorage.setItem('si-demo-session', 'aditya.mehra@siinterpack.in'));
rolePage.on('pageerror', (error) => errors.push(`roles: ${error.message}`));
await rolePage.goto(`${appUrl}/dashboard`, { waitUntil: 'networkidle' });
await chooseDemoRole(rolePage, 'Plant Operator');
await rolePage.waitForURL(/plant\/dashboard$/);
check('Plant Operator lands on My Plant', rolePage.url().endsWith('/plant/dashboard'));
check('Plant Operator nav has three work links', await rolePage.locator('.nav-list a').count() === 3);
check('Plant dashboard hides other plants', !(await rolePage.locator('body').innerText()).includes('Pune Plant'));
await rolePage.evaluate(() => { history.pushState({}, '', '/plant/dashboard/4'); window.dispatchEvent(new PopStateEvent('popstate')); });
await rolePage.waitForURL(/plant\/dashboard$/);
check('Plant scope guard blocks another plant', rolePage.url().endsWith('/plant/dashboard'));
await rolePage.evaluate(() => { history.pushState({}, '', '/scan'); window.dispatchEvent(new PopStateEvent('popstate')); });
await rolePage.waitForURL(/\/scan$/);
await rolePage.getByText('Your assigned plant').waitFor();
const operatorScanText = await rolePage.locator('app-scan').innerText();
check('Operator plant is automatic and locked', await rolePage.getByRole('combobox', { name: 'Select this device’s plant' }).count() === 0 && operatorScanText.includes('The plant is set automatically and cannot be changed.'));
await rolePage.evaluate(() => { history.pushState({}, '', '/barcode-records'); window.dispatchEvent(new PopStateEvent('popstate')); });
await rolePage.waitForURL(/barcode-records$/);
await rolePage.getByText('My plant records').waitFor();
check('Operator barcode records are plant locked', await rolePage.getByRole('combobox', { name: 'Filter barcode records by plant' }).count() === 0 && !(await rolePage.locator('body').innerText()).includes('Pune Plant'));

await chooseDemoRole(rolePage, 'Sales');
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
