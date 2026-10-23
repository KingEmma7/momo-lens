import { expect, test } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

async function syntheticPdf(withText: boolean): Promise<Buffer> {
  const document = await PDFDocument.create();
  if (!withText) {
    document.addPage([650, 500]).drawRectangle({ x: 40, y: 40, width: 300, height: 200 });
    return Buffer.from(await document.save());
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (let pageIndex = 0; pageIndex < 2; pageIndex += 1) {
    const page = document.addPage([650, 500]);
    const write = (text: string, x: number, y: number) =>
      page.drawText(text, { x, y, size: 10, font });
    write('MTN MoMo statement', 36, 460);
    ['Date & Time', 'Payment Type', 'Amount', 'Transaction ID'].forEach((text, index) =>
      write(text, [36, 210, 400, 500][index] ?? 36, 420),
    );
    if (pageIndex === 1) write('bundle', 210, 400);
    [
      '01/09/2026 09:00',
      pageIndex ? 'AIRTIME' : 'DATA',
      pageIndex ? '-5.00' : '-10.00',
      `SYN-PDF-${pageIndex + 1}`,
    ].forEach((text, index) => write(text, [36, 210, 400, 500][index] ?? 36, 370));
    write(`Page ${pageIndex + 1} of 2`, 36, 30);
  }
  return Buffer.from(await document.save());
}

test('local PDF.js reads repeated headers and a wrapped description across pages', async ({
  page,
}) => {
  await page.goto('/import/');
  await expect(page.getByText('Ready to import', { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles({
    name: 'synthetic-mtn-multipage.pdf',
    mimeType: 'application/pdf',
    buffer: await syntheticPdf(true),
  });
  await expect(page).toHaveURL(/review/, { timeout: 30_000 });
  await expect(page.getByText(/2 transactions/i).first()).toBeVisible();
  await expect(page.getByText('DATA bundle', { exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);
});

test('an image-only PDF gives a local explanation', async ({ page }) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles({
    name: 'synthetic-image-only.pdf',
    mimeType: 'application/pdf',
    buffer: await syntheticPdf(false),
  });
  await expect(page.locator('main').getByRole('alert')).toContainText(/no readable text|scan/i, {
    timeout: 30_000,
  });
});

test('an empty or unsupported file gives an actionable error', async ({ page }) => {
  await page.goto('/import/');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'empty.csv', mimeType: 'text/csv', buffer: Buffer.alloc(0) });
  await expect(page.locator('main').getByRole('alert')).toContainText(/empty/i);
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles({
    name: 'picture.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('synthetic unsupported file'),
  });
  await expect(page.locator('main').getByRole('alert')).toContainText(/PDF or CSV/i);
});

test('10,000 rows parse in a worker and the review remains virtualized', async ({ page }) => {
  test.setTimeout(60_000);
  const header = 'MTN MoMo synthetic\nDate,Description,Amount,Reference\n';
  const rows = Array.from(
    { length: 10_001 },
    (_, index) => `01/09/2026,Transfer to synthetic friend,-1.00,SYN-LARGE-${index}`,
  ).join('\n');
  await page.goto('/import/');
  await expect(page.getByText('Ready to import', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.locator('input[type=file]').setInputFiles({
    name: 'synthetic-mtn-10001.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`${header}${rows}`),
  });
  await expect(page).toHaveURL(/review/, { timeout: 30_000 });
  await expect(page.getByText(/10,?001 transactions/i).first()).toBeVisible();
  expect(await page.locator('[data-transaction-id]').count()).toBeLessThan(100);
  await page.getByRole('textbox', { name: /search transactions/i }).fill('no match');
  await expect(page.getByText(/no transactions/i).first()).toBeVisible();
});

test('a password-protected PDF unlocks locally after a wrong-password retry', async ({ page }) => {
  await page.goto('/import/');
  await expect(page.locator('input[type=file]')).toBeEnabled({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.locator('input[type=file]').setInputFiles('fixtures/mtn-password-synthetic.pdf');
  const password = page.getByLabel('PDF password', { exact: true });
  await expect(password).toBeVisible();
  await password.fill('wrong-demo-password');
  await page.getByRole('button', { name: 'Unlock PDF', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText(
    /did not unlock|did not open/i,
  );
  await password.fill('lens-demo');
  await page.getByRole('button', { name: 'Unlock PDF', exact: true }).click();
  await expect(page).toHaveURL(/review/, { timeout: 30_000 });
  await expect(page.getByText(/2 transactions/i).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);
});
