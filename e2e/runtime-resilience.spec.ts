import { expect, test } from '@playwright/test';
import path from 'node:path';

test('the partial Twi draft selects known labels and preserves English fallback', async ({
  page,
}) => {
  await page.goto('/privacy/');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('tw');
  await expect(
    page.getByText(
      'Twi translations are a draft and need native-speaker review. Missing translations use English.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nhwɛso', exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Privacy and local data', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Nhwɛso', exact: true }).first()).toHaveAttribute(
    'lang',
    'tw',
  );
  await expect(
    page
      .getByRole('heading', { name: 'Privacy and local data', exact: true })
      .locator('xpath=ancestor-or-self::*[@lang][1]'),
  ).toHaveAttribute('lang', 'en');
  await page.getByRole('combobox', { name: 'Kasa', exact: true }).selectOption('en');
  await expect(page.getByRole('link', { name: 'Overview', exact: true }).first()).toBeVisible();
});

test('cancelled parsing restarts without any requests after warmup', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: unknown, options?: StructuredSerializeOptions | Transferable[]) {
        if (
          typeof message === 'object' &&
          message !== null &&
          'path' in message &&
          Array.isArray(message.path) &&
          message.path[0] === 'parse' &&
          ((window as unknown as { heldParse?: number }).heldParse ?? 0) < 3
        ) {
          (window as unknown as { heldParse?: number }).heldParse =
            ((window as unknown as { heldParse?: number }).heldParse ?? 0) + 1;
          return;
        }
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  for (let attempt = 0; attempt < 3; attempt++) {
    await page
      .locator('input[type=file]')
      .setInputFiles(path.resolve('fixtures/mtn-synthetic.csv'));
    await expect(page.getByRole('button', { name: 'Cancel reading', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel reading', exact: true }).click();
    await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  }
  await page.locator('input[type=file]').setInputFiles(path.resolve('fixtures/mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await expect(page.getByText('24 of 24 transactions', { exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(requests.filter((url) => /^https?:/.test(url))).toEqual([]);
  expect(requests.every((url) => url.startsWith('blob:'))).toBe(true);
  expect(new Set(requests).size).toBe(2);
});

test('a real browser storage quota error keeps transactions in memory and disables saving', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(path.resolve('fixtures/mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await page.getByRole('link', { name: 'Privacy & data', exact: true }).first().click();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Storage.overrideQuotaForOrigin', {
    origin: new URL(page.url()).origin,
    quotaSize: 1,
  });
  await page.getByRole('switch', { name: 'Remember on this device', exact: true }).click();
  await expect(
    page.getByText('This device is out of storage. Your data is available for this session only.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('switch', { name: 'Remember on this device', exact: true }),
  ).not.toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('storage-quota.png'), fullPage: true });
  await page.getByRole('link', { name: 'Transactions', exact: true }).first().click();
  await expect(page.getByText('24 of 24 transactions', { exact: true })).toBeVisible();
  await cdp.send('Storage.overrideQuotaForOrigin', { origin: new URL(page.url()).origin });
  await page.reload();
  await expect(page.getByText('No transactions yet.', { exact: true })).toBeVisible();
});

test('a failed browser data deletion reports uncertainty and clears the open session', async ({
  page,
}) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(path.resolve('fixtures/mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await page.getByRole('link', { name: 'Privacy & data', exact: true }).first().click();
  await page.getByRole('switch', { name: 'Remember on this device', exact: true }).check();
  // A deterministic browser API fault simulates an inaccessible saved copy.
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (stores, mode, options) {
      if (mode === 'readwrite')
        throw new DOMException('Synthetic storage interruption', 'AbortError');
      return original.call(
        this,
        typeof stores === 'string' ? stores : Array.from(stores),
        mode,
        options,
      );
    };
  });
  await page.getByRole('button', { name: 'Delete all my data', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Yes, delete everything', exact: true })
    .click();
  await expect(
    page.getByText(/could not confirm removal of any (earlier )?saved copy/),
  ).toBeVisible();
  await expect(
    page.getByRole('switch', { name: 'Remember on this device', exact: true }),
  ).not.toBeChecked();
  await page.getByRole('link', { name: 'Transactions', exact: true }).first().click();
  await expect(page.getByText('No transactions yet.', { exact: true })).toBeVisible();
});

test('a password PDF can be imported offline after the local reader has warmed', async ({
  page,
  context,
}) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await context.setOffline(true);
  await page
    .locator('input[type=file]')
    .setInputFiles(path.resolve('fixtures/mtn-password-synthetic.pdf'));
  await expect(page.getByLabel('PDF password', { exact: true })).toBeVisible();
  await page.getByLabel('PDF password', { exact: true }).fill('lens-demo');
  await page.getByRole('button', { name: 'Unlock PDF', exact: true }).click();
  await expect(page).toHaveURL(/review/);
  await expect(page.getByText('2 of 2 transactions', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});

test('one-row import and skipped-row notices use singular counts', async ({ page }) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  const oneRowFile = {
    name: 'single-synthetic.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      [
        'MTN MoMo Ghana - SYNTHETIC EXAMPLE',
        'Date & Time,Payment Type,To/From,Account Name,Amount,Fees,Tax,Balance,Transaction ID,Reference',
        '01/07/2026 09:00,MOMO USER,0240000001,Synthetic Person,+3200.00,0.00,0.00,3200.00,SYN-ONE-001,Salary',
        'invalid,MOMO USER,0240000001,Synthetic Person,+20.00,0.00,0.00,3220.00,SYN-BAD-001,Invalid date',
      ].join('\n'),
    ),
  };
  await page.locator('input[type=file]').setInputFiles(oneRowFile);
  await expect(page).toHaveURL(/review/);
  await expect(
    page.getByText('1 transaction imported. Your statement stayed on this device.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('1 row read from single-synthetic.csv. 1 row skipped.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Import statement', exact: true }).first().click();
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(oneRowFile);
  await expect(page).toHaveURL(/review/);
  await expect(
    page.getByText('0 transactions added. 1 duplicate safely skipped.', { exact: true }),
  ).toBeVisible();
});
