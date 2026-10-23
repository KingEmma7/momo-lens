import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Locator } from '@playwright/test';
import path from 'node:path';

const fixture = (name: string) => path.resolve('fixtures', name);

async function loadSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /try sample data/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function tabTo(page: Page, target: Locator) {
  for (let index = 0; index < 120; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

async function keyboardNavigate(page: Page, name: string) {
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) {
    await tabTo(page, menu);
    await page.keyboard.press('Enter');
  }
  const link = page
    .getByRole('link', { name: name === 'MoMo Wrapped' ? /^MoMo Wrapped/ : name, exact: true })
    .first();
  await tabTo(page, link);
  await page.keyboard.press('Enter');
}

async function openMenu(page: Page) {
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
}

async function navigate(page: Page, name: string) {
  await openMenu(page);
  await page
    .getByRole('link', { name: name === 'MoMo Wrapped' ? /^MoMo Wrapped/ : name, exact: true })
    .first()
    .click();
}

async function waitForSaved(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const request = indexedDB.open('momo-lens-private');
            request.onerror = () => resolve(false);
            request.onsuccess = () => {
              const database = request.result;
              const read = database
                .transaction('private')
                .objectStore('private')
                .get('private-data');
              read.onsuccess = () => {
                const value = read.result as
                  { settings?: { rememberOnDevice?: boolean } } | undefined;
                resolve(value?.settings?.rememberOnDevice === true);
                database.close();
              };
              read.onerror = () => {
                database.close();
                resolve(false);
              };
            };
          }),
      ),
    )
    .toBe(true);
}

async function seriousAccessibilityIssues(page: Page) {
  // This static app has no frames. Run axe in the same document so the strict
  // CSP does not interfere with the scanner's optional blank-frame protocol.
  const results = await new AxeBuilder({ page })
    .setLegacyMode()
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const violations = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  if (violations.length)
    await test.info().attach('axe-violations', {
      body: JSON.stringify(violations),
      contentType: 'application/json',
    });
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target),
  }));
}

test('home explains privacy and navigation works by keyboard', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByText('Your file never leaves your browser.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('No uploads, no accounts, no tracking.');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(await seriousAccessibilityIssues(page)).toEqual([]);
});

test('sample dashboard, charts, transactions, and Wrapped are usable', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }),
  );
  await loadSample(page);
  await expect(page.getByText(/money in/i).first()).toBeVisible();
  await expect(page.getByText(/money out/i).first()).toBeVisible();
  await expect(page.locator('.monthly-chart .recharts-surface')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('dl.ledger-figures dd')).toHaveCount(3);
  const ledger = page.getByRole('table', { name: 'Transactions', exact: true });
  await expect(ledger.getByRole('columnheader')).toHaveCount(4);
  const ledgerTop = await ledger.evaluate((element) => element.getBoundingClientRect().top);
  const chartTop = await page
    .getByRole('heading', { name: 'Monthly money in and out', exact: true })
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(ledgerTop).toBeLessThan(chartTop);
  const tableToggles = page.getByRole('button', { name: /view as table/i });
  while (await tableToggles.count()) {
    await tableToggles.first().click();
  }
  await expect(page.getByRole('table').first()).toBeVisible();
  expect(await seriousAccessibilityIssues(page)).toEqual([]);
  await navigate(page, 'Transactions');
  await expect(page).toHaveURL(/review/);
  await page
    .getByRole('textbox', { name: /search transactions/i })
    .fill('a search that matches nothing');
  await expect(page.getByText(/no transactions/i).first()).toBeVisible();
  await page.getByRole('textbox', { name: /search transactions/i }).fill('');
  expect(await seriousAccessibilityIssues(page)).toEqual([]);
  await navigate(page, 'MoMo Wrapped');
  await expect(page).toHaveURL(/wrapped/);
  await expect(page.getByRole('switch', { name: /hide amounts/i })).toBeChecked();
  await expect(page.getByRole('switch', { name: /hide names/i })).toBeChecked();
  const shareCard = page.getByRole('article', { name: 'MoMo Wrapped share card' });
  await expect(shareCard).not.toContainText(/GH₵|GHS|Kofi Boateng|Akosua Mensah/);
  expect(await seriousAccessibilityIssues(page)).toEqual([]);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /download png/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/i);
  expect(await download.failure()).toBeNull();
});

