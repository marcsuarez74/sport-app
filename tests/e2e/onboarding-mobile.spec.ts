import { expect, test } from '@playwright/test';

const OVERFLOW_TOLERANCE = 1; // arrondis de sous-pixel
// Origine du localStorage : doit matcher la baseURL (dev 5173 ou preview 4173)
const ORIGIN = process.env.E2E_PREVIEW ? 'http://localhost:4173' : 'http://localhost:5173';

async function assertPasDeDebordement(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'la page ne doit pas scroller horizontalement').toBeLessThanOrEqual(OVERFLOW_TOLERANCE);
}

test.describe('Onboarding — formulaire poids/âge/taille sur mobile', () => {
  test('étape 2 : aucun débordement horizontal et champs dans le viewport', async ({ page }) => {
    const largeur = page.viewportSize()!.width;
    await page.goto('/');
    await page.getByRole('button', { name: /Mélanie/ }).click();

    const row = page.locator('.onboarding-row');
    await expect(row).toBeVisible();
    await assertPasDeDebordement(page);

    for (const label of ['Âge', 'Taille (cm)']) {
      const champ = page.getByLabel(label);
      await expect(champ).toBeVisible();
      const box = (await champ.boundingBox())!;
      expect(box.x, `${label} commence dans le viewport`).toBeGreaterThanOrEqual(0);
      expect(
        box.x + box.width,
        `${label} tient entièrement dans le viewport`,
      ).toBeLessThanOrEqual(largeur + OVERFLOW_TOLERANCE);
    }
  });

  test('étape 2 : soumission complète possible au doigt', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Mélanie/ }).click();

    await page.getByLabel('Poids (kg)').fill('62.4');
    await page.getByLabel('Âge').fill('38');
    await page.getByLabel('Taille (cm)').fill('165');
    await page.getByRole('button', { name: /C'est parti/ }).click();

    // Profil enregistré + semaine d'exemple auto-chargée → shell direct
    await expect(page.getByText('Semaine 2026-S39')).toBeVisible();
    const profil = await page.evaluate(() => JSON.parse(localStorage.getItem('sportapp:profile')!));
    expect(profil).toEqual({ id: 'melanie', age: 38, taille: 165 });
  });
});

test.describe('Écran Profil — mobile', () => {
  // Profil seul suffit : la semaine d'exemple se charge automatiquement,
  // la bannière (et son icône profil) apparaît donc dans le shell.
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: ORIGIN,
          localStorage: [
            { name: 'sportapp:profile', value: JSON.stringify({ id: 'melanie', age: 38, taille: 165 }) },
          ],
        },
      ],
    },
  });

  test('mes infos : aucun débordement horizontal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mon profil' }).click();

    await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
    await expect(page.getByLabel('Âge')).toBeVisible();
    await assertPasDeDebordement(page);
  });
});
