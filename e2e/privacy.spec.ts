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
