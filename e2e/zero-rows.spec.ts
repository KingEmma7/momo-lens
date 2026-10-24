import { expect, test } from '@playwright/test';

test('recognized zero-row CSV offers mapping and can recover an alternative date column', async ({
  page,
}) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles({
    name: 'synthetic-mtn-zero-rows.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Date,Description,Amount,Actual date\nnot-a-date,Transfer to Synthetic,-10,01/09/2026',
    ),
  });
  await expect(
    page.getByRole('heading', { name: 'Match your columns', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Date column', { exact: true }).selectOption('Actual date');
  await page.getByLabel('Description column', { exact: true }).selectOption('Description');
  await page.getByLabel('Amount column', { exact: true }).selectOption('Amount');
  await page.getByRole('button', { name: 'Finish import', exact: true }).click();
  await expect(page).toHaveURL(/review/);
  await expect(page.locator('[data-transaction-id]')).toHaveCount(1);
});

test('a header-only recognized CSV retains the mapper beside the zero-transactions error', async ({
  page,
}) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles({
    name: 'synthetic-mtn-empty.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Date,Description,Amount\n'),
  });
  await expect(
    page.getByRole('heading', { name: 'Match your columns', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Date column', { exact: true }).selectOption('Date');
  await page.getByLabel('Description column', { exact: true }).selectOption('Description');
  await page.getByLabel('Amount column', { exact: true }).selectOption('Amount');
  await page.getByRole('button', { name: 'Finish import', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'No transactions were found.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Match your columns', exact: true }),
  ).toBeVisible();
});
