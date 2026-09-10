import { expect, test } from '@playwright/test';

// Contrat de maintenance : la semaine d'exemple (S37, 2026-09-07 → 2026-09-13)
// doit couvrir la semaine courante. Quand on la rafraîchit, mettre à jour
// « Semaine 2026-S37 » et les compteurs exacts ci-dessous (même contrat que
// les tests unitaires). Hypothèses à préserver aussi : le frontmatter garde
// `menu: A` (pill assertée), le menu compte 33 lignes repas (5+5+5+4+4+5+5)
// et la 3ᵉ carte (nth(2)) = lundi diner-famille → R1 (kcal/étapes) — le test
// fiche recette s'y accroche. Les coches menu partent d'un storageState vierge.
const ORIGIN = process.env.E2E_PREVIEW ? 'http://localhost:4173' : 'http://localhost:5173';

const OVERFLOW_TOLERANCE = 1; // arrondis de sous-pixel

async function assertPasDeDebordement(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'la page ne doit pas scroller horizontalement').toBeLessThanOrEqual(OVERFLOW_TOLERANCE);
}

test.describe('Onglets Cuisine v2 — mobile', () => {
  // Profil seul suffit : la semaine d'exemple se charge automatiquement (fallback mémoire).
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

  test('bannière : pill « Menu A » visible', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
    await expect(page.locator('.menu-pill')).toBeVisible();
    await expect(page.locator('.menu-pill')).toHaveText('Menu A');
  });

  test('menu : réserve de recettes — 33 cartes, coche persistée, fiche dépliable', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.locator('.menu-card')).toHaveCount(33);
    await expect(page.locator('.menu-reserve-head')).toContainText('0/33 faits');

    const carte = page.locator('.menu-card').nth(2); // lundi diner-famille → R1
    await carte.locator('input[type="checkbox"]').check();
    await expect(carte).toHaveClass(/fait/);
    await page.reload();
    // le rechargement remet l'app sur l'onglet Courses : rouvrir Menu avant l'assertion
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.locator('.menu-card').nth(2)).toHaveClass(/fait/);

    await expect(carte.locator('.recette-etapes')).toHaveCount(0);
    await carte.locator('.rtoggle').click();
    await expect(carte.locator('.recette-etapes li').first()).toBeVisible();
    await expect(carte.locator('.rtoggle')).toHaveAttribute('aria-expanded', 'true');
    await carte.locator('.rtoggle').click();
    await expect(carte.locator('.recette-etapes')).toHaveCount(0);
  });

  test('courses : compteurs par rayon et encadré keto en dernier', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();

    // 7 rayons dans la sample (6 groupes + keto), chacun avec son compteur 0/N
    await expect(page.locator('.rayon-cnt')).toHaveCount(7);
    await expect(page.locator('.rayon-cnt').first()).toHaveText('0/5');

    const dernier = page.locator('main section').last();
    await expect(dernier).toHaveClass(/keto-box/);
    await expect(dernier.locator('.keto-title')).toContainText('Les extras keto de Mélanie');
    await expect(dernier.locator('.rayon-cnt')).toHaveText('0/5');
  });

  test('batch : timeline du rituel (5 étapes) et carrousel micro-batch', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();

    await page.getByRole('button', { name: 'Batch' }).click();
    await expect(page.locator('.rituel-timeline')).toBeVisible();
    await expect(page.locator('.rituel-etape')).toHaveCount(5);
    await expect(page.locator('.rituel-creneau').first()).toBeVisible();

    await expect(page.locator('.batch-banner')).toHaveCount(0);

    await expect(page.locator('.micro-batch')).toBeVisible();
    await expect(page.locator('.micro-jour')).toHaveCount(3);
    await expect(page.locator('.micro-dots i')).toHaveCount(3);
  });

  for (const largeur of [320, 375]) {
    test(`zéro débordement horizontal sur les 3 sous-onglets à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 700 });
      await page.goto(ORIGIN);
      await expect(page.getByText('Semaine 2026-S37')).toBeVisible();

      for (const onglet of ['Courses', 'Menu', 'Batch']) {
        await page.getByRole('button', { name: onglet }).click();
        await assertPasDeDebordement(page);
      }
    });
  }
});
