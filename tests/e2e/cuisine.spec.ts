import { expect, test } from '@playwright/test';

// Contrat de maintenance : la semaine d'exemple (S37, 2026-09-07 → 2026-09-13)
// doit couvrir la semaine courante. Quand on la rafraîchit, mettre à jour
// « Semaine 2026-S37 » et les compteurs exacts ci-dessous (même contrat que
// les tests unitaires). Hypothèses à préserver aussi : le frontmatter garde
// `menu: A` (pill assertée), et la 1ʳᵉ recette liée dans l'ordre tournant
// (R1/R2/R7) garde kcal/protéines + étapes — sinon le test fiche échoue
// certains jours seulement. Le jour courant, lui, reste calculé à l'exécution.
const ORIGIN = process.env.E2E_PREVIEW ? 'http://localhost:4173' : 'http://localhost:5173';
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

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

  test('menu : le jour courant est en tête avec son badge', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.locator('.menu-day').first()).toBeVisible();

    // même calcul que todayKey() — pas de jour codé en dur (dépend de la date d'exécution)
    const jourCourant = JOURS[(new Date().getDay() + 6) % 7];
    const premier = page.locator('.menu-day').first();
    await expect(premier).toHaveClass(/menu-day today/);
    await expect(premier.locator('h3')).toHaveText(new RegExp(jourCourant, 'i'));
    await expect(premier.locator('.today-badge')).toHaveText("Aujourd'hui");
  });

  test('fiche recette : carte compacte repliée, dépliage par le bouton, repli par re-clic', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();

    await page.getByRole('button', { name: 'Menu' }).click();
    const carte = page.locator('.recette-card').first();
    await expect(carte).toBeVisible();
    await expect(carte.locator('.recette-nom')).toBeVisible();
    await expect(carte.locator('.recette-nutri span').first()).toBeVisible();
    await expect(carte.locator('.recette-etapes')).toHaveCount(0);

    const toggle = carte.locator('.recette-toggle');
    await toggle.click();
    await expect(carte.locator('.recette-etapes li').first()).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await toggle.click();
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

    await expect(page.locator('.micro-batch')).toBeVisible();
    await expect(page.locator('.micro-jour')).toHaveCount(3);
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
