# Fidélité Figma Cuisine — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Rendre la Cuisine fidèle à la maquette Figma : sous-onglets en segmented control (actif lime) + carte recette compacte (image à gauche, bouton lime, badges, score inline, footer nutrition unifié, dépliage dans la carte).

**Architecture :** 2 scopes isolés exécutés séquentiellement — Scope 1 (segmented control : `CuisineView.tsx` + CSS) puis Scope 2 (carte recette : `MenuView.tsx` + CSS + tests). Logique inchangée (parser, données, storage). Chaque scope = un commit, TDD strict.

**Tech Stack :** React 18 + TypeScript strict + Vite, CSS sémantique dans `src/index.css`, vitest + Testing Library (happy-dom), Playwright.

**Références :** spec `docs/superpowers/specs/2026-09-09-fidelite-figma-cuisine-design.md` (faire foi). Figma nodes `2:4220` (segmented), `453:11786` (carte).

**Conventions repo (AGENTS.md) :** fonctions nommées, pas de default export, cibles tactiles ≥ 48px, tests comportementaux avec `userEvent`, `vi.setSystemTime(new Date('…T10:00:00'))` (forme avec heure) + `vi.useRealTimers()` en afterEach, `localStorage.clear()` en beforeEach si storage.

---

## Task 1 : Scope 1 — Sous-onglets en segmented control

**Files:**
- Modify: `src/components/cuisine/CuisineView.tsx:9-13` (labels sans emoji)
- Modify: `src/index.css:311-340` (`.cuisine-tabs`)
- Test: `tests/components.test.tsx` (nouveau describe `CuisineView — sous-onglets`)
- Modify: `tests/app.test.tsx:112,115` (noms de boutons sans emoji)

- [ ] **Step 1.1 : Écrire les tests qui échouent**

Dans `tests/components.test.tsx`, ajouter ce describe **avant** le describe `MenuView` (ligne ~300). Imports : `CuisineView` n'est pas encore importé — l'ajouter en haut du fichier avec les autres imports cuisine (`import { CuisineView } from '../src/components/cuisine/CuisineView';`). Pour le `data`, construire un objet minimal (champs optionnels omis) :

```tsx
describe('CuisineView — sous-onglets', () => {
  const data: WeeklyData = {
    meta: { semaine: 'S40', menu: 'A', du: '2026-09-28', au: '2026-10-04' },
    courses: [],
    menu: [
      { jour: 'Lundi', dejeunerMarc: "Flocons d'avoine" },
      { jour: 'Mardi', dinerFamille: 'Poulet rôti' },
    ],
    batch: [],
    profiles: { marc: { cibles: [], seances: [], rappels: [] }, melanie: { cibles: [], seances: [], rappels: [] } },
  };

  it('affiche 3 onglets texte seul (sans emoji) et met le premier en actif', () => {
    render(<CuisineView data={data} />);
    expect(screen.getByRole('button', { name: 'Courses' })).toHaveClass('tab', 'active');
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveClass('tab');
    expect(screen.getByRole('button', { name: 'Batch' })).toHaveClass('tab');
    expect(screen.queryByRole('button', { name: /🛒/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /📅/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /📦/ })).not.toBeInTheDocument();
  });

  it('bascule la classe active au clic et change de section', async () => {
    const user = userEvent.setup();
    render(<CuisineView data={data} />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveClass('tab', 'active');
    expect(screen.getByRole('button', { name: 'Courses' })).not.toHaveClass('active');
    expect(screen.getByRole('heading', { name: 'Lundi', level: 3 })).toBeInTheDocument();
  });
});
```

Vérifier les imports en haut du fichier de test : `CuisineView` à ajouter (`import { CuisineView } from '../src/components/cuisine/CuisineView';`) et le type `WeeklyData` si absent (`import type { WeeklyData } from '../src/lib/model';` — le fichier importe déjà Recette/BaseCuisine/MenuDay, compléter la même ligne si nécessaire).

Vérifier le type `WeeklyData` dans `src/lib/model.ts` avant d'écrire le fixture : si `meta` exige d'autres champs (ex. `du`/`au`), les ajouter au fixture (`meta: { semaine: 'S40', du: '2026-09-28', au: '2026-10-04', titre: 'Test' }`). Adapter au type réel — ne pas utiliser `as any`.