test('unknown CSV reaches a column mapper and imports three transactions', async ({ page }) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(fixture('unknown-layout.csv'));
  await expect(page.getByRole('heading', { name: /match your columns/i })).toBeVisible();
  await page.getByLabel('Date column', { exact: true }).selectOption('When');
  await page.getByLabel('Description column', { exact: true }).selectOption('What happened');
  await page.getByLabel('Amount column', { exact: true }).selectOption('Money');
  await page.getByLabel('Counterparty column', { exact: true }).selectOption('Who');
  await page.getByLabel('Balance column', { exact: true }).selectOption('Remaining');
  await page.getByRole('button', { name: /finish import/i }).click();
  await expect(page).toHaveURL(/review/);
  await expect(page.getByText(/3 transactions/i).first()).toBeVisible();
  await expect(page.getByText('Kweku', { exact: true })).toBeVisible();
});

test('duplicate file import does not add transactions twice', async ({ page }) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(fixture('mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  const firstRows = await page.locator('[data-transaction-id]').count();
  await navigate(page, 'Import statement');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(fixture('mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  expect(await page.locator('[data-transaction-id]').count()).toBe(firstRows);
  await expect(page.getByText(/duplicate/i).first()).toBeVisible();
});

test('every route has no serious or critical axe violations and fits the viewport', async ({
  page,
}) => {
  await loadSample(page);
  for (const route of [
    '/import/',
    '/review/',
    '/dashboard/',
    '/wrapped/',
    '/privacy/',
    '/about/',
  ]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await seriousAccessibilityIssues(page)).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused();
    await page.keyboard.press('Enter');
  }
});

test('delete all data removes remembered data and current session', async ({ page }) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(fixture('mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await navigate(page, 'Privacy & data');
  await page.getByRole('switch', { name: /remember on this device/i }).check();
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByRole('switch', { name: /remember on this device/i })).toBeChecked();
  await page.getByRole('button', { name: /delete all my data/i }).click();
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: /delete/i }).click();
  }
  await expect(
    page.getByText(/saved transactions, rules and settings have been deleted/i),
  ).toBeVisible();
  await expect(page.getByRole('switch', { name: /remember on this device/i })).not.toBeChecked();
  await page.goto('/dashboard/');
  await expect(
    page.locator('main').getByRole('button', { name: 'Import statement', exact: true }),
  ).toBeVisible();
});

test('a counterparty rule applies retroactively and survives remembered reloads', async ({
  page,
}) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(fixture('mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await page.getByRole('textbox', { name: /search transactions/i }).fill('Kofi Boateng');
  const count = await page.locator('[data-transaction-id]').count();
  expect(count).toBeGreaterThan(1);
  await page
    .getByRole('button', { name: /change category for Kofi Boateng/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Transaction category', { exact: true }).selectOption('bills');
  await dialog.getByRole('checkbox', { name: /apply to all from this counterparty/i }).check();
  await dialog.getByRole('button', { name: /save category/i }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('bills');
  await expect(page.locator('[data-transaction-id]')).toHaveCount(count);
  await navigate(page, 'Privacy & data');
  await page.getByRole('switch', { name: /remember on this device/i }).check();
  await expect(page.getByText('Saved category rules').locator('..')).toContainText('1');
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByRole('switch', { name: /remember on this device/i })).toBeChecked();
  await navigate(page, 'Transactions');
  await page.getByRole('textbox', { name: /search transactions/i }).fill('Kofi Boateng');
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('bills');
  await expect(page.locator('[data-transaction-id]')).toHaveCount(count);
});

test('supported mobile sharing receives a local PNG file', async ({ page }) => {
  await loadSample(page);
  await navigate(page, 'MoMo Wrapped');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        const file = data.files?.[0];
        Object.defineProperty(window, '__momoSharedPng', {
          configurable: true,
          value: file?.type === 'image/png' && file.size > 0,
        });
      },
    });
  });
  await page.getByRole('button', { name: /download png/i }).click();
  await expect(page.getByText('Your Wrapped is ready to share.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, '__momoSharedPng'))).toBe(true);
});

