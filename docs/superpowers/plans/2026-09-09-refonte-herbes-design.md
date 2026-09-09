# Refonte « Herbes » — Plan d'implémentation

**Goal:** Passer l'app du dark Nutrigo au thème clair « Herbes » (sauge/basilic/citron), nav segmented + swipe, menu v2 « réserve de recettes », mode magasin courses, mode guidé batch, icônes SVG maison.

**Spec:** `docs/superpowers/specs/2026-09-09-refonte-herbes-design.md` (§ 7 = fonctionnalités validées en maquette)
**Maquette de référence:** `.superpowers/brainstorm/53005-1788982970/content/maquette-interactive.html` (référence vivante du design validé — copier les valeurs CSS et les chemins d'icônes depuis elle)
**Tech Stack:** React 18 + TS strict + Vite, CSS sémantique single-file (`src/index.css`), vitest + Testing Library (happy-dom), Playwright (e2e 320/375), vite-plugin-pwa.

**Règles transverses (rappel AGENTS.md) :**

- TDD : chaque tâche comportementale commence par le test rouge (`npm run test:watch`).
- Gates avant chaque commit : `npm test && npm run typecheck && npm run lint`.
- Aucun id de coche existant modifié (`courses:…`, `batch:…`, `batch:rituel:…`, `seances:…`). Les nouveaux ids repas sont `menu:{jour}:{clé}`.
- Zéro débordement horizontal à 320/375 px → `npm run e2e` aux étapes indiquées.
- La semaine d'exemple est ré-enrichie (labels changent) : les coches de démo sur les téléphones repartent de zéro — acceptable (fallback mémoire, pas de données réelles dedans).

## Décisions d'implémentation (firmées)

1. **Marqueur batch sur item course** : suffixe de fin de ligne ` · rituel` dans le .md. Le parseur le retire du label, calcule l'id **sur le libellé nettoyé** (id stable qu'on ajoute ou non le marqueur), et pose `rituel: true`. L'UI affiche l'icône casserole + le mot « rituel ».
2. **Note de fraîcheur sur item course** : suffixe ` | <note>` en fin de ligne → `note: string`, rendu en sous-ligne muted.
3. **Budget courses** : ligne `- budget: <texte>` en tête de `## Courses` → `data.budget: string` (affichée dans la bannière rituel).
4. **Recette v2** : `fraicheur:` (kv) + `- portions marc:` / `- portions melanie:` (lignes) → `Recette.fraicheur?: string`, `Recette.portions?: { marc?: string; melanie?: string }`.
5. **Menu v2** : 1 occurrence de ligne repas = 1 carte `.menu-card`. Ordre = chronologique lundi→dimanche (**plus de rotation autour d'aujourd'hui, plus de badge « Aujourd'hui »**). Coche = `menu:{jourMinuscule}:{cleMealKey}` dans `sportapp:checks:{semaine}` (storage inchangé). Les cartes sans recette rattachée n'ont pas de bouton « Voir la recette » (rien à déplier) — le « cook libre » reste un chantier ultérieur.
6. **Mode guidé batch = présentation pure** (fidèle à la maquette) : avancer dans les étapes ne coche PAS la timeline.
7. **Photos de rayons conservées** (la maquette utilisait des icônes SVG par commodité ; `rayons.ts` et les miniatures jpg restent — cf. spec § 8 « rayons.ts inchangé »).
8. **Icônes** : 20 noms repris de la maquette + 2 chevrons latéraux (bannière). Les icônes de la maquette non utilisées (cheese, pasta, plus, eye) ne sont pas portées (YAGNI — on les réajoutera au besoin).
9. **Swipe Cuisine ↔ Suivi** : pointer events sur `<main>`, seuil 80 px horizontal / 60 px vertical max, désactivé si `prefers-reduced-motion`, ignoré si le geste démarre sur `button, input, textarea, select, label, a, .micro-batch`. Testé en e2e (pas d'unitaire : happy-dom ne simule pas les PointerEvents).
10. **Ordre des tâches** : tokens → Icon → nav → parse → données d'exemple → features → restyle → PWA → docs → e2e final.

---

### Task 1 : Tokens Herbes (fondations CSS)

Fichier : `src/index.css` uniquement.

- [ ] **Step 1: Remplacer le header + le bloc `:root`** (lignes 1-56) par : header commentaire « design system Herbes (thème clair unique) », **conserver les 4 `@font-face` Poppins existants tels quels**, puis :

```css
:root {
  --bg: #f0f2eb;
  --surface: #fcfdf9;
  --surface-2: #e7eae0;
  --border: #e1e6da;
  --text: #26312b;
  --muted: #6e7a6c;
  --accent: #3e7a46; /* basilic */
  --accent-2: #f2dc7b; /* citron */
  --danger: #b4452f;
  --shadow: 0 4px 16px rgb(38 49 43 / 0.08);
  --radius: 18px;
  color-scheme: light;
}
```

- [ ] **Step 2: Replacements globaux dans le reste du fichier** :

| Ancien | Nouveau | Où |
|---|---|---|
| littéral `#272932` (texte sur accent) | `#ffffff` | `.btn`, `.menu-pill`, `.tag-marc`, `.recette-badge-cat` (→ supprimée Task 7), `.onboarding-cta`, `.onboarding-card-marc` |
| ombres `rgb(0 0 0 / …)` | `rgb(38 49 43 / 0.08)` | toutes les `box-shadow` |
| glow accent 35 % | conserver | fonctionne tel quel sur basilic |
| dégradé onboarding marc `#ffa257→#c96a20` | `#3e7a46 → #2e5d35` | `.onboarding-card-marc` |
| dégradé onboarding mél `#c2e66e→#8fbf4d` | `#f2dc7b → #d9bc4f` | `.onboarding-card-melanie` |
| texte `.onboarding-card-melanie` | `var(--text)` (encre sur citron) | idem |
| texte `.onboarding-card-marc` | `#ffffff` | idem |

- [ ] **Step 3: Ajustements structurels** :
  - `main` : `padding-bottom: 96px` (espace dock) → `padding-bottom: 28px`.
  - Vérifier `body { background: var(--bg); color: var(--text); }` (déjà des tokens — rien à faire si c'est le cas).
- [ ] **Step 4: Vérifier** : `npm test` (vert), `npm run dev` → coup d'œil 320/375 px : surfaces claires lisibles, aucun texte clair sur clair.
- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: thème clair Herbes — tokens sauge/basilic/citron (fin du dark mode)"
```

---

### Task 2 : Composant `Icon` (icônes SVG maison)

- [ ] **Step 1: TESTS (rouge)** — dans `tests/components.test.tsx`, ajouter à la fin du fichier :

```tsx
describe('Icon', () => {
  const NAMES = [
    'cart', 'target', 'chev', 'chev-left', 'chev-right', 'pot', 'scale', 'moon',
    'box', 'snow', 'fish', 'leaf', 'wheat', 'bowl', 'meat', 'check', 'clock',
    'flame', 'drop', 'play',
  ] as const;

  it('rend un svg 24×24 stroke currentColor à la taille demandée', () => {
    render(<Icon name="cart" size={15} />);
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('width', '15');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('accepte un strokeWidth custom (check géant)', () => {
    render(<Icon name="check" size={24} strokeWidth={2.5} />);
    expect(document.querySelector('svg')).toHaveAttribute('stroke-width', '2.5');
  });

  it('couvre les 20 noms du design system sans crash', () => {
    for (const name of NAMES) {
      const { unmount } = render(<Icon name={name} />);
      expect(document.querySelector('svg')).not.toBeNull();
      unmount();
    }
  });
});
```

(avec l'import `import { Icon } from '../src/components/Icon';` ajouté au bloc existant)

- [ ] **Step 2: Implémentation** — nouveau fichier `src/components/Icon.tsx` (chemins repris de la maquette) :

```tsx
import type { ReactNode } from 'react';

// Icônes maison — chemins repris de la maquette Herbes validée.
// Trait 2 px (2,5 pour le check géant), currentColor, bouts arrondis.
const ICONS = {
  cart: (
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
      <path d="M3 4h2l2.3 11.5h9.9l1.8-8H6.2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="12" cy="12" r=".5" />
    </>
  ),
  chev: <path d="M6 9.5l6 6 6-6" />,
  'chev-left': <path d="M14.5 6l-6 6 6 6" />,
  'chev-right': <path d="M9.5 6l6 6-6 6" />,
  pot: (
    <>
      <path d="M6 10.5h12v4.5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" />
      <path d="M3.5 10.5h17M10 10.5V8h4v2.5" />
    </>
  ),
  scale: (
    <path d="M12 4v16M8.5 20h7M5 7h14M5 7l-2.8 5.5a3.2 3.2 0 0 0 5.6 0zM19 7l-2.8 5.5a3.2 3.2 0 0 0 5.6 0z" />
  ),
  moon: <path d="M20 13.5A8 8 0 1 1 10.5 4a6.3 6.3 0 0 0 9.5 9.5z" />,
  box: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="2" />
      <path d="M4 13.5h16M12 13.5V20" />
    </>
  ),
  snow: <path d="M12 3v18M4.5 7.8l15 8.4M19.5 7.5l-15 9" />,
  fish: (
    <>
      <path d="M15.5 12c0 2.8-2.4 5-5.5 5-2.8 0-5.3-2-7-5 1.7-3 4.3-5 7-5 3.1 0 5.5 2.2 5.5 5z" />
      <path d="M15.5 12l4.5-3.5v7z" />
      <circle cx="7.6" cy="11" r=".8" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C10.5 4 4.5 10 4.5 18c0 .8.2 2 .2 2s9-.4 12.8-5.5C20 7.5 20 4 20 4z" />
      <path d="M5.5 19.5C8 13.5 12 9.5 16.5 7.5" />
    </>
  ),
  wheat: (
    <>
      <path d="M12 21V8" />
      <path d="M12 8C9.5 8 7.5 6 7.5 3.5 10 3.5 12 5.5 12 8zM12 8c2.5 0 4.5-2 4.5-4.5C14 3.5 12 5.5 12 8zM12 14.5c-2.5 0-4.5-2-4.5-4.5 2.5 0 4.5 2 4.5 4.5zM12 14.5c2.5 0 4.5-2 4.5-4.5-2.5 0-4.5 2-4.5 4.5z" />
    </>
  ),
  bowl: (
    <>
      <path d="M4 12h16a8 8 0 0 1-16 0z" />
      <path d="M9.5 12c0-2.2 1.1-3.7 2.5-3.7s2.5 1.5 2.5 3.7" />
    </>
  ),
  meat: (
    <>
      <circle cx="13.5" cy="8.5" r="4.7" />
      <path d="M10.2 11.8L6.5 15.5" />
      <circle cx="5.6" cy="16.4" r="1.1" />
      <circle cx="7.6" cy="18.4" r="1.2" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  flame: (
    <path d="M12 3.5c.8 2.8 3.5 4.2 3.5 7.5a3.5 3.5 0 0 1-7 0c0-1.3.4-2.4 1.2-3.4.4.9 1 1.6 1.9 2-.7-2-.4-4.2.4-6.1z" />
  ),
  drop: <path d="M12 3.5c3.5 4 6 7.2 6 10.2a6 6 0 0 1-12 0c0-3 2.5-6.2 6-10.2z" />,
  play: <path d="M8 5.5v13l10-6.5z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
```

- [ ] **Step 3: Vert** → `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 4: Commit**

```bash
git add src/components/Icon.tsx tests/components.test.tsx
git commit -m "feat: composant Icon — icônes SVG maison stroke 2px"
```

---

### Task 3 : Nav segmented (fin du dock flottant)

- [ ] **Step 1: TESTS (rouge)** — dans `tests/app.test.tsx`, remplacer le test du dock flottant (assertions `.tabbar-dock` / `.dock-tab-active`) par :

```tsx
it('rend la nav segmented sous la bannière : libellés toujours visibles, aria-current sur l’actif', () => {
  render(<App />);
  const nav = document.querySelector('.tabbar-segmented');
  expect(nav).not.toBeNull();
  expect(nav).toHaveAttribute('data-active', 'cuisine');
  const cuisine = screen.getAllByRole('button').find((b) => b.textContent?.includes('Cuisine'))!;
  const suivi = screen.getAllByRole('button').find((b) => b.textContent?.includes('Mon suivi'))!;
  expect(cuisine).toHaveAttribute('aria-current', 'page');
  // les DEUX labels sont rendus (plus d'icône seule inactive)
  expect(cuisine.textContent).toContain('Cuisine');
  expect(suivi.textContent).toContain('Mon suivi');
  fireEvent.click(suivi);
  expect(nav).toHaveAttribute('data-active', 'suivi');
  expect(suivi).toHaveAttribute('aria-current', 'page');
});
```

Les autres tests de navigation cliquent par rôle/nom — ils restent verts.

- [ ] **Step 2: Implémentation** — réécrire `src/components/TabBar.tsx` :

```tsx
import { Icon } from './Icon';

export type TabId = 'cuisine' | 'suivi';

const TABS: Array<{ id: TabId; label: string; icone: 'cart' | 'target' }> = [
  { id: 'cuisine', label: 'Cuisine', icone: 'cart' },
  { id: 'suivi', label: 'Mon suivi', icone: 'target' },
];

// Nav segmented sous la bannière (plus de dock flottant) : pilule glissante
// pilotée en CSS via data-active ; icône + label toujours visibles.
export function TabBar({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  return (
    <nav className="tabbar-segmented" data-active={active} aria-label="Navigation principale">
      {TABS.map(({ id, label, icone }) => {
        const actif = id === active;
        return (
          <button
            key={id}
            type="button"
            className={actif ? 'seg-tab seg-tab-active' : 'seg-tab'}
            aria-current={actif ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <Icon name={icone} size={18} />
            <span className="seg-tab-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

`App.tsx` : aucun changement (mêmes props, même position dans le JSX).

- [ ] **Step 3: CSS** — dans `src/index.css` :
  - **Supprimer** la famille `.tabbar-dock`, `.dock-tab`, `.dock-tab-active`, `.dock-tab-icone`, `.dock-tab-label` et l'animation `dock-label-in`.
  - **Ajouter** :

```css
/* Navigation segmented (sous la bannière) */
.tabbar-segmented {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  margin: 14px 0 18px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 999px;
}
.tabbar-segmented::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 6px);
  background: var(--surface);
  border-radius: 999px;
  box-shadow: var(--shadow);
  transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tabbar-segmented[data-active='suivi']::before {
  transform: translateX(calc(100% + 8px));
}
.seg-tab {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  border: 0;
  background: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  color: var(--muted);
  transition: color 0.2s;
}
.seg-tab-active {
  color: var(--text);
}
@media (prefers-reduced-motion: reduce) {
  .tabbar-segmented::before {
    transition: none;
  }
}
```

- [ ] **Step 4: e2e** — réécrire `tests/e2e/dock.spec.ts` :

```ts
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
```

- [ ] **Step 5: Vert partout** — `npm test && npm run typecheck && npm run lint && npm run e2e`.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: nav segmented sous la bannière (fin du dock flottant)"
```

---

### Task 4 : Parse v2 — budget, marqueur rituel, note, portions, fraîcheur

- [ ] **Step 1: TESTS (rouge)** — dans `tests/parse.test.ts` (fixture `mdSemaine()` existante), ajouter (adapter les chaînes remplacées aux libellés réels de la fixture — l'intention compte) :

```tsx
describe('parse v2 — budget, rituel, note, portions, fraîcheur', () => {
  it('lit la ligne budget en tête de ## Courses', () => {
    const md = mdSemaine().replace('## Courses', '## Courses\n- budget: ≈ 35 €');
    const { data, warnings } = parseWeeklyFile(md);
    expect(data.budget).toBe('≈ 35 €');
    expect(warnings).toHaveLength(0);
  });

  it('marque les items suffixés « · rituel » et nettoie le label (id stable sans le suffixe)', () => {
    const md = mdSemaine().replace('- Œufs ×20', '- Œufs ×20 · rituel');
    const { data } = parseWeeklyFile(md);
    const oeufs = data.courses.find((c) => c.label.startsWith('Œufs'));
    expect(oeufs?.rituel).toBe(true);
    expect(oeufs?.label).toBe('Œufs ×20');
    expect(oeufs?.id).toBe('courses:divers:oeufs-x20');
  });

  it('lit la note de fraîcheur en suffixe « | note »', () => {
    const md = mdSemaine().replace('- Salade', '- Salade | à acheter vendredi, pas avant');
    const { data, warnings } = parseWeeklyFile(md);
    const salade = data.courses.find((c) => c.label === 'Salade');
    expect(salade?.note).toBe('à acheter vendredi, pas avant');
    expect(warnings).toHaveLength(0);
  });

  it('lit portions marc / portions melanie et fraicheur dans une recette', () => {
    const md = mdSemaine().replace(
      'score: 7',
      'score: 7\nfraicheur: batch dimanche → boîte\n- portions marc: riz 150 g cuit\n- portions melanie: sans riz ni patate douce',
    );
    const { data } = parseWeeklyFile(md);
    const r1 = data.recettes?.find((r) => r.id === 'r1');
    expect(r1?.fraicheur).toBe('batch dimanche → boîte');
    expect(r1?.portions?.marc).toBe('riz 150 g cuit');
    expect(r1?.portions?.melanie).toBe('sans riz ni patate douce');
  });

  it('reste silencieux sur un fichier v1 sans ces champs', () => {
    const { data, warnings } = parseWeeklyFile(mdSemaine());
    expect(data.budget).toBeUndefined();
    expect(warnings).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Types** — dans `src/lib/model.ts` :

```ts
export interface CourseItem {
  id: string;
  rayon: string;
  label: string;
  rituel?: boolean;
  note?: string;
}
```

Dans `Recette` (après `batch?`) :

```ts
  fraicheur?: string;
  portions?: { marc?: string; melanie?: string };
```

Dans `WeeklyData` (après `courses`) :

```ts
  budget?: string;
```

- [ ] **Step 3: Implémentation** — `src/lib/parse.ts` :

1. `parseCourses` : structure de retour devient `{ items, budget? }` et la boucle gère les nouveaux cas :

```ts
function parseCourses(
  text: string,
  section: string,
  warnings: string[],
  seen: Set<string>,
): { items: CourseItem[]; budget?: string } {
  const out: { items: CourseItem[]; budget?: string } = { items: [] };
  let rayon = 'divers';
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      rayon = slugify(h[1]);
      continue;
    }
    const budget = line.match(/^\s*[-*]\s+budget\s*:\s*(.+?)\s*$/);
    if (budget) {
      out.budget = budget[1];
      continue;
    }
    const it = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (it) {
      const withBox = it[1].match(/^\[( |x|X)\]\s+(.+)$/);
      const labelBrut = withBox ? withBox[2] : it[1];
      // v2 : suffixes optionnels en fin de ligne — ` · rituel` (alimente le batch)
      // et ` | note` (note de fraîcheur). L'id est calculé sur le libellé nettoyé.
      const rituel = / · rituel$/.test(labelBrut);
      const sansRituel = labelBrut.replace(/ · rituel$/, '');
      const parts = sansRituel.split(/\s+\|\s+(?=[^|]*$)/, 2);
      const label = parts[0].trim();
      const note = parts[1];
      const id = `courses:${rayon}:${slugify(label)}`;
      registerId(id, section, seen, warnings);
      out.items.push({
        id,
        rayon,
        label,
        ...(rituel ? { rituel: true } : {}),
        ...(note ? { note } : {}),
      });
      continue;
    }
    if (line.trim()) warnings.push(`Ligne ignorée (${section}) : « ${preview(line)} »`);
  }
  return out;
}
```

2. `parseWeeklyFile` : consommer le nouvel objet —

```ts
  const coursesParse = parseCourses(sections.get('courses') ?? '', 'courses', warnings, seen);
  const courses = coursesParse.items;
```

et dans le `data` de retour :

```ts
      courses,
      ...(coursesParse.budget ? { budget: coursesParse.budget } : {}),
```

3. `parseRecettes` : étendre la regex kv (ligne 332) avec `fraicheur` :

```ts
    const kv = line.match(
      /^(temps|kcal|proteines|glucides|lipides|score|image|bases|fraicheur)\s*:\s*(.+?)\s*$/,
    );
```

avec la branche (à placer avec les autres `else if`) :

```ts
      else if (kv[1] === 'fraicheur') rec.fraicheur = kv[2];
```

et ajouter avant le match `- pour` :

```ts
    const portions = line.match(/^\s*[-*]\s+portions\s+(marc|melanie)\s*:\s*(.+?)\s*$/);
    if (portions) {
      rec.portions = { ...rec.portions, [portions[1]]: portions[2] };
      continue;
    }
```

- [ ] **Step 4: Vert** → `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 5: Commit**

```bash
git add src/lib/model.ts src/lib/parse.ts tests/parse.test.ts
git commit -m "feat: parse v2 — budget, marqueur rituel, note fraîcheur, portions et fraîcheur recettes"
```

---

### Task 5 : Semaine d'exemple enrichie

Fichier : `src/assets/semaine-exemple.md`. **Conservations impératives** : frontmatter (S37, menu A, dates), 7 jours avec `diner-famille → R1…R7`, 5 étapes rituel, 3 micro-batch (lundi/mardi/samedi), 5 tâches batch, 7 recettes, **même nombre d'items par rayon** (l'e2e asserte `0/5` protéines et keto). Seuls les **labels** s'enrichissent.

- [ ] **Step 1: Enrichir `## Courses`** — ajouter en tête de section (avant `### Protéines`) :

```md
- budget: ≈ 35 €
```

Puis remplacer les items (quantités + 6 marqueurs rituel + 1 note) :

```md
### Protéines
- Cuisses de poulet — 8 (famille) · rituel
- Filet de dinde — 600 g
- Haché 5 % — 600 g
- Œufs — ×20 · rituel (6 en durs)
- Thon — 2 boîtes
### Laitiers
- Skyr — 4×150 g
- Emmental râpé — 200 g
- Fromage frais — 200 g
- Yaourts grecs — 4
### Féculents
- Riz basmati — 500 g · rituel
- Pâtes — 500 g
- Quinoa — 300 g · rituel
- Galettes complètes — 8
- Pain complet — 1
### Légumes
- Courgettes — 4 · rituel
- Poivrons — 2
- Épinards — 250 g
- Carottes — 1 kg · rituel
- Salade | à acheter vendredi, pas avant
- Tomates — 6
- Oignons — 3
- Brocolis — 500 g (surgelés OK)
### Fruits
- Bananes — 4 (navettes)
- Pommes — 4
- Fruits rouges — 300 g (skyr)
- Citron — 2
### Divers
- Amandes/noix
- Huile d'olive
- Tomates concassées
- Chocolat noir 70 %
- Sauce soja, gingembre, miel
- Parmesan (courgettes spaghetti Mél)
### Keto
- Avocats — ×3-4
- Beurre — 250 g · crème fraîche
- Chocolat noir ≥ 85 %
- Olives — 1 bocal
- Baies surgelées — 300 g
```

- [ ] **Step 2: Enrichir les 7 recettes** — ajouter à chacune, après la ligne `score:` (avant `image:`), `fraicheur:` + `- portions marc:` + `- portions melanie:` :

```md
R1 : fraicheur: batch dimanche → boîte frigo
     - portions marc: riz 150 g cuit · 2 cuisses + légumes rôtis
     - portions melanie: poulet + légumes rôtis ×2 (sans riz ni patate douce)
R2 : fraicheur: sauce batchée mercredi → frigo 3 j
     - portions marc: pâtes 120 g cuites + bolo
     - portions melanie: bolo sur courgettes spaghetti (sans pâtes)
R3 : fraicheur: cuisson du jour
     - portions marc: 4 œufs + jambon + pommes vapeur
     - portions melanie: 2 œufs + salade + ½ avocat (sans pommes)
R4 : fraicheur: riz batché lundi → frigo
     - portions marc: poulet 180 g + riz 150 g
     - portions melanie: poulet + légumes verts ×2 (sans riz)
R5 : fraicheur: haché bolo de mercredi → à consommer vendredi
     - portions marc: 2 galettes + crudités
     - portions melanie: bowl sans galette + guacamole
R6 : fraicheur: œufs durs du batch → frigo
     - portions marc: 2 tartines + 2 œufs + soupe
     - portions melanie: soupe réduite + 2 œufs (sans tartines)
R7 : fraicheur: GROS BATCH dimanche → boîte lundi
     - portions marc: quinoa 150 g + dinde 180 g
     - portions melanie: dinde + gratin ×2 (sans quinoa)
```

- [ ] **Step 3: Ajuster les tests de libellés exacts** — grep `'Pâtes'`, `'Œufs'`, `'Cuisses de poulet'`, `'Salade'` dans `tests/parse.test.ts` et `tests/app.test.tsx` : remplacer les libellés dépassés (ex. `label === 'Pâtes'` → `label === 'Pâtes — 500 g'`). **Ne pas toucher** aux comptes (rayons ≥ 5, courses ≥ 30, recettes 7, dinerFamille chaque jour). Les labels parsés sont les libellés NETTOYÉS (sans ` · rituel` ni ` | note`).
- [ ] **Step 4: Vert** → `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 5: Commit**

```bash
git add src/assets/semaine-exemple.md tests/parse.test.ts tests/app.test.tsx
git commit -m "feat: semaine d'exemple enrichie — budget, quantités, rituel, portions, fraîcheur"
```

---

### Task 6 : Courses — bannière rituel + marqueurs + Mode magasin

- [ ] **Step 1: TESTS (rouge)** — dans `tests/components.test.tsx`, dans le describe ShoppingList existant (adapter le fixture `items` local) :

```tsx
it('affiche la bannière rituel avec le budget de la semaine', () => {
  render(<ShoppingList items={items} semaine="2026-S37" budget="≈ 35 €" />);
  const ban = document.querySelector('.batch-banner');
  expect(ban).not.toBeNull();
  expect(ban).toHaveTextContent(/Pensées pour le rituel/);
  expect(ban).toHaveTextContent('≈ 35 €');
});

it('n’affiche pas de budget quand la semaine n’en a pas', () => {
  render(<ShoppingList items={items} semaine="2026-S37" />);
  const ban = document.querySelector('.batch-banner');
  expect(ban).toHaveTextContent(/Pensées pour le rituel/);
  expect(ban?.textContent).not.toContain('€');
});

it('affiche le marqueur rituel et la note sur les items concernés', () => {
  const itemsMarques = [
    { id: 'courses:p:poulet', rayon: 'proteines', label: 'Poulet — 1 kg', rituel: true },
    {
      id: 'courses:p:saumon',
      rayon: 'proteines',
      label: 'Pavés de saumon — 2',
      note: 'poisson frais : vendredi, pas avant',
    },
  ];
  render(<ShoppingList items={itemsMarques} semaine="2026-S37" />);
  expect(document.querySelector('.item-rituel')).toHaveTextContent('rituel');
  expect(document.querySelector('.item-note')).toHaveTextContent('poisson frais : vendredi, pas avant');
});

it('Mode magasin masque les items cochés ; Tout revoir les remontre', async () => {
  const user = userEvent.setup();
  render(<ShoppingList items={items} semaine="2026-S37" />);
  await user.click(screen.getAllByRole('checkbox')[0]);
  const cochesAvant = screen.getAllByRole('checkbox').filter((c) => (c as HTMLInputElement).checked);
  expect(cochesAvant.length).toBe(1);
  await user.click(screen.getByRole('button', { name: /Mode magasin/ }));
  expect(screen.getAllByRole('checkbox').every((c) => !(c as HTMLInputElement).checked)).toBe(true);
  await user.click(screen.getByRole('button', { name: /Tout revoir/ }));
  expect(screen.getAllByRole('checkbox').length).toBe(items.length);
});
```

- [ ] **Step 2: Checklist — prop `renderLabel`** — `src/components/Checklist.tsx` (état + toggle inchangés) :

```tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ChecklistItem } from '../lib/model';
import { getChecks, setCheck } from '../lib/storage';

export function Checklist({
  items,
  semaine,
  onChecksChange,
  renderLabel,
}: {
  items: ChecklistItem[];
  semaine: string;
  onChecksChange?: (checks: Record<string, boolean>) => void;
  renderLabel?: (item: ChecklistItem) => ReactNode;
}) {
  // … useState checks / syncedSemaine / toggle INCHANGÉS …
  return (
    <ul className="checklist">
      {items.map((it) => (
        <li key={it.id}>
          <label className={checks[it.id] ? 'done' : ''}>
            <input type="checkbox" checked={!!checks[it.id]} onChange={() => toggle(it)} />
            {renderLabel ? renderLabel(it) : <span>{it.label}</span>}
          </label>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: ShoppingList** — réécrire `src/components/cuisine/ShoppingList.tsx` :

```tsx
import { useMemo, useState } from 'react';
import type { CourseItem } from '../../lib/model';
import { imagePourRayon } from '../../lib/rayons';
import { getChecks } from '../../lib/storage';
import { capitalize } from '../../lib/text';
import { Checklist } from '../Checklist';
import { Icon } from '../Icon';

export function ShoppingList({
  items,
  semaine,
  budget,
}: {
  items: CourseItem[];
  semaine: string;
  budget?: string;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => getChecks(semaine));
  const [syncedSemaine, setSyncedSemaine] = useState(semaine);
  const [magasin, setMagasin] = useState(false);
  if (syncedSemaine !== semaine) {
    setSyncedSemaine(semaine);
    setChecks(getChecks(semaine));
  }

  const groups = useMemo(() => {
    const grouped = new Map<string, CourseItem[]>();
    for (const it of items) {
      const list = grouped.get(it.rayon);
      if (list) list.push(it);
      else grouped.set(it.rayon, [it]);
    }
    return [...grouped.entries()].map(([rayon, groupItems]) => ({ rayon, items: groupItems }));
  }, [items]);

  if (items.length === 0) {
    return <p className="muted">Aucune course pour cette semaine.</p>;
  }

  const visibles = (list: CourseItem[]) => (magasin ? list.filter((it) => !checks[it.id]) : list);
  const total = items.length;
  const done = items.reduce((acc, it) => acc + (checks[it.id] ? 1 : 0), 0);
  const labelCourse = (it: CourseItem) => (
    <span className="course-label">
      <span>
        {it.label}
        {it.rituel && (
          <span className="item-rituel">
            <Icon name="pot" size={12} /> rituel
          </span>
        )}
      </span>
      {it.note && <span className="item-note">{it.note}</span>}
    </span>
  );
  return (
    <div>
      <div className="batch-banner">
        <span className="bb-ic">
          <Icon name="pot" size={16} />
        </span>
        <span>
          <b>Pensées pour le rituel</b> — les items marqués <Icon name="pot" size={12} />{' '}
          alimentent le batch de dimanche.
          {budget ? ` ${budget} estimés.` : ''}
        </span>
      </div>
      <p className="progress">
        {done}/{total} cochés
        <progress value={done} max={total} />
        <button
          type="button"
          className="mm"
          aria-pressed={magasin}
          onClick={() => setMagasin(!magasin)}
        >
          <Icon name="cart" size={12} /> {magasin ? 'Tout revoir' : 'Mode magasin'}
        </button>
      </p>
      {[...groups]
        .sort((a, b) => Number(a.rayon === 'keto') - Number(b.rayon === 'keto'))
        .map(({ rayon, items: groupItems }) => {
          const faits = groupItems.filter((it) => checks[it.id]).length;
          const affiches = visibles(groupItems);
          if (affiches.length === 0) return null;
          return rayon === 'keto' ? (
            <section className="keto-box" key={rayon}>
              <h3 className="keto-title">
                <Icon name="leaf" size={14} /> Les extras keto de Mélanie{' '}
                <span className="rayon-cnt">
                  {faits}/{groupItems.length}
                </span>
              </h3>
              <Checklist
                items={affiches}
                semaine={semaine}
                onChecksChange={(groupChecks) => setChecks((prev) => ({ ...prev, ...groupChecks }))}
                renderLabel={labelCourse}
              />
            </section>
          ) : (
            <section className="course-group" key={rayon}>
              <header className="course-group-header">
                <img
                  src={imagePourRayon(rayon)}
                  alt={capitalize(rayon)}
                  loading="lazy"
                  width={72}
                  height={54}
                />
                <h3>{capitalize(rayon)}</h3>
                <span className="rayon-cnt">
                  {faits}/{groupItems.length}
                </span>
              </header>
              <Checklist
                items={affiches}
                semaine={semaine}
                onChecksChange={(groupChecks) => setChecks((prev) => ({ ...prev, ...groupChecks }))}
                renderLabel={labelCourse}
              />
            </section>
          );
        })}
      {magasin && done === total && <p className="muted">Tout est coché — bonne course 👋</p>}
    </div>
  );
}
```

`CuisineView.tsx` : `{tab === 'courses' && <ShoppingList items={data.courses} semaine={semaine} budget={data.budget} />}`.

- [ ] **Step 4: CSS** — ajouter dans `src/index.css` :

```css
/* Bannière rituel (Courses + Batch « Ce soir ») */
.batch-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 9%, var(--surface));
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
  margin-bottom: 14px;
}
.batch-banner b {
  font-weight: 700;
}
.bb-ic {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 18%, var(--surface));
  color: var(--accent);
}
.batch-banner.ce-soir .bb-ic {
  background: color-mix(in srgb, var(--accent-2) 30%, var(--surface));
  color: var(--text);
}

/* Marqueurs item course */
.course-label {
  display: block;
}
.item-rituel {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}
.item-note {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
}

/* Mode magasin */
.mm {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 999px;
  padding: 6px 12px;
  min-height: 36px;
  font-size: 12px;
  font-weight: 600;
}
.mm[aria-pressed='true'] {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
}
```

Et passer `.progress` en flex s'il ne l'est pas : `display: flex; align-items: center; gap: 8px; flex-wrap: wrap;`.

- [ ] **Step 5: Vert** → `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: courses — bannière rituel, marqueur casserole, note fraîcheur, Mode magasin"
```

---

### Task 7 : Menu v2 — réserve de recettes

Réécriture de `src/components/cuisine/MenuView.tsx` : la carte remplace `menu-day`/`menu-row` ; le contenu de `RecetteCard` devient `RecetteDetail` (macros + health score conservés, déplacés dans le déplié).

- [ ] **Step 1: TESTS (rouge)** — dans `tests/components.test.tsx` : **supprimer** les describes MenuView (ordre des jours, badges today/past) et RecetteCard, les remplacer par (fixture : `parseWeeklyFile` sur un .md contenant la semaine d'exemple actuelle — 32 lignes repas : 5+5+4+4+4+5+5) :

```tsx
describe('MenuView v2 — réserve de recettes', () => {
  const semaine37 = parseWeeklyFile(fs.readFileSync(new URL('../src/assets/semaine-exemple.md', import.meta.url), 'utf-8')).data;

  it('une carte par ligne repas, ordre chronologique lundi → dimanche, pas de badge Aujourd’hui', () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00')); // mercredi
    render(
      <MenuView
        menu={semaine37.menu}
        recettes={semaine37.recettes}
        bases={semaine37.bases}
        semaine={semaine37.meta.semaine}
      />,
    );
    const cartes = screen.getAllByRole('article');
    expect(cartes.length).toBe(32);
    expect(cartes[0]).toHaveTextContent('Boîte dinde-quinoa (batch dim) + légumes'); // lundi d'abord
    expect(document.querySelector('.today-badge')).toBeNull();
    vi.useRealTimers();
  });

  it('la coche « c’est fait » coche la carte seule et persiste dans sportapp:checks', async () => {
    const user = userEvent.setup();
    render(<MenuView menu={semaine37.menu} recettes={semaine37.recettes} semaine={semaine37.meta.semaine} />);
    const premiere = screen.getAllByRole('article')[0];
    await user.click(within(premiere).getByRole('checkbox'));
    expect(premiere).toHaveClass('fait');
    expect(JSON.parse(localStorage.getItem('sportapp:checks:2026-S37')!)['menu:lundi:dejeunerMarc']).toBe(true);
  });

  it('compteur N/M faits + barre de progression', async () => {
    const user = userEvent.setup();
    render(<MenuView menu={semaine37.menu} recettes={semaine37.recettes} semaine={semaine37.meta.semaine} />);
    expect(document.querySelector('.menu-reserve-head')).toHaveTextContent('0/32 faits');
    await user.click(screen.getAllByRole('article')[0].querySelector('input[type="checkbox"]')!);
    expect(document.querySelector('.menu-reserve-head')).toHaveTextContent('1/32 faits');
  });

  it('carte avec recette : temps + kcal + portions + fraîcheur + fiche dépliable', async () => {
    const user = userEvent.setup();
    render(
      <MenuView
        menu={semaine37.menu}
        recettes={semaine37.recettes}
        bases={semaine37.bases}
        semaine={semaine37.meta.semaine}
      />,
    );
    const carte = screen.getAllByRole('article')[2]; // lundi diner-famille → R1
    expect(within(carte).getByText('45 min')).toBeInTheDocument();
    expect(within(carte).getByText('680 kcal')).toBeInTheDocument();
    const portions = carte.querySelector('.portions-box');
    expect(portions).toHaveTextContent('riz 150 g cuit');
    expect(portions).toHaveTextContent('sans riz ni patate douce');
    expect(within(carte).getByText(/batch dimanche/)).toBeInTheDocument(); // fraîcheur
    expect(carte.querySelector('.recette-etapes')).toBeNull(); // repliée
    await user.click(within(carte).getByRole('button', { name: /Voir la recette/ }));
    expect(carte.querySelector('.recette-etapes li')).not.toBeNull();
    expect(within(carte).getAllByText(/48/).length).toBeGreaterThan(0); // macros protéines dans le déplié
  });

  it('les cartes sans recette restent simples (pas de bouton)', () => {
    render(<MenuView menu={semaine37.menu} recettes={semaine37.recettes} semaine={semaine37.meta.semaine} />);
    const premiere = screen.getAllByRole('article')[0];
    expect(within(premiere).queryByRole('button', { name: /Voir la recette/ })).toBeNull();
  });

  it('les chips batch affichent les bases de la recette', () => {
    render(
      <MenuView
        menu={semaine37.menu}
        recettes={semaine37.recettes}
        bases={semaine37.bases}
        semaine={semaine37.meta.semaine}
      />,
    );
    const carteR2 = screen
      .getAllByRole('article')
      .find((c) => c.textContent?.includes('Pâtes bolognaise'))!;
    expect(carteR2.querySelector('.mchips')).toHaveTextContent('Vinaigrette minute');
  });
});
```

*(imports à ajouter : `fs` node + `parseWeeklyFile`, `within` de Testing Library — réutiliser les imports existants du fichier.)*

- [ ] **Step 2: Implémentation** — réécrire `src/components/cuisine/MenuView.tsx` :

```tsx
import { useState } from 'react';
import type { BaseCuisine, MealKey, MenuDay, Recette } from '../../lib/model';
import { recetteParRef } from '../../lib/stats';
import { getChecks, setCheck } from '../../lib/storage';
import { Icon } from '../Icon';

const MEALS: Array<[MealKey, string, string]> = [
  ['dejeunerMarc', 'Marc', 'tag-marc'],
  ['dejeunerMelanie', 'Mél', 'tag-mel'],
  ['dinerFamille', 'Famille', 'tag-fam'],
  ['dinerMelanie', 'Mél', 'tag-mel'],
  ['batch', 'Batch', 'tag-bat'],
];

const ICONES_REPAS: Record<MealKey, 'bowl' | 'meat' | 'pot'> = {
  dejeunerMarc: 'bowl',
  dejeunerMelanie: 'bowl',
  dinerFamille: 'meat',
  dinerMelanie: 'bowl',
  batch: 'pot',
};

export interface Occurrence {
  id: string;
  jour: string;
  cle: MealKey;
  tag: string;
  tagClass: string;
  texte: string;
  recette?: Recette;
}

// Menu v2 : 1 ligne repas = 1 occurrence indépendante (aucun jour imposé).
// L'ordre est chronologique — les .md bien rédigés placent batch/frigo d'abord.
export function construireOccurrences(menu: MenuDay[], recettes: Recette[]): Occurrence[] {
  const out: Occurrence[] = [];
  for (const day of menu) {
    for (const [cle, tag, tagClass] of MEALS) {
      const texte = day[cle];
      if (!texte) continue;
      const ref = day.recetteRefs?.[cle];
      out.push({
        id: `menu:${day.jour.trim().toLowerCase()}:${cle}`,
        jour: day.jour,
        cle,
        tag,
        tagClass,
        texte,
        ...(ref ? { recette: recetteParRef(ref, recettes) } : {}),
      });
    }
  }
  return out;
}

export function MenuView({
  menu,
  recettes = [],
  bases = [],
  semaine,
}: {
  menu: MenuDay[];
  recettes?: Recette[];
  bases?: BaseCuisine[];
  semaine: string;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => getChecks(semaine));
  const [syncedSemaine, setSyncedSemaine] = useState(semaine);
  if (syncedSemaine !== semaine) {
    setSyncedSemaine(semaine);
    setChecks(getChecks(semaine));
  }

  const occurrences = construireOccurrences(menu, recettes);
  if (occurrences.length === 0) {
    return <p className="muted">Aucun menu pour cette semaine.</p>;
  }
  const faites = occurrences.filter((o) => checks[o.id]).length;
  const toggle = (id: string) => {
    const next = !checks[id];
    setCheck(semaine, id, next);
    setChecks((prev) => ({ ...prev, [id]: next }));
  };

  return (
    <div className="menu-reserve">
      <div className="menu-reserve-head">
        <p className="menu-reserve-note">
          Pas de jour imposé — ordre conseillé : batch/frigo d'abord, frais en dernier.
        </p>
        <p className="progress">
          <Icon name="check" size={13} /> <b>{faites}/{occurrences.length}</b> faits
          <progress value={faites} max={occurrences.length} />
        </p>
      </div>
      {occurrences.map((o) => (
        <MealCard
          key={o.id}
          occ={o}
          bases={bases}
          fait={!!checks[o.id]}
          onToggle={() => toggle(o.id)}
        />
      ))}
    </div>
  );
}

function MealCard({
  occ,
  bases,
  fait,
  onToggle,
}: {
  occ: Occurrence;
  bases?: BaseCuisine[];
  fait: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const r = occ.recette;
  const tempsCourt = r?.temps?.split('·')[0]?.trim();
  const chips = r
    ? r.bases?.length
      ? r.bases.map((b) => trouverBase(b, bases)).filter((b): b is BaseCuisine => !!b)
      : [{ id: 'cuisson-du-jour', nom: 'Cuisson du jour', texte: '' }]
    : [];
  return (
    <article
      className={fait ? 'menu-card fait' : 'menu-card'}
      aria-label={`${occ.jour} — ${occ.texte}`}
    >
      <div className="menu-card-top">
        <label className="menu-coche">
          <input
            type="checkbox"
            checked={fait}
            onChange={onToggle}
            aria-label={`${occ.texte} — marquer comme fait`}
          />
          <span className="menu-coche-box">
            <Icon name="check" size={14} strokeWidth={2.5} />
          </span>
        </label>
        <div className="mtile">
          <Icon name={ICONES_REPAS[occ.cle]} size={20} />
        </div>
        <div className="mt">
          <span className={`mtag ${occ.tagClass}`}>{occ.tag}</span>
          <div className="mname">{occ.texte}</div>
          {(tempsCourt || r?.kcal != null) && (
            <div className="mmeta">
              {tempsCourt && (
                <span>
                  <Icon name="clock" size={11} /> {tempsCourt}
                </span>
              )}
              {r?.kcal != null && (
                <span>
                  <Icon name="flame" size={11} /> {r.kcal} kcal
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {(chips.length > 0 || r?.fraicheur) && (
        <div className="menu-card-meta">
          {chips.length > 0 && (
            <div className="mchips">
              {chips.map((b) => (
                <span className="mchip" key={b.id}>
                  {b.nom}
                </span>
              ))}
            </div>
          )}
          {r?.fraicheur && (
            <div className="mh">
              <Icon name="box" size={11} /> {r.fraicheur}
            </div>
          )}
        </div>
      )}
      {r?.portions && (r.portions.marc || r.portions.melanie) && (
        <div className="portions-box">
          <div className="portions-title">Portions</div>
          {r.portions.marc && (
            <p>
              <span className="portion-tag">Marc</span> {r.portions.marc}
            </p>
          )}
          {r.portions.melanie && (
            <p>
              <span className="portion-tag keto">Mél</span> {r.portions.melanie}
            </p>
          )}
        </div>
      )}
      {r && (
        <button type="button" className="rtoggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span>Voir la recette</span>
          <span className={open ? 'chev up' : 'chev'}>
            <Icon name="chev" size={12} />
          </span>
        </button>
      )}
      {open && r && <RecetteDetail recette={r} bases={bases} />}
    </article>
  );
}

function RecetteDetail({ recette, bases }: { recette: Recette; bases?: BaseCuisine[] }) {
  const [baseOuverte, setBaseOuverte] = useState<string | null>(null);
  const aMacros =
    recette.kcal != null ||
    recette.proteines != null ||
    recette.glucides != null ||
    recette.lipides != null;
  return (
    <div className="recette-detail open">
      {aMacros && (
        <div className="recette-nutri">
          {recette.kcal != null && (
            <span>
              <Icon name="flame" size={11} /> {recette.kcal} kcal
            </span>
          )}
          {recette.glucides != null && (
            <span>
              <Icon name="wheat" size={11} /> {recette.glucides}g C
            </span>
          )}
          {recette.proteines != null && (
            <span>
              <Icon name="meat" size={11} /> {recette.proteines}g P
            </span>
          )}
          {recette.lipides != null && (
            <span>
              <Icon name="drop" size={11} /> {recette.lipides}g F
            </span>
          )}
        </div>
      )}
      {recette.score != null && (
        <div className="recette-score">
          <div className="recette-score-head">
            <span className="stat-label">Health score :</span>
            <span className="recette-score-value">
              {recette.score}
              <small>/10</small>
            </span>
          </div>
          <div className="score-bar">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < recette.score! ? 'score-seg on' : 'score-seg'} />
            ))}
          </div>
        </div>
      )}
      {recette.pour && <p className="recette-pour">{recette.pour}</p>}
      {recette.bases && recette.bases.length > 0 && (
        <div className="recette-bases">
          {recette.bases.map((b) => {
            const base = trouverBase(b, bases);
            return base ? (
              <button
                type="button"
                key={base.id}
                className={baseOuverte === base.id ? 'recette-bchip on' : 'recette-bchip'}
                aria-expanded={baseOuverte === base.id}
                onClick={() => setBaseOuverte(baseOuverte === base.id ? null : base.id)}
              >
                🧂 {base.nom}
              </button>
            ) : null;
          })}
        </div>
      )}
      {baseOuverte &&
        bases
          ?.filter((b) => b.id === baseOuverte)
          .map((b) => (
            <p className="recette-bdesc" key={b.id}>
              🧂 {b.nom} : {b.texte}
            </p>
          ))}
      {recette.etapes && recette.etapes.length > 0 && (
        <ol className="recette-etapes">
          {recette.etapes.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
      )}
      {recette.mel && <p className="recette-ligne recette-mel">{recette.mel}</p>}
      {recette.batch && <p className="recette-ligne recette-bat">{recette.batch}</p>}
    </div>
  );
}

function trouverBase(ref: string, bases: BaseCuisine[] | undefined): BaseCuisine | undefined {
  if (!bases) return undefined;
  const cible = ref.toLowerCase();
  // égalité exacte d'abord, puis préfixe borné (`b4` ne doit pas matcher `b40-…`)
  return bases.find((b) => b.id === cible) ?? bases.find((b) => b.id.startsWith(`${cible}-`));
}
```

`CuisineView.tsx` : `<MenuView menu={data.menu} recettes={data.recettes} bases={data.bases} semaine={semaine} />`.

- [ ] **Step 3: CSS** — dans `src/index.css`, **supprimer** les familles `.menu-day*`, `.today-badge`, `.past-badge`, `.menu-row`, `.menu-tag`/`.tag-keto` (remplacées par `.mtag`), et `.recette-card`, `.recette-top`, `.recette-thumb`, `.recette-fallback`, `.recette-main`, `.recette-nom`, `.recette-toggle`, `.recette-badges`, `.recette-badge-cat`. **Conserver** `.recette-detail`, `.recette-etapes`, `.recette-bases`, `.recette-bchip`, `.recette-bdesc`, `.recette-nutri`, `.recette-score`, `.score-bar`, `.recette-pour`, `.recette-ligne`. **Ajouter** :

```css
/* Menu v2 — réserve de recettes */
.menu-reserve-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.menu-reserve-note {
  font-size: 12.5px;
  color: var(--muted);
  flex: 1 1 100%;
  min-width: 0;
}
.menu-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  margin-bottom: 12px;
}
.menu-card.fait .mname {
  color: var(--muted);
  text-decoration: line-through;
}
.menu-card-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.menu-coche {
  flex-shrink: 0;
  margin-top: 2px;
  cursor: pointer;
  position: relative;
}
.menu-coche input {
  position: absolute;
  opacity: 0;
  width: 24px;
  height: 24px;
}
.menu-coche-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 2px solid var(--border);
  color: transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.menu-coche input:checked + .menu-coche-box {
  background: var(--accent);
  border-color: var(--accent);
  color: #ffffff;
}
.menu-coche input:focus-visible + .menu-coche-box {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.mtile {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
}
.mt {
  min-width: 0;
  flex: 1;
}
.mtag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 2px 8px;
  margin-bottom: 4px;
}
.mtag.tag-marc {
  background: var(--accent);
  color: #ffffff;
}
.mtag.tag-mel {
  background: color-mix(in srgb, var(--accent-2) 55%, var(--surface));
  color: var(--text);
}
.mtag.tag-fam {
  background: var(--surface-2);
  color: var(--text);
}
.mtag.tag-bat {
  background: color-mix(in srgb, var(--accent) 20%, var(--surface));
  color: var(--accent);
}
.mname {
  font-weight: 600;
  font-size: 14.5px;
  line-height: 1.35;
}
.mmeta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
.mmeta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.menu-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.mchips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mchip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text);
}
.mh {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
}
.portions-box {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 7%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 15%, var(--border));
}
.portions-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 4px;
}
.portions-box p {
  font-size: 13px;
  line-height: 1.5;
  margin: 2px 0;
}
.portion-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 1px 8px;
  margin-right: 6px;
  background: var(--accent);
  color: #ffffff;
}
.portion-tag.keto {
  background: color-mix(in srgb, var(--accent-2) 70%, var(--surface));
  color: var(--text);
}
.rtoggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  min-height: 48px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}
.rtoggle .chev {
  display: inline-flex;
  color: var(--muted);
  transition: transform 0.2s;
}
.rtoggle .chev.up {
  transform: rotate(180deg);
}
```

- [ ] **Step 4: Vert + e2e menu** — `npm test && npm run typecheck && npm run lint`, puis remplacer les 2 tests menu de `tests/e2e/cuisine.spec.ts` par :

```ts
test('menu : réserve de recettes — 32 cartes, coche persistée, fiche dépliable', async ({ page }) => {
  await page.goto(ORIGIN);
  await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('.menu-card')).toHaveCount(32);
  await expect(page.locator('.menu-reserve-head')).toContainText('0/32 faits');

  const carte = page.locator('.menu-card').nth(2); // lundi diner-famille → R1
  await carte.locator('input[type="checkbox"]').check();
  await expect(carte).toHaveClass(/fait/);
  await page.reload();
  await expect(page.locator('.menu-card').nth(2)).toHaveClass(/fait/);

  await expect(carte.locator('.recette-etapes')).toHaveCount(0);
  await carte.locator('.rtoggle').click();
  await expect(carte.locator('.recette-etapes li').first()).toBeVisible();
  await expect(carte.locator('.rtoggle')).toHaveAttribute('aria-expanded', 'true');
  await carte.locator('.rtoggle').click();
  await expect(carte.locator('.recette-etapes')).toHaveCount(0);
});
```

(l'ancien test `.menu-day` today/past et le test `.recette-card` sont supprimés)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: menu v2 — réserve de recettes en cartes (coche, portions, batch, fraîcheur)"
```

### Task 8 : Batch — bannière « Ce soir » + mode guidé

- [ ] **Step 1: TESTS (rouge)** — dans `tests/components.test.tsx`, adapter le describe BatchView (le test « sans bannière » disparaît) :

```tsx
it('affiche la bannière Ce soir uniquement quand le micro-batch contient aujourd’hui', () => {
  vi.setSystemTime(new Date('2026-09-07T10:00:00')); // lundi — micro-batch lundi ✓
  render(<BatchView rituel={rituel} microBatch={micro} semaine="2026-S37" />);
  const ban = document.querySelector('.batch-banner.ce-soir');
  expect(ban).toHaveTextContent('Ce soir (lundi)');
  expect(ban).toHaveTextContent('doubler le plat');
  vi.useRealTimers();
});

it('pas de bannière Ce soir les autres jours', () => {
  vi.setSystemTime(new Date('2026-09-09T10:00:00')); // mercredi
  render(<BatchView rituel={rituel} microBatch={micro} semaine="2026-S37" />);
  expect(document.querySelector('.batch-banner.ce-soir')).toBeNull();
  vi.useRealTimers();
});

it('mode guidé : Lancer le batch → étape par étape → écran terminé → retour aperçu (sans cocher)', async () => {
  const user = userEvent.setup();
  render(<BatchView rituel={rituel} microBatch={[]} semaine="2026-S37" />);
  await user.click(screen.getByRole('button', { name: /Lancer le batch/ }));
  expect(document.querySelector('.guide-etape-num')).toHaveTextContent('Étape 1/5');
  expect(document.querySelector('.guide-titre')).toHaveTextContent('Four à 180°');
  await user.click(screen.getByRole('button', { name: 'Étape terminée →' }));
  expect(document.querySelector('.guide-etape-num')).toHaveTextContent('Étape 2/5');
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Étape terminée →' }));
  await user.click(screen.getByRole('button', { name: /Terminer le batch/ }));
  expect(screen.getByText('Batch terminé !')).toBeInTheDocument();
  // présentation pure : aucune coche de timeline posée
  expect(screen.queryByRole('checkbox')).toBeNull();
  await user.click(screen.getByRole('button', { name: /Revenir à l'aperçu/ }));
  expect(document.querySelector('.rituel-timeline')).not.toBeNull();
  expect(screen.getAllByRole('checkbox').every((c) => !(c as HTMLInputElement).checked)).toBe(true);
});
```

*(noms du fixture rituel à adapter aux textes réels du test existant — `Four à 180°` = 1ʳᵉ étape de la semaine d'exemple.)*

- [ ] **Step 2: Implémentation** — `src/components/cuisine/BatchView.tsx` :

```tsx
import { useRef, useState } from 'react';
import type { MicroBatchJour, RituelEtape } from '../../lib/model';
import { getChecks, setCheck } from '../../lib/storage';
import { todayKey } from '../../lib/dates';
import { capitalize } from '../../lib/text';
import { Icon } from '../Icon';

export function BatchView({
  rituel,
  microBatch,
  semaine,
}: {
  rituel?: RituelEtape[];
  microBatch?: MicroBatchJour[];
  semaine: string;
}) {
  const [mode, setMode] = useState<'apercu' | 'run' | 'fini'>('apercu');
  const [idx, setIdx] = useState(0);
  const hasRituel = !!rituel?.length;
  const hasMicro = !!microBatch?.length;
  const ceSoir = microBatch?.find((m) => m.jour === todayKey());

  return (
    <>
      {ceSoir && (
        <div className="batch-banner ce-soir">
          <span className="bb-ic">
            <Icon name="moon" size={16} />
          </span>
          <span>
            <b>Ce soir ({capitalize(ceSoir.jour)})</b> — {ceSoir.quoi}
          </span>
        </div>
      )}
      {hasRituel && rituel && mode === 'apercu' && (
        <RituelTimeline
          etapes={rituel}
          semaine={semaine}
          onLancer={() => {
            setMode('run');
            setIdx(0);
          }}
        />
      )}
      {hasRituel && rituel && mode === 'run' && (
        <section className="batch-section batch-guide" aria-live="polite">
          <div className="guide-etape-num">
            Étape {idx + 1}/{rituel.length} · {rituel[idx].creneau}
          </div>
          <h3 className="guide-titre">{rituel[idx].label}</h3>
          {rituel[idx].detail && <p className="guide-detail">{rituel[idx].detail}</p>}
          <progress value={idx} max={rituel.length} aria-hidden="true" />
          <button
            type="button"
            className="btn"
            onClick={() => (idx + 1 < rituel.length ? setIdx(idx + 1) : setMode('fini'))}
          >
            {idx + 1 < rituel.length ? 'Étape terminée →' : 'Terminer le batch ✓'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setMode('apercu');
              setIdx(0);
            }}
          >
            Revenir à l'aperçu
          </button>
        </section>
      )}
      {hasRituel && mode === 'fini' && (
        <section className="batch-section batch-guide" aria-live="polite">
          <span className="guide-done-ic">
            <Icon name="check" size={28} strokeWidth={2.5} />
          </span>
          <h3 className="guide-titre">Batch terminé !</h3>
          <p className="guide-detail">Tout est prêt pour la semaine.</p>
          <button type="button" className="btn-ghost" onClick={() => setMode('apercu')}>
            Revenir à l'aperçu
          </button>
        </section>
      )}
      {hasMicro && mode === 'apercu' && microBatch && <MicroBatch jours={microBatch} />}
      {!hasRituel && !hasMicro && <p className="muted">Aucun batch prévu cette semaine.</p>}
    </>
  );
}
```

`RituelTimeline` : ajouter le prop `onLancer: () => void` et le bouton dans `.batch-section-head` :

```tsx
<button type="button" className="lancer" onClick={onLancer}>
  <Icon name="play" size={12} /> Lancer le batch
</button>
```

*(MicroBatch inchangé. Le mode guidé ne coche rien — décision firmée.)*

- [ ] **Step 3: CSS** — `.batch-banner.ce-soir` déjà écrit en Task 6 ; ajouter :

```css
.lancer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  padding: 8px 14px;
  min-height: 44px;
  background: var(--accent);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
}
.batch-guide {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 16px;
}
.guide-etape-num {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent);
}
.guide-titre {
  font-size: 19px;
  font-weight: 700;
}
.guide-detail {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.5;
}
.batch-guide progress {
  width: 100%;
}
.btn-ghost {
  min-height: 48px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: none;
  color: var(--text);
  font-weight: 600;
  padding: 0 16px;
}
.guide-done-ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 15%, var(--surface));
  color: var(--accent);
}
```

- [ ] **Step 4: Vert** → `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: batch — bannière Ce soir + mode guidé Lancer le batch"
```

---

### Task 9 : Swipe Cuisine ↔ Mon suivi

- [ ] **Step 1: E2E (rouge)** — dans `tests/e2e/dock.spec.ts`, ajouter au describe :

```ts
test('swipe horizontal bascule Cuisine ↔ Mon suivi', async ({ page }) => {
  await page.goto(ORIGIN);
  await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
  // swipe vers la gauche → Mon suivi
  await page.mouse.move(300, 400);
  await page.mouse.down();
  await page.mouse.move(100, 400, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.tabbar-segmented')).toHaveAttribute('data-active', 'suivi');
  // swipe vers la droite → Cuisine
  await page.mouse.move(100, 400);
  await page.mouse.down();
  await page.mouse.move(300, 400, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.tabbar-segmented')).toHaveAttribute('data-active', 'cuisine');
});
```

- [ ] **Step 2: Implémentation** — dans `src/App.tsx` :

```tsx
import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
```

Dans le composant (avant le return) :

```tsx
  // Swipe Cuisine ↔ Suivi (pointer events ; ignoré si reduced-motion ou geste
  // démarré sur un contrôle interactif).
  const swipeX = useRef<number | null>(null);
  const swipeY = useRef<number | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, input, textarea, select, label, a, .micro-batch')) return;
    swipeX.current = e.clientX;
    swipeY.current = e.clientY;
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const x0 = swipeX.current;
    const y0 = swipeY.current;
    swipeX.current = null;
    swipeY.current = null;
    if (x0 == null || y0 == null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;
    setTab(dx < 0 ? 'suivi' : 'cuisine');
  };
```

Et sur le `<main>` :

```tsx
      <main onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
```

- [ ] **Step 3: CSS** — sur `main` : ajouter `touch-action: pan-y;` (le swipe horizontal est capturé, le scroll vertical reste natif).
- [ ] **Step 4: e2e vert** — `npm run e2e` (les 2 projets 375/320) ; si WebKit ne déclenche pas les pointer events via `mouse`, basculer le test sur `page.touchscreen` + `hasTouch` (les projets Playwright du repo sont déjà en WebKit mobile).
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: swipe Cuisine ↔ Mon suivi"
```

---

### Task 10 : Restyle final — sous-onglets filets, suivi, bannière

- [ ] **Step 1: Sous-onglets Cuisine en filets** — CSS only (les classes `.cuisine-tabs`/`.tab`/`.active` sont conservées, les tests existants restent verts). Remplacer le bloc existant par :

```css
.cuisine-tabs {
  display: flex;
  gap: 22px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
  padding: 0 2px;
}
.cuisine-tabs .tab {
  position: relative;
  border: 0;
  background: none;
  min-height: 48px;
  padding: 0 2px;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--muted);
}
.cuisine-tabs .tab.active {
  color: var(--text);
}
.cuisine-tabs .tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2.5px;
  border-radius: 2px;
  background: var(--accent);
}
```

- [ ] **Step 2: WeekBanner — chevrons SVG** — dans `src/components/WeekBanner.tsx` : import `{ Icon } from './Icon'`, remplacer les deux glyphes `‹` / `›` par `<Icon name="chev-left" size={16} />` / `<Icon name="chev-right" size={16} />`. (Le bouton profil garde son svg inline.)
- [ ] **Step 3: StatCards — icônes sur les labels** — dans `src/components/StatCards.tsx` : import `{ Icon }`, et sur les 4 labels : Poids → `scale`, Kcal du jour → `flame`, Séances → `check`, Courses → `cart` :

```tsx
<span className="stat-label">
  <Icon name="scale" size={13} /> Poids
</span>
```

(idem pour les 3 autres) + CSS : `.stat-label { display: inline-flex; align-items: center; gap: 6px; }` (adapter si `.stat-label` a déjà d'autres règles — fusionner).
- [ ] **Step 4: Carte pesée citron** — dans `src/components/ProfileView.tsx`, la section « Suivi poids » (ligne 66) devient :

```tsx
      <section className="profile-section pesee-card">
```

+ CSS (à placer près de `.profile-section`) :

```css
.pesee-card {
  background: color-mix(in srgb, var(--accent-2) 26%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent-2) 45%, var(--border));
}
```

- [ ] **Step 5: Onboarding** — vérifier visuellement (CSS fait en Task 1) : gradients basilic/citron, textes blanc (marc) / encre (mél), émojis 💪 🌿 🚀 👋 conservés.
- [ ] **Step 6: Vérifier** — `npm test && npm run typecheck && npm run lint && npm run dev` (coup d'œil 320/375 : suivi, profil, onboarding).
- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: restyle final — sous-onglets filets, stat-cards, carte pesée citron, chevrons SVG"
```

---

### Task 11 : PWA aux couleurs Herbes

- [ ] **Step 1: `index.html`** — `theme-color` → `#F0F2EB` ; `apple-mobile-web-app-status-bar-style` → `default` (si présent).
- [ ] **Step 2: `vite.config.ts`** — manifest : `theme_color: '#F0F2EB'`, `background_color: '#F0F2EB'`.
- [ ] **Step 3: Icônes** — inspecter `public/icon-src.svg` : si un fond sombre y est codé en dur (`#1b1d24`/`#272932`…), le remplacer par `#F0F2EB`, puis `npm run icons` pour régénérer les PNG.
- [ ] **Step 4: Vérifier** — `npm run build && npm run preview` : `dist/` contient `sw.js` + `manifest.webmanifest` avec les nouvelles couleurs ; les icônes régénérées sont lisibles.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: PWA aux couleurs Herbes (manifest, theme-color, icônes)"
```

---

### Task 12 : Docs + e2e final + gates

- [ ] **Step 1: e2e cuisine/batch finalisés** — dans `tests/e2e/cuisine.spec.ts` :
  - test courses : ajouter après les compteurs existants —
    ```ts
    await expect(page.locator('.batch-banner')).toContainText('Pensées pour le rituel');
    await expect(page.locator('.batch-banner')).toContainText('≈ 35 €');
    await page.locator('.mm').click();
    await expect(page.getByRole('button', { name: /Tout revoir/ })).toBeVisible();
    await page.locator('.mm').click();
    ```
  - test batch : remplacer l'assertion `.batch-banner` count 0 par la version conditionnelle —
    ```ts
    const jour = JOURS[(new Date().getDay() + 6) % 7];
    const avecCeSoir = ['lundi', 'mardi', 'samedi'].includes(jour);
    await expect(page.locator('.batch-banner')).toHaveCount(avecCeSoir ? 1 : 0);
    if (avecCeSoir) await expect(page.locator('.batch-banner')).toContainText(new RegExp(jour, 'i'));
    ```
    puis ajouter le parcours guidé (Lancer le batch → 4 × « Étape terminée → » → « Terminer le batch » → « Batch terminé ! » → Revenir à l'aperçu → timeline visible).
  - test débordement : conserver les 3 sous-onglets.
- [ ] **Step 2: Docs** — retrait du « dark mode only » partout, palette Herbes :
  - `AGENTS.md` : ligne 7 (« PWA React (dark mode only) » → « PWA React (thème clair Herbes) ») ; ligne 70 (bullet CSS : palette Nutrigo → Herbes, « Dark mode only » → « Thème clair unique — pas de dark, pas de `prefers-color-scheme`, pas de framework CSS. Icônes SVG via `src/components/Icon.tsx` (pas d'émoji dans l'UI, sauf onboarding/salutations) ») ; section Storage : ajouter la famille d'ids `menu:{jour}:{clé}` aux ids stables.
  - `ai/context/design-system.md` : header (dark only → thème clair), bloc tokens (:root Herbes), règle contraste (texte sombre `#272932` sur accents → **blanc sur basilic / encre sur citron**), table familles (`.tabbar-dock` → `.tabbar-segmented`, `.menu-day` → `.menu-card`, ajouter `.batch-banner`, `.portions-box`, `.mm`).
  - `ai/context/ui-guideline.md` : règle 1 (dark only → thème clair unique), section dock → segmented, règle hex en dur (même mise à jour que design-system).
  - `ai/context/project-architecture.md` ligne 20 : « dark mode only » → « thème clair Herbes ».
  - `ai/agent/design-agent/rules.prompt.md` ligne 9 + ligne 29 : dark only → thème clair ; `#272932` → « `#ffffff` sur basilic, `#26312b` sur citron ».
  - `ai/agent/design-agent/output-format.prompt.md` ligne 34 : « dark mode only » → « light Herbes theme ».
  - `ai/context/performance.md` ligne 62 : tolérance hex → même règle.
  - `CHANGELOG.md` — section `[Non publié]` :
    ```md
    ## [Non publié]
    ### Ajouté
    - Icônes SVG maison (`Icon.tsx`), bannière « Pensées pour le rituel » + budget, note de fraîcheur et marqueur batch sur les items, Mode magasin, bannière « Ce soir », mode guidé « Lancer le batch », swipe Cuisine ↔ Mon suivi, portions par profil + indice de fraîcheur des recettes
    ### Modifié
    - Thème clair « Herbes » (sauge/basilic/citron) — le dark mode est retiré
    - Navigation segmented sous la bannière (le dock flottant disparaît)
    - Menu : réserve de recettes en cartes (coche « c'est fait », plus aucun jour imposé)
    - Format .md v2 (rétrocompatible) : `- budget:`, suffixes ` · rituel` / ` | note`, `fraicheur:`, `- portions marc/melanie:`
    ### Retiré
    - Dock flottant, thème sombre, badge « Aujourd'hui » du menu
    ```
  - `README.md` : mention dark → thème clair si présente (grep « dark »).
- [ ] **Step 3: Gates complets** — `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e` : tout vert, zéro débordement 320/375.
- [ ] **Step 4: Commits**

```bash
git add -A
git commit -m "test: e2e adaptés — mode magasin, menu v2, batch guidé, swipe"
git add -A
git commit -m "docs: palette Herbes dans AGENTS/ai-context/CHANGELOG/README (fin du dark mode)"
```

---

## Vérification finale

- [ ] `npm test && npm run typecheck && npm run lint && npm run build` — vert.
- [ ] `npm run e2e` — vert sur 375 et 320 (débordements inclus).
- [ ] `npm run preview` : parcours manuel complet — onboarding (2 profils), Courses (bannière, marqueurs, Mode magasin), Menu v2 (coche + persistance + portions + fiche), Batch (Ce soir un lundi, mode guidé), swipe, suivi (pesée citron), Profil.
- [ ] Contrat .md : un fichier **v1** sans les nouveaux champs parse sans warning et s'affiche sans régression (test v1 déjà présent).
- [ ] Le bump de version (`npm version …` + CHANGELOG renommé + tag) reste **volontaire** et séparé, selon le rituel release du repo.