Modifier `tests/app.test.tsx` lignes 112 et 115 :

```tsx
    await user.click(screen.getByRole('button', { name: 'Menu' }));
```
```tsx
    await user.click(screen.getByRole('button', { name: 'Batch' }));
```

- [ ] **Step 1.2 : Vérifier que les tests échouent (rouge)**

Run: `npx vitest run tests/components.test.tsx tests/app.test.tsx`
Expected: FAIL — `CuisineView` sans emoji attendu mais labels actuels ont des emojis (🛒/📅/📦), et l'assertion `not.toHaveClass('active')` sur Menu échoue car `.active` porte la barre orange actuelle. Si `WeeklyData` ne type pas, FAIL TypeScript.

- [ ] **Step 1.3 : Implémenter**

`src/components/cuisine/CuisineView.tsx` — remplacer le tableau TABS (lignes 9-13) :

```tsx
const TABS: Array<{ id: CuisineTab; label: string }> = [
  { id: 'courses', label: 'Courses' },
  { id: 'menu', label: 'Menu' },
  { id: 'batch', label: 'Batch' },
];
```

`src/index.css` — remplacer les blocs `.cuisine-tabs`, `.cuisine-tabs .tab` et `.cuisine-tabs .tab.active` (lignes 311-340) par :

```css
.cuisine-tabs {
  display: flex;
  gap: 3px;
  margin-bottom: 12px;
  padding: 3px;
  background: var(--surface-2);
  border-radius: 10px;
}

.cuisine-tabs .tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.cuisine-tabs .tab.active {
  background: var(--accent-2);
  color: #272932;
  font-weight: 700;
}
```

- [ ] **Step 1.4 : Vérifier que les tests passent (vert)**

Run: `npx vitest run tests/components.test.tsx tests/app.test.tsx`
Expected: PASS (tous, y compris les tests existants).

- [ ] **Step 1.5 : Vérifier les e2e (les sélecteurs e2e utilisent déjà les noms sans emoji et le matching substring de Playwright survit)**

Run: `npm run e2e`
Expected: 22 tests PASS (aucune modification e2e requise pour ce scope).

- [ ] **Step 1.6 : Gates puis commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tout PASS.

```bash
git add src/components/cuisine/CuisineView.tsx src/index.css tests/components.test.tsx tests/app.test.tsx
git commit -m "feat: sous-onglets cuisine en segmented control lime (fidélité Figma)"
```

---

## Task 2 : Scope 2 — Carte recette compacte (fidélité Figma 453:11786)

**Files:**
- Modify: `src/components/cuisine/MenuView.tsx` (réécriture de `MenuView` + `RecetteCard`)
- Modify: `src/index.css:1222-1429` (section recette réécrite)
- Test: `tests/components.test.tsx:424-656` (describe `MenuView — accordéon recette` → `MenuView — carte recette`)
- Modify: `tests/e2e/cuisine.spec.ts:60-83` (test fiche recette)

- [ ] **Step 2.1 : Écrire les tests qui échouent**

Remplacer **intégralement** le describe `MenuView — accordéon recette` (lignes 424-656 de `tests/components.test.tsx`) par :

