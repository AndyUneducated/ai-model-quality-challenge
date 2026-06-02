import { expect, test } from '@playwright/test';
import path from 'node:path';

test('preloads the shipped perf models without any upload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Model Comparison' })).toBeVisible();
  // The 11 shipped models (A–K) render on first open. K is the last shipped model.
  await expect(page.getByRole('cell', { name: 'K' }).first()).toBeVisible();
});

test('lets users add an unseen model (Model L) on top of the preloaded set', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Model Comparison' })).toBeVisible();

  const fixtureDir = path.resolve('test-fixtures');
  await page.locator('input[type="file"]').setInputFiles([
    path.join(fixtureDir, 'Model L profile 1.xlsx'),
  ]);

  // A brand-new model not present in the repo renders with zero code changes.
  await expect(page.getByRole('cell', { name: 'L' }).first()).toBeVisible();
});
