import { expect, test } from '@playwright/test';

const ORIGIN = process.env.E2E_PREVIEW ? 'http://localhost:4173' : 'http://localhost:5173';

test.describe('Nav segmented — mobile', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: ORIGIN,
          localStorage: [
            { name: 'sportapp:profile', value: JSON.stringify({ id: 'marc', age: 41, taille: 178 }) },
          ],
        },
      ],
    },
  });

  test('nav segmented visible sous la bannière, plus de dock flottant', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
    const nav = page.locator('.tabbar-segmented');
    await expect(nav).toBeVisible();
    await expect(page.locator('.tabbar-dock')).toHaveCount(0);
    await expect(nav.locator('.seg-tab').first()).toHaveAttribute('aria-current', 'page');
  });

  test('bascule Cuisine ↔ Mon suivi via les segments', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.getByRole('button', { name: 'Mon suivi' }).click();
    await expect(page.locator('.tabbar-segmented')).toHaveAttribute('data-active', 'suivi');
    await expect(page.getByRole('heading', { name: /Marc — Diet & Sport/ })).toBeVisible();
    await page.getByRole('button', { name: 'Cuisine' }).click();
    await expect(page.locator('.tabbar-segmented')).toHaveAttribute('data-active', 'cuisine');
  });

  for (const largeur of [320, 375]) {
    test(`zéro débordement horizontal sur les 2 onglets à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 700 });
      await page.goto(ORIGIN);
      for (const onglet of ['Cuisine', 'Mon suivi']) {
        await page.getByRole('button', { name: onglet }).click();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      }
    });
  }
});