test('a keyboard-only walkthrough reaches every screen with sample data', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }),
  );
  await page.goto('/');
  await tabTo(page, page.getByRole('button', { name: /try sample data/i }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/dashboard/);
  await tabTo(page, page.getByRole('button', { name: /view as table/i }).first());
  await page.keyboard.press('Enter');
  await expect(page.getByRole('table').first()).toBeVisible();
  await keyboardNavigate(page, 'Transactions');
  await tabTo(page, page.getByRole('textbox', { name: /search transactions/i }));
  await page.keyboard.insertText('Kofi Boateng');
  await expect(page.locator('[data-transaction-id]').first()).toContainText('Kofi Boateng');
  await tabTo(
    page,
    page.getByRole('button', { name: /change category for Kofi Boateng/i }).first(),
  );
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await keyboardNavigate(page, 'MoMo Wrapped');
  await tabTo(page, page.getByRole('switch', { name: /hide amounts/i }));
  await page.keyboard.press('Space');
  await expect(page.getByRole('switch', { name: /hide amounts/i })).not.toBeChecked();
  await page.keyboard.press('Space');
  await keyboardNavigate(page, 'Privacy & data');
  await tabTo(page, page.getByRole('button', { name: /delete all my data/i }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await keyboardNavigate(page, 'About MoMo Lens');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('About MoMo Lens');
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) {
    await tabTo(page, menu);
    await page.keyboard.press('Enter');
  }
  await tabTo(page, page.getByRole('link', { name: 'Import statement', exact: true }).first());
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/import/);
  await tabTo(page, page.getByRole('button', { name: 'Load sample data', exact: false }));
  await expect(page.getByRole('button', { name: 'Load sample data', exact: false })).toBeFocused();
});

test('the four-column transaction ledger sorts amounts in both directions', async ({ page }) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(fixture('mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await expect(page.getByRole('columnheader')).toHaveCount(4);
  const amountHeader = page
    .getByRole('columnheader')
    .filter({ has: page.getByRole('button', { name: 'Sort by amount', exact: true }) });
  await page.getByRole('button', { name: 'Sort by amount', exact: true }).click();
  await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending');
  await expect(
    page.locator('[data-transaction-id]').first().locator('[role=cell]').last(),
  ).toContainText('Money out');
  await page.getByRole('button', { name: 'Sort by amount', exact: true }).click();
  await expect(amountHeader).toHaveAttribute('aria-sort', 'descending');
  await expect(
    page.locator('[data-transaction-id]').first().locator('[role=cell]').last(),
  ).toContainText('Money in');
  await expect(page.locator('[data-transaction-id]').first()).toContainText('3,500.00');
});

test('sample exploration preserves remembered data and mixed-provider imports merge only real rows', async ({
  page,
}) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(fixture('mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await navigate(page, 'Privacy & data');
  await page.getByRole('switch', { name: /remember on this device/i }).check();
  await waitForSaved(page);
  await page.getByRole('link', { name: 'MoMo Lens', exact: true }).click();
  await page.getByRole('button', { name: /try sample data/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText(/72 of 72 transactions/i)).toBeVisible();
  await navigate(page, 'Transactions');
  await page.getByRole('textbox', { name: /search transactions/i }).fill('Kofi Boateng');
  await page
    .getByRole('button', { name: /change category for Kofi Boateng/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Transaction category', { exact: true }).selectOption('bills');
  await dialog.getByRole('checkbox', { name: /apply to all from this counterparty/i }).check();
  await dialog.getByRole('button', { name: /save category/i }).click();
  await page.reload();
  await expect(page.getByText(/24 of 24 transactions/i)).toBeVisible();
  await page.getByRole('textbox', { name: /search transactions/i }).fill('Kofi Boateng');
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('bills');
  await expect(page.locator('[data-transaction-id]')).toHaveCount(0);
  await page.getByRole('link', { name: 'MoMo Lens', exact: true }).click();
  await page.getByRole('button', { name: /try sample data/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await navigate(page, 'Import statement');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(fixture('telecel-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await expect(page.getByText(/32 of 32 transactions/i)).toBeVisible();
  await navigate(page, 'Privacy & data');
  await expect(page.getByText('Saved category rules').locator('..')).toContainText('0');
});