```tsx
describe('MenuView — carte recette', () => {
  const RECETTES: Recette[] = [
    {
      id: 'r2-pates-bolognaise-salade',
      nom: 'R2 · Pâtes bolognaise + salade',
      temps: '25 min · plaque + casserole',
      kcal: 620,
      proteines: 42,
      pour: '800 g haché 5 % · 2 boîtes tomates · 400 g pâtes',
      bases: ['B4', 'B6'],
      etapes: ["Oignons + ail à l'huile 5 min, haché 8 min.", 'Tomates + herbes, 15 min doux.'],
      mel: 'bolo sur courgettes spaghetti + parmesan',
      batch: 'double sauce → boîte mercredi',
    },
    { id: 'r4-wok', nom: 'R4 · Wok poulet', temps: '12 min', etapes: ['Wok bien chaud.'], mel: 'sans riz' },
  ];
  const BASES: BaseCuisine[] = [
    {
      id: 'b4-vinaigrette-minute',
      nom: 'B4 · Vinaigrette minute',
      texte: "3 c.à.s huile d'olive + 1 moutarde + jus d'½ citron + sel.",
    },
    {
      id: 'b6-courgettes-spaghetti',
      nom: 'B6 · Courgettes spaghetti',
      texte: "Julienne à l'économe, 3-4 min poêle très chaude.",
    },
  ];
  const MENU: MenuDay[] = [
    { jour: 'Mercredi', dinerFamille: 'Pâtes bolognaise + salade', recetteRefs: { dinerFamille: 'R2' } },
    { jour: 'Jeudi', dinerFamille: 'Wok poulet', recetteRefs: { dinerFamille: 'R4' } },
  ];

  const renderMenu = (over: { menu?: MenuDay[]; recettes?: Recette[]; bases?: BaseCuisine[] } = {}) =>
    render(<MenuView menu={over.menu ?? MENU} recettes={over.recettes ?? RECETTES} bases={over.bases ?? BASES} />);

  afterEach(() => {
    vi.useRealTimers();
  });

  it('affiche une carte compacte repliée sous chaque repas avec ref (badge catégorie + footer nutrition)', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00')); // mercredi : Mercredi en tête
    renderMenu();

    const cartes = screen.getAllByRole('article');
    expect(cartes).toHaveLength(2);
    expect(screen.getByRole('article', { name: 'R2 · Pâtes bolognaise + salade' })).toBeInTheDocument();

    const carteR2 = screen.getByRole('article', { name: 'R2 · Pâtes bolognaise + salade' });
    expect(carteR2.querySelector('.recette-nom')!.textContent).toBe('R2 · Pâtes bolognaise + salade');
    expect(carteR2.querySelector('.recette-badge-cat')!.textContent).toBe('Famille');
    expect(carteR2.querySelector('.recette-badge-info')!.textContent).toBe('⏱ 25 min'); // tronqué avant « · »
    expect(screen.getByText('🔥 620 kcal')).toBeInTheDocument();
    expect(screen.getByText('💪 42g P')).toBeInTheDocument();
    expect(screen.queryByText(/~620|\/pers/)).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Voir la recette ⌄' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // détail non rendu tant que la carte est repliée
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('déplie le détail via le bouton, referme par re-clic, indépendamment par carte', async () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const user = userEvent.setup();
    renderMenu();

    const toggles = screen.getAllByRole('button', { name: 'Voir la recette ⌄' });
    expect(toggles).toHaveLength(2);

    await user.click(toggles[0]!);
    const carteR2 = screen.getByRole('article', { name: 'R2 · Pâtes bolognaise + salade' });
    expect(screen.getByRole('list')).toHaveClass('recette-etapes');
    expect(carteR2.querySelector('.recette-toggle')).toHaveAttribute('aria-expanded', 'true');

    // ouverture indépendante : la 2e carte s'ouvre sans refermer la 1re
    const toggles2 = screen.getAllByRole('button', { name: 'Voir la recette ⌄' });
    await user.click(toggles2[0]!); // le toggle R4 (R2 affiche maintenant « Réduire »)
    const carteR4 = screen.getByRole('article', { name: 'R4 · Wok poulet' });
    expect(carteR4.querySelector('.recette-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(carteR2.querySelector('.recette-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('sans riz')).toBeInTheDocument();

    // re-clic sur le toggle R2 : repli
    await user.click(carteR2.querySelector('.recette-toggle')!);
    expect(carteR2.querySelector('.recette-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText("Oignons + ail à l'huile 5 min, haché 8 min.")).not.toBeInTheDocument();
    expect(screen.getByText('sans riz')).toBeInTheDocument(); // R4 toujours ouverte
  });

  it('affiche les étapes, bases cliquables et lignes mélanie/batch dans le détail', async () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getAllByRole('button', { name: 'Voir la recette ⌄' })[0]!);

    const etapes = screen.getByRole('list');
    expect(within(etapes).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      "Oignons + ail à l'huile 5 min, haché 8 min.",
      'Tomates + herbes, 15 min doux.',
    ]);
    expect(screen.getByText('bolo sur courgettes spaghetti + parmesan')).toHaveClass('recette-ligne', 'recette-mel');
    expect(screen.getByText('double sauce → boîte mercredi')).toHaveClass('recette-ligne', 'recette-bat');

    const chipB4 = screen.getByRole('button', { name: /B4 · Vinaigrette minute/ });
    await user.click(chipB4);
    expect(screen.getByText(/huile d'olive \+ 1 moutarde/)).toBeInTheDocument();
    await user.click(chipB4);
    expect(screen.queryByText(/huile d'olive \+ 1 moutarde/)).not.toBeInTheDocument();
  });

  it('affiche le score inline (Health score : N/10 + barre) et le sans-score omis', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    renderMenu({
      menu: [
        { jour: 'Lundi', dejeunerMarc: 'Poulet', recetteRefs: { dejeunerMarc: 'r1' } },
        { jour: 'Mardi', dejeunerMarc: 'Gratin', recetteRefs: { dejeunerMarc: 'r2-sans' } },
      ],
      recettes: [
        { id: 'r1', nom: 'Poulet rôti', kcal: 450, proteines: 35, glucides: 30, lipides: 12, score: 9 },
        { id: 'r2-sans', nom: 'Gratin sans score', kcal: 500 },
      ],
    });

    expect(screen.getByText('Health score :')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('/10')).toBeInTheDocument();
    const barre = screen.getByTestId('score-bar');
    expect(barre.children).toHaveLength(10);
    expect(barre.querySelectorAll('.score-seg.on')).toHaveLength(9);

    const carteSans = screen.getByRole('article', { name: 'Gratin sans score' });
    expect(carteSans.querySelector('.recette-score')).toBeNull();
  });

  it('affiche la photo ou le fallback sans clic préalable', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    renderMenu({
      menu: [
        { jour: 'Lundi', dejeunerMarc: 'Poulet', recetteRefs: { dejeunerMarc: 'r1' } },
        { jour: 'Mardi', dejeunerMarc: 'Gratin', recetteRefs: { dejeunerMarc: 'r2-sans' } },
      ],
      recettes: [
        { id: 'r1', nom: 'Poulet rôti', image: 'https://images.unsplash.com/photo-x?w=800' },
        { id: 'r2-sans', nom: 'Gratin sans image' },
      ],
    });

    expect(screen.getByRole('img', { name: 'Poulet rôti' })).toHaveAttribute(
      'src',
      'https://images.unsplash.com/photo-x?w=800',
    );
    expect(screen.getByTestId('recette-fallback')).toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
  });

  it('ref non résolue : ni carte ni badge, texte du repas intact', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const { container } = renderMenu({
      menu: [{ jour: 'Mercredi', dinerFamille: 'Pâtes bolognaise + salade', recetteRefs: { dinerFamille: 'R99' } }],
    });

    expect(container.querySelector('.recette-card')).toBeNull();
    expect(screen.getByText('Pâtes bolognaise + salade')).toBeInTheDocument();
  });

  it('préfixe de recette borné : R1 ne matche pas une recette r10-…', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    renderMenu({
      recettes: [{ id: 'r10-wok-special', nom: 'R10 · Wok spécial', temps: '10 min' }, ...RECETTES],
      menu: [{ jour: 'Mercredi', dinerFamille: 'Wok spécial', recetteRefs: { dinerFamille: 'R1' } }],
    });

    expect(screen.queryByRole('button', { name: /R10 · Wok spécial/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /Wok spécial/ })).not.toBeInTheDocument();
    expect(screen.getByText('Wok spécial')).toBeInTheDocument();
  });

  it('base non résolue : détail sans chips, sans crash', async () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const user = userEvent.setup();
    renderMenu({ recettes: [{ ...RECETTES[0]!, bases: ['B9'] }] });

    await user.click(screen.getAllByRole('button', { name: 'Voir la recette ⌄' })[0]!);

    expect(screen.getByRole('article', { name: 'R2 · Pâtes bolognaise + salade' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^B9/ })).not.toBeInTheDocument();
  });

  it('préfixe de base borné : B4 ne matche pas une base b40-…', async () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const user = userEvent.setup();
    renderMenu({
      bases: [{ id: 'b40-houmous', nom: 'B40 · Houmous', texte: 'Pois chiches + tahini.' }, ...BASES],
    });

    await user.click(screen.getAllByRole('button', { name: 'Voir la recette ⌄' })[0]!);

    expect(screen.getByRole('button', { name: /B4 · Vinaigrette minute/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /B40 · Houmous/ })).not.toBeInTheDocument();
  });
});
```

