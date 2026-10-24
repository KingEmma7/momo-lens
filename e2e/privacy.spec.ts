import { expect, test } from '@playwright/test';
import path from 'node:path';

// Block the service worker so it cannot hide a fetch from this assertion.
test.use({ serviceWorkers: 'block' });

test('parsing a selected CSV makes zero requests after the local parser is ready', async ({
  page,
}) => {
  await page.goto('/import/');
  await expect(page.getByText('Ready to import', { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(path.resolve('fixtures/mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);
});

test('CSP prevents cross-origin fetches and statement values are absent from URLs', async ({
  page,
}) => {
  await page.goto('/import/');
  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .first()
    .getAttribute('content');
  expect(policy).toContain("connect-src 'self'");
  expect(policy).toContain("object-src 'none'");
  const scriptPolicy = policy
    ?.split(';')
    .find((directive) => directive.trim().startsWith('script-src'));
  expect(scriptPolicy).toContain('sha256-');
  expect(scriptPolicy).not.toContain("'unsafe-inline'");
  await expect(page.locator('script[src^="http"]')).toHaveCount(0);
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/momo-lens-policy-check');
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(path.resolve('fixtures/mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
});

test('deleting in another tab cancels a held parse and prevents data returning', async ({
  page,
  context,
}) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles(path.resolve('fixtures/mtn-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await page.getByRole('link', { name: 'Privacy & data', exact: true }).first().click();
  await page.getByRole('switch', { name: 'Remember on this device', exact: true }).check();
  await expect
    .poll(() =>
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
                resolve(false);
                database.close();
              };
            };
          }),
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(
    page.getByRole('switch', { name: 'Remember on this device', exact: true }),
  ).toBeChecked();

  const other = await context.newPage();
  await other.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    let held: (() => void) | undefined;
    Reflect.set(window, '__releaseHeldParse', () => {
      held?.();
      held = undefined;
    });
    Worker.prototype.postMessage = function (
      message: unknown,
      transfer?: Transferable[] | StructuredSerializeOptions,
    ) {
      if (
        !held &&
        message &&
        typeof message === 'object' &&
        'path' in message &&
        Array.isArray(message.path) &&
        message.path.includes('parse')
      ) {
        held = () => Reflect.apply(original, this, [message, transfer]);
        Reflect.set(window, '__parseHeld', true);
        return;
      }
      Reflect.apply(original, this, [message, transfer]);
    };
  });
  await other.goto('/import/');
  await expect(other.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await other
    .locator('input[type=file]')
    .setInputFiles(path.resolve('fixtures/telecel-synthetic.csv'));
  await expect.poll(() => other.evaluate(() => Reflect.get(window, '__parseHeld'))).toBe(true);
  await expect(other.getByRole('button', { name: 'Cancel reading', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Delete all my data', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /delete/i })
    .click();
  await expect(
    page.getByText(/saved transactions, rules and settings have been deleted/i),
  ).toBeVisible();
  await expect(other.getByRole('button', { name: 'Cancel reading', exact: true })).toHaveCount(0);
  await expect(other.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await other.evaluate(() => {
    const release = Reflect.get(window, '__releaseHeldParse') as (() => void) | undefined;
    release?.();
  });
  await other.getByRole('link', { name: 'Transactions', exact: true }).first().click();
  await expect(other.locator('[data-transaction-id]')).toHaveCount(0);
  await other.getByRole('link', { name: 'Privacy & data', exact: true }).first().click();
  await expect(
    other.getByRole('switch', { name: 'Remember on this device', exact: true }),
  ).not.toBeChecked();
  await page.goto('/review/');
  await expect(page.locator('[data-transaction-id]')).toHaveCount(0);
  await expect(page.getByText('No transactions yet.', { exact: true })).toBeVisible();
});
