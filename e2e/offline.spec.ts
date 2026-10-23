import { expect, test } from '@playwright/test';
import path from 'node:path';

test.use({ serviceWorkers: 'allow' });

test('the installed application shell reloads and imports offline', async ({ page, context }) => {
  await page.goto('/import/');
  await expect(page.getByText('Ready to import', { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error('No active service worker');
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page
    .locator('input[type=file]')
    .setInputFiles(path.resolve('fixtures/telecel-synthetic.csv'));
  await expect(page).toHaveURL(/review/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.setOffline(false);
});