Notes de design (à respecter à la lettre) :
- Les cartes sont **visibles dès le rendu** (repliées) — plus aucun clic préalable sur un lien de la ligne du repas.
- Le toggle accessible name change avec l'état : « Voir la recette ⌄ » ↔ « Réduire ⌃ » — les tests s'appuient dessus.
- `getByRole('list')` : dans ces fixtures une seule carte est ouverte avant l'assert (R4 a une étape → son `recette-etapes` est aussi un `list` quand ouverte).

- [ ] **Step 2.2 : Vérifier que les tests échouent (rouge)**

Run: `npx vitest run tests/components.test.tsx`
Expected: FAIL — la structure actuelle (lien `menu-recette-link`, fiche hero + corps, `openRec` global) ne produit ni `.recette-badge-cat` ni footer `.recette-nutri` ni cartes pré-rendues.

- [ ] **Step 2.3 : Implémenter `MenuView.tsx`**

Réécrire le fichier `src/components/cuisine/MenuView.tsx` ainsi :

```tsx
import { Fragment, useState } from 'react';
import type { BaseCuisine, MealKey, MenuDay, Recette } from '../../lib/model';
import { trouverJourDuJour } from '../../lib/stats';

const MEALS: Array<[MealKey, string, string]> = [
  ['dejeunerMarc', 'Marc', 'tag-marc'],
  ['dejeunerMelanie', 'Mé', 'tag-keto'],
  ['dinerFamille', 'Famille', 'tag-fam'],
  ['dinerMelanie', 'Mé', 'tag-keto'],
  ['batch', 'Batch', 'tag-bat'],
];

function trouverRecette(ref: string, recettes: Recette[]): Recette | undefined {
  const cible = ref.toLowerCase();
  // égalité exacte d'abord, puis préfixe borné (`r1` ne doit pas matcher `r10-…`)
  return recettes.find((r) => r.id === cible) ?? recettes.find((r) => r.id.startsWith(cible + '-'));
}

function ordreDepuisAujourdhui(menu: MenuDay[]): { ordered: MenuDay[]; nbPasse: number } {
  const jourCourant = trouverJourDuJour(menu);
  const idx = jourCourant ? menu.indexOf(jourCourant) : -1;
  if (idx <= 0) return { ordered: menu, nbPasse: 0 };
  return { ordered: [...menu.slice(idx), ...menu.slice(0, idx)], nbPasse: idx };
}

export function MenuView({
  menu,
  recettes = [],
  bases = [],
}: {
  menu: MenuDay[];
  recettes?: Recette[];
  bases?: BaseCuisine[];
}) {
  if (menu.length === 0) {
    return <p className="muted">Aucun menu pour cette semaine.</p>;
  }

  const { ordered, nbPasse } = ordreDepuisAujourdhui(menu);
  const pastFrom = ordered.length - nbPasse;

  const jourDuJour = trouverJourDuJour(menu);

  return (
    <>
      {ordered.map((day, i) => {
        const isToday = i === 0 && nbPasse < ordered.length && day === jourDuJour;
        const isPast = i >= pastFrom;
        const recetteParRepas = new Map<MealKey, Recette>();
        for (const [key] of MEALS) {
          const ref = day.recetteRefs?.[key];
          const recette = ref ? trouverRecette(ref, recettes) : undefined;
          if (recette) recetteParRepas.set(key, recette);
        }
        return (
          <section
            className={isToday ? 'menu-day today' : isPast ? 'menu-day past' : 'menu-day'}
            key={day.jour}
          >
            <div className="menu-day-head">
              <h3>{day.jour}</h3>
              {isToday && <span className="today-badge">Aujourd'hui</span>}
              {isPast && <span className="past-badge">Passé</span>}
            </div>
            {MEALS.map(([key, label, tag]) => {
              const value = day[key];
              if (!value) return null;
              const recette = recetteParRepas.get(key);
              return (
                <Fragment key={key}>
                  <div className="menu-row">
                    <span className={`menu-tag ${tag}`}>{label}</span>
                    <span className="menu-row-text">{value}</span>
                  </div>
                  {recette && <RecetteCard recette={recette} bases={bases} mealLabel={label} />}
                </Fragment>
              );
            })}
          </section>
        );
      })}
    </>
  );
}

export function RecetteCard({
  recette,
  bases,
  mealLabel,
}: {
  recette: Recette;
  bases?: BaseCuisine[];
  mealLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [baseOuverte, setBaseOuverte] = useState<string | null>(null);
  const tempsCourt = recette.temps?.split('·')[0]?.trim();
  const aMacros =
    recette.kcal != null ||
    recette.proteines != null ||
    recette.glucides != null ||
    recette.lipides != null;
  return (
    <article className="recette-card" aria-label={recette.nom}>
      <div className="recette-top">
        {recette.image ? (
          <img className="recette-thumb" src={recette.image} alt={recette.nom} loading="lazy" />
        ) : (
          <div className="recette-fallback" data-testid="recette-fallback" aria-hidden="true">
            🍳
          </div>
        )}
        <div className="recette-main">
          <div className="recette-nom">{recette.nom}</div>
          <button
            type="button"
            className="recette-toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? 'Réduire ⌃' : 'Voir la recette ⌄'}
          </button>
        </div>
      </div>
      <div className="recette-badges">
        {mealLabel && <span className="recette-badge-cat">{mealLabel}</span>}
        {tempsCourt && <span className="recette-badge-info">⏱ {tempsCourt}</span>}
        {recette.score != null && (
          <div className="recette-score">
            <div className="recette-score-head">
              <span className="stat-label">Health score :</span>
              <span className="recette-score-value">
                {recette.score}
                <small>/10</small>
              </span>
            </div>
            <div className="score-bar" data-testid="score-bar" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={i < recette.score! ? 'score-seg on' : 'score-seg'} />
              ))}
            </div>
          </div>
        )}
      </div>
      {aMacros && (
        <div className="recette-nutri">
          {recette.kcal != null && <span>🔥 {recette.kcal} kcal</span>}
          {recette.glucides != null && <span>🌾 {recette.glucides}g C</span>}
          {recette.proteines != null && <span>💪 {recette.proteines}g P</span>}
          {recette.lipides != null && <span>💧 {recette.lipides}g F</span>}
        </div>
      )}
      {open && (
        <div className="recette-detail">
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
      )}
    </article>
  );
}

function trouverBase(ref: string, bases: BaseCuisine[] | undefined): BaseCuisine | undefined {
  if (!bases) return undefined;
  const cible = ref.toLowerCase();
  // même discipline que trouverRecette : égalité exacte d'abord, puis préfixe borné (`b4` ne doit pas matcher `b40-…`)
  return bases.find((b) => b.id === cible) ?? bases.find((b) => b.id.startsWith(cible + '-'));
}
```

