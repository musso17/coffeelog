import { test, expect } from '@playwright/test';

const LOCALE = process.env.E2E_LOCALE ?? 'es';

test.describe('Smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await expect(page.getByRole('heading', { name: /cafe log/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión|log in/i })).toBeVisible();
  });
});
