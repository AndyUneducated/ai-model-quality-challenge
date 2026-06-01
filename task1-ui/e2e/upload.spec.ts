import { expect, test } from '@playwright/test';
import path from 'node:path';

test('uploads multiple sweeps and renders comparison', async ({ page }) => {
  await page.goto('/');
  const fixtureDir = path.resolve('test-fixtures');
  await page.locator('input[type="file"]').setInputFiles([
    path.join(fixtureDir, 'Model A profile 1.xlsx'),
    path.join(fixtureDir, 'Model B profile 1.xlsx'),
  ]);
  await expect(page.getByRole('heading', { name: 'Model Comparison' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'A' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'B' })).toBeVisible();
});