- [ ] **Step 2.4 : Implémenter le CSS**

Dans `src/index.css`, remplacer **intégralement** la section recette (commentaire ligne 1222 `/* ---------- Fiche recette (accordéon du menu) ---------- */` jusqu'à la fin du fichier ligne 1429) par :

```css
/* ---------- Carte recette (fidélité Figma 453:11786) ---------- */

.recette-card {
  margin: 6px 0 10px;
  padding: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.recette-top {
  display: flex;
  gap: 10px;
}

.recette-thumb {
  width: 110px;
  height: 76px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}

.recette-fallback {
  width: 110px;
  height: 76px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  flex-shrink: 0;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 35%, var(--surface-2)),
    color-mix(in srgb, var(--accent-2) 30%, var(--surface-2))
  );
}

.recette-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  min-width: 0;
  flex: 1;
}

.recette-nom {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.3;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recette-toggle {
  min-height: 48px;
  background: var(--accent-2);
  color: #272932;
  border: none;
  border-radius: 8px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.2s ease;
}

.recette-toggle:active {
  filter: brightness(0.92);
}

.recette-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin-top: 10px;
}

.recette-badge-cat {
  padding: 4px 9px;
  background: var(--accent-2);
  color: #272932;
  border-radius: 7px;
  font-size: 10.5px;
  font-weight: 700;
}

.recette-badge-info {
  padding: 4px 9px;
  background: var(--surface-2);
  color: var(--muted);
  border-radius: 7px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
}

.recette-score {
  margin-left: auto;
  text-align: right;
}

.recette-score-head {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 6px;
}

.recette-score-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.recette-score-value small {
  color: var(--muted);
  font-weight: 400;
  font-size: 11px;
}

.score-bar {
  display: flex;
  gap: 2px;
  width: 97px;
  margin-top: 4px;
  margin-left: auto;
}

.score-seg {
  flex: 1;
  height: 5px;
  border-radius: 4px;
  background: var(--surface-2);
}

.score-seg.on {
  background: var(--accent);
}

.recette-nutri {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface-2);
  border-radius: 8px;
  padding: 7px 10px;
  margin-top: 10px;
  font-size: 11px;
  color: var(--muted);
}

.recette-nutri span {
  white-space: nowrap;
}

.recette-nutri span + span {
  border-left: 1px solid var(--border);
  padding-left: 10px;
}

.recette-detail {
  border-top: 1px dashed var(--border);
  margin-top: 10px;
  padding-top: 2px;
}

.recette-pour {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
}

.recette-bases {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.recette-bchip {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 11px;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.recette-bchip.on {
  border-color: var(--accent);
}

.recette-bdesc {
  margin: 8px 0 0;
  padding: 8px 10px;
  background: var(--surface-2);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
}

.recette-etapes {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text);
}

.recette-etapes li {
  margin-bottom: 4px;
}

.recette-ligne {
  margin: 8px 0 0;
  padding: 7px 10px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.45;
}

.recette-mel {
  background: color-mix(in srgb, var(--accent-2) 15%, transparent);
  color: var(--accent-2);
}

.recette-mel::before {
  content: '🟢 Mé : ';
  font-weight: 700;
}

.recette-bat {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
}

.recette-bat::before {
  content: '📦 Batch : ';
  font-weight: 700;
}
```

Différences volontaires vs l'ancien CSS (à ne pas « restaurer ») : `.recette-hero`, `.recette-corps`, `.recette-head`, `.recette-title`, `.recette-meta`, `.recette-close`, `.recette-stats` supprimés ; `.recette-fallback` devient un bloc 110×76 (plus une bande pleine largeur) ; `.score-bar` a une largeur fixe 97px alignée à droite (segments flexibles à l'intérieur) ; `.recette-bchip` fond `--surface-2` (la carte est déjà `--surface`) ; `.stat-label` global (ligne ~1080) réutilisé, ne pas le redéfinir.

