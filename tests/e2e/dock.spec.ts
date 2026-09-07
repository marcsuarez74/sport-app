import { expect, test } from '@playwright/test';

const ORIGIN = process.env.E2E_PREVIEW ? 'http://localhost:4173' : 'http://localhost:5173';

// Dock flottant compact (variante A — pilule glissante) :
// le dock épasse ~240px, reste centré, et la pilule d'accent glisse
// vers l'onglet actif (transform du ::before piloté par data-active).
test.describe('Dock flottant — mobile', () => {
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

  const dockState = async (page: import('@playwright/test').Page) =>
    page.evaluate(() => {
      const dock = document.querySelector<HTMLElement>('.tabbar-dock');
      if (!dock) return null;
      const rect = dock.getBoundingClientRect();
      const before = getComputedStyle(dock, '::before');
      return {
        largeur: rect.width,
        centreEcart: Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2),
        indicateurTransform: before.transform,
      };
    });

  test('dock compact, centré, pilule qui glisse au changement d’onglet', async ({ page }) => {
    await page.goto(ORIGIN);

    await expect(page.getByText('Semaine 2026-S39')).toBeVisible();

    const avant = await dockState(page);
    expect(avant).not.toBeNull();
    // compact : ~240px, jamais la largeur de l'écran (375 ou 320)
    expect(avant!.largeur).toBeLessThanOrEqual(300);
    expect(avant!.largeur).toBeGreaterThan(150);
    // centré horizontalement
    expect(avant!.centreEcart).toBeLessThanOrEqual(1);

    // pilule sur l'onglet 1 : translation nulle
    expect(avant!.indicateurTransform).toBe('none');

    await page.getByRole('button', { name: 'Mon suivi' }).click();
    await expect(page.getByText('Salut Marc')).toBeVisible();
    await page.waitForTimeout(500); // laisser la transition (0,32s) se terminer

    const apres = await dockState(page);
    expect(apres).not.toBeNull();
    // pilule glissée : matrice de translation sur X (translateX(100% + gap))
    expect(apres!.indicateurTransform).toMatch(/^matrix\(1, 0, 0, 1, [0-9.]+, 0\)$/);
    expect(parseFloat(apres!.indicateurTransform.split(',')[4])).toBeGreaterThan(100);
  });
});