- [ ] **Step 2.5 : Vérifier que les tests unitaires passent (vert)**

Run: `npx vitest run tests/components.test.tsx`
Expected: PASS. Si le test « affiche les étapes, bases cliquables… » échoue sur `getByRole('list')` ambigu, c'est que deux cartes sont ouvertes — reprendre le test fourni (il n'ouvre que R2 avant d'assert).

- [ ] **Step 2.6 : Mettre à jour l'e2e fiche recette**

Dans `tests/e2e/cuisine.spec.ts`, remplacer le test lignes 60-83 par :

```ts
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
```

Le commentaire contrat (lignes 3-9) reste valable : la 1ʳᵉ recette liée en ordre tournant garde kcal + étapes. Ne rien toucher d'autre dans les e2e (le matching substring de `getByRole` tolère les labels sans emoji).

- [ ] **Step 2.7 : e2e + débordements mobile**

Run: `npm run e2e`
Expected: 22 tests PASS, y compris « zéro débordement horizontal » à 320 et 375 (la rangée badges wrappe, le footer nutrition tient en 11px). Si débordement : vérifier `.recette-nutri span { white-space: nowrap }` et la troncature du temps badge avant « · ».

- [ ] **Step 2.8 : Gates puis commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tout PASS.

```bash
git add src/components/cuisine/MenuView.tsx src/index.css tests/components.test.tsx tests/e2e/cuisine.spec.ts
git commit -m "feat: carte recette compacte fidèle à la maquette (fidélité Figma)"
```

---

## Task 3 : Vérification visuelle + revues

- [ ] **Step 3.1 : Rendu réel contre la maquette**

Run: `npm run build && npm run preview` puis ouvrir http://localhost:4173 (profil Marc préchargé sinon onboarding), onglet Menu.
Vérifier à l'œil vs mockup companion (`http://localhost:49837` — option-a-mockup.html) : conteneur segmented + lime actif ; carte : image gauche, bouton lime, badge lime Famille, badge ⏱ tronqué, score à droite, footer nutrition avec séparateurs ; dépliage propre.

- [ ] **Step 3.2 : Revues subagent (spec + qualité) puis corrections éventuelles** — cf. subagent-driven-development.

- [ ] **Step 3.3 : Push** (déploie sur Pages via le workflow Deploy ; e2e preview y tourne sur le build de prod).
