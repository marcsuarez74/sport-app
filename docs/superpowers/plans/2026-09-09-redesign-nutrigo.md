# Redesign « Nutrigo dark » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer le langage visuel Nutrigo (dark adapté, Poppins, orange/lime) à toute l'app et intégrer 4 emprunts produit : stat-cards, widget poids, macros + health score recettes, photos de plats.

**Architecture:** Restyle CSS-first (`src/index.css`) puis additions : `src/lib/stats.ts` (données dérivées pures), `StatCards.tsx`, `WeightChart.tsx` (SVG pur, remplace `Sparkline.tsx`), extensions optionnelles du contrat .md (`glucides/lipides/score/image`), suppression du theming par profil. Spec : `docs/superpowers/specs/2026-09-09-redesign-nutrigo-design.md`.

**Tech Stack:** React 18 + TypeScript strict + Vite, CSS sémantique single-file (dark only), vitest + Testing Library (happy-dom), Playwright (e2e), vite-plugin-pwa (workbox).

**Conventions repo :** TDD (rouge → vert), commits courts français (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), gates avant chaque commit : `npm test && npm run typecheck && npm run lint && npm run build`. Tests dans `tests/` en miroir de `src/`. `localStorage.clear()` en `beforeEach`. Mocks d'horloge : `vi.setSystemTime(new Date('2026-09-09T10:00:00'))` (toujours avec heure).

---

### Task 0: Branche de travail

- [ ] **Step 1: Créer la branche**

```bash
git checkout -b feat/nutrigo-redesign
```

---

## Phase 1 — Design system (tokens, Poppins, restyle CSS, manifest)

### Task 1: Poppins auto-hébergée

**Files:**
- Create: `src/assets/fonts/poppins-400.woff2`, `poppins-500.woff2`, `poppins-600.woff2`, `poppins-700.woff2`
- Modify: `src/index.css` (en-tête : `@font-face` + `body`)

- [ ] **Step 1: Télécharger les 4 woff2 (subset latin)**

```bash
mkdir -p src/assets/fonts
curl -sL -o src/assets/fonts/poppins-400.woff2 "https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrJJfecnFHGPc.woff2"
curl -sL -o src/assets/fonts/poppins-500.woff2 "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLGT9Z1xlFd2JQEk.woff2"
curl -sL -o src/assets/fonts/poppins-600.woff2 "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLEj6Z1xlFd2JQEk.woff2"
curl -sL -o src/assets/fonts/poppins-700.woff2 "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7Z1xlFd2JQEk.woff2"
```

- [ ] **Step 2: Vérifier que ce sont bien des woff2 (~8-16 Ko chacun)**

```bash
ls -la src/assets/fonts/ && file src/assets/fonts/poppins-400.woff2
```

Expected: `OpenType Font data` (ou `Web Open Font Format`) — si un fichier est du HTML, retélécharger.

- [ ] **Step 3: Ajouter @font-face et brancher la typo dans index.css**

En tête de `src/index.css` (après le commentaire de licence), ajouter :

```css
/* Poppins auto-hébergée (subset latin) — précahée par le service worker (globPatterns woff2). */
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./assets/fonts/poppins-400.woff2') format('woff2');
}

@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./assets/fonts/poppins-500.woff2') format('woff2');
}

@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('./assets/fonts/poppins-600.woff2') format('woff2');
}

@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./assets/fonts/poppins-700.woff2') format('woff2');
}
```

Dans la règle `body`, remplacer la ligne `font-family` :

```css
  font-family: 'Poppins', -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

- [ ] **Step 4: Gates**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tout passe. Puis `ls dist/assets/*.woff2` → les 4 fichiers sont dans le bundle.

- [ ] **Step 5: Commit**

```bash
git add src/assets/fonts/ src/index.css
git commit -m "feat: Poppins auto-hébergée (woff2 latin, précache PWA)"
```

### Task 2: Tokens Nutrigo dark

**Files:**
- Modify: `src/index.css` (bloc `:root`, blocs `[data-profile]`, header comment)

- [ ] **Step 1: Remplacer le bloc `:root` et supprimer les blocs `[data-profile]`**

Remplacer tout le bloc `:root { ... }` existant par :

```css
:root {
  color-scheme: dark;

  --bg: #1b1d24;
  --surface: #272932;
  --surface-2: #31333e;
  --border: #3f4351;
  --text: #f9f4f2;
  --muted: #8a8c90;
  --accent: #ffa257;
  --accent-2: #c2e66e;
  --danger: #ff6b6b;
  --radius: 16px;
  --shadow: 0 4px 16px rgb(0 0 0 / 0.35);
}
```

Supprimer les deux blocs `[data-profile='marc'] { ... }` et `[data-profile='melanie'] { ... }` (l'accent devient unique — la suppression du JS sera faite en Task 12 ; l'attribut posé par App n'a plus d'effet CSS).

Mettre à jour le commentaire d'en-tête du fichier :

```css
/*
 * Sport App — design system « Nutrigo dark » (dark mode uniquement, pas de light theme).
 * Palette dérivée de la maquette Figma Nutrigo : surfaces sombres #272932, accents
 * orange #FFA257 (action, Marc, séances) et lime #C2E66E (Mélanie, keto, validation).
 * Textes sombres (#272932) sur accents clairs — contraste ≥ 4.5:1.
 * Cibles tactiles ≥ 48px, transitions douces sur les éléments interactifs uniquement.
 */
```

- [ ] **Step 2: Remplacer tous les usages de `--accent-strong` par `--accent`**

`rg -n "accent-strong" src/index.css` → pour chaque occurrence, remplacer `var(--accent-strong)` par `var(--accent)` dans : `.menu-pill`, `.tabbar-dock::before`, `.btn`/`.weight-form button`, `.today-badge`, `.onboarding-cta` (background → `var(--accent)`, supprimer le gradient `linear-gradient(135deg, var(--accent), var(--accent-strong))`), `.onboarding[data-profile]` (supprimés). Aucune occurrence restante : `rg "accent-strong" src/index.css` → 0 résultat.

- [ ] **Step 3: Adapter les dégradés orange/lime de l'onboarding**

Remplacer :

```css
.onboarding-card-marc {
  background: linear-gradient(135deg, #e07b39, #b3531d);
  box-shadow: 0 6px 18px rgb(224 123 57 / 0.35);
}

.onboarding-card-melanie {
  background: linear-gradient(135deg, #3d9a6c, #256b48);
  box-shadow: 0 6px 18px rgb(61 154 108 / 0.35);
}
```

par :

```css
.onboarding-card-marc {
  background: linear-gradient(135deg, #ffa257, #c96a20);
  box-shadow: 0 6px 18px rgb(255 162 87 / 0.35);
}

.onboarding-card-melanie {
  background: linear-gradient(135deg, #c2e66e, #8fbf4d);
  box-shadow: 0 6px 18px rgb(194 230 110 / 0.35);
}
```

Et dans `.onboarding-card`, passer le texte en sombre (lime/orange = fond clair) :

```css
.onboarding-card {
  ...
  color: #272932; /* remplace color: #fff */
}

.onboarding-card-tagline {
  font-size: 12px;
  font-weight: 600;
  color: rgb(39 41 50 / 0.75); /* remplace rgb(255 255 255 / 0.85) */
}
```

Dans `.onboarding` (fond), remplacer les halos par les nouvelles couleurs :

```css
  background:
    radial-gradient(120% 90% at 15% 0%, rgb(255 162 87 / 0.18), transparent 55%),
    radial-gradient(120% 90% at 85% 100%, rgb(194 230 110 / 0.16), transparent 55%),
    var(--bg);
```

Supprimer les blocs `.onboarding[data-profile='marc']` et `.onboarding[data-profile='melanie']`.

- [ ] **Step 4: Gates**

Run: `npm test && npm run typecheck && npm run lint`
Expected: passe (aucun test ne lit les valeurs CSS).

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: tokens Nutrigo dark (surfaces #272932, accent orange/lime, fin du theming CSS par profil)"
```

### Task 3: Restyle des composants (CSS)

**Files:**
- Modify: `src/index.css` (sections Cartes, Dock, Boutons, Menu, Batch, Recette, Profils)

Aucun changement DOM — classes et textes stables. Changements par classe (remplacer la valeur indiquée, garder le reste) :

- [ ] **Step 1: Typographie globale**

```css
h1 {
  font-size: 22px;
  font-weight: 600;
}

h2 {
  font-size: 20px;
  font-weight: 600;
}

h3 {
  font-size: 17px;
  font-weight: 600;
}
```

Remplacer partout `font-weight: 800` par `font-weight: 700` (Poppins 800 non chargée : `.week-title`, `.menu-pill`, `.keto-title`, `.rituel-label`, `.micro-jour-nom`, `.recette-nom`, `.recette-close`, `.dock-tab` garde 700, `.onboarding-*`).

- [ ] **Step 2: Cartes & chips**

`.recette-stats span`, `.recette-bdesc` etc. restent sur `--surface-2` pour la hiérarchie. Dans `.menu-tag` et ses variantes, texte sombre sur accents clairs :

```css
.tag-marc {
  background: var(--accent);
  color: #272932;
}

.tag-keto {
  background: color-mix(in srgb, var(--accent-2) 22%, transparent);
  color: var(--accent-2);
}

.tag-fam {
  background: var(--surface-2);
  color: var(--text);
}

.tag-bat {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent);
}
```

Keto-box en lime :

```css
.keto-box {
  background: color-mix(in srgb, var(--accent-2) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent-2) 45%, transparent);
  ...
}

.keto-title {
  ...
  color: var(--accent-2);
}
```

- [ ] **Step 3: Dock**

`.tabbar-dock` : `background: rgb(39 41 50 / 0.9)` ; `::before` : `background: var(--accent)`, `box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 40%, transparent)` ; `.dock-tab-active { color: #272932; }` (texte sombre sur pastille orange).

- [ ] **Step 4: Aujourd'hui / jour courant**

`.today` : `border: 2px solid var(--accent); box-shadow: 0 0 12px rgb(255 162 87 / 0.35);`

- [ ] **Step 5: Boutons & focus**

`.btn`/`.weight-form button` : `background: var(--accent); color: #272932;` ; `:focus-visible` reste `outline: 2px solid var(--accent)` ; `.recette-bchip` et `.recette-bchip.on` : `color: var(--accent)` inchangé (accent = orange partout).

- [ ] **Step 6: Vérification visuelle rapide**

Run: `npm run dev` → vérifier les 2 onglets + écran Profil + onboarding (320 et 375 px) : cartes sombres, accents orange/lime, aucun débordement.

- [ ] **Step 7: Gates + commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

```bash
git add src/index.css
git commit -m "feat: restyle Nutrigo des composants (dock, chips, tags, keto, boutons, focus)"
```

### Task 4: Manifest aux couleurs du nouveau thème

**Files:**
- Modify: `vite.config.ts:21-22`

- [ ] **Step 1: Mettre à jour les couleurs**

```ts
        theme_color: '#1b1d24',
        background_color: '#1b1d24',
```

- [ ] **Step 2: Gates + commit**

Run: `npm run build && npm run preview` → l'app s'affiche sur fond `#1b1d24`.

```bash
git add vite.config.ts
git commit -m "chore: manifest aux couleurs du thème Nutrigo dark"
```

---

## Phase 2 — Mon suivi (stats, StatCards, WeightChart, objectifs)

### Task 5: `src/lib/stats.ts` — données dérivées (TDD)

**Files:**
- Create: `src/lib/stats.ts`
- Test: `tests/stats.test.ts`

- [ ] **Step 1: Écrire les tests (rouge)**

`tests/stats.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import type { MenuDay, Recette } from '../src/lib/model';
import {
  compteChecklist,
  kcalDuJour,
  poidsActuel,
  recetteParRef,
  variationPoids7j,
} from '../src/lib/stats';
import type { WeightEntry } from '../src/lib/storage';

const w = (date: string, kg: number): WeightEntry => ({ date, kg });

describe('stats: poidsActuel', () => {
  it('retourne la dernière pesée', () => {
    expect(poidsActuel([w('2026-08-01', 85), w('2026-09-01', 78)])).toEqual(w('2026-09-01', 78));
  });

  it('retourne null sans pesée', () => {
    expect(poidsActuel([])).toBeNull();
  });
});

describe('stats: variationPoids7j', () => {
  it('calcule le % vs la pesée la plus proche de J-7', () => {
    const weights = [
      w('2026-08-01', 85),
      w('2026-08-29', 80),
      w('2026-09-01', 78),
      w('2026-09-08', 77.4),
    ]; // J-7 de 2026-09-08 = 2026-09-01 → (77.4-78)/78*100
    expect(variationPoids7j(weights)).toBeCloseTo(-0.769, 2);
  });

  it('retourne null avec une seule pesée', () => {
    expect(variationPoids7j([w('2026-09-08', 78)])).toBeNull();
  });

  it('retourne null si la pesée précédente a plus de 14 jours', () => {
    expect(variationPoids7j([w('2026-08-01', 80), w('2026-09-08', 78)])).toBeNull();
  });
});

describe('stats: recetteParRef', () => {
  const recettes: Recette[] = [
    { id: 'r1-poulet', nom: 'Poulet' },
    { id: 'r10-else', nom: 'Else' },
  ];

  it('match exact puis préfixe borné (r1 ne matche pas r10)', () => {
    expect(recetteParRef('r1', recettes)?.id).toBe('r1-poulet');
    expect(recetteParRef('R1-POULET', recettes)?.id).toBe('r1-poulet');
    expect(recetteParRef('inconnu', recettes)).toBeUndefined();
  });
});

describe('stats: kcalDuJour', () => {
  const recettes: Recette[] = [
    { id: 'r1', nom: 'R1', kcal: 680 },
    { id: 'r2', nom: 'R2', kcal: 620 },
    { id: 'r7', nom: 'R7', kcal: 710 },
  ];

  it('somme les repas du profil Marc (déjeuner Marc + dîner famille)', () => {
    const jour: MenuDay = {
      jour: 'lundi',
      recetteRefs: { dejeunerMarc: 'r1', dinerFamille: 'r2', dejeunerMelanie: 'r7' },
    };
    expect(kcalDuJour(jour, recettes, 'marc')).toBe(1300);
  });

  it('Mélanie : diner-melanie remplace diner-famille quand présent', () => {
    const jour: MenuDay = {
      jour: 'lundi',
      recetteRefs: { dinerFamille: 'r2', dinerMelanie: 'r7', dejeunerMelanie: 'r1' },
    };
    expect(kcalDuJour(jour, recettes, 'melanie')).toBe(1390);
  });

  it('retourne null sans jour, sans refs ou sans kcal', () => {
    expect(kcalDuJour(undefined, recettes, 'marc')).toBeNull();
    expect(kcalDuJour({ jour: 'lundi' }, recettes, 'marc')).toBeNull();
    expect(kcalDuJour({ jour: 'lundi', recetteRefs: { dejeunerMarc: 'r1' } }, [
      { id: 'r1', nom: 'R1' },
    ], 'marc')).toBeNull();
  });
});

describe('stats: compteChecklist', () => {
  it('compte les items cochés', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(compteChecklist({ a: true, c: true }, items)).toEqual({ faites: 2, total: 3 });
    expect(compteChecklist({}, items)).toEqual({ faites: 0, total: 3 });
  });
});
```

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/stats.test.ts`
Expected: FAIL (module `../src/lib/stats` introuvable).

- [ ] **Step 3: Implémenter `src/lib/stats.ts`**

```ts
import type { MealKey, MenuDay, ProfileKey, Recette } from './model';
import type { WeightEntry } from './storage';

const JOUR_MS = 86_400_000;
const time = (iso: string): number => new Date(`${iso}T00:00:00`).getTime();

export const poidsActuel = (weights: WeightEntry[]): WeightEntry | null =>
  weights.length > 0 ? weights[weights.length - 1] : null;

// % vs la pesée la plus proche de J-7 (fenêtre 14 jours max), null sinon.
export const variationPoids7j = (weights: WeightEntry[]): number | null => {
  if (weights.length < 2) return null;
  const last = weights[weights.length - 1];
  const lastTime = time(last.date);
  const cible = lastTime - 7 * JOUR_MS;
  const prev = weights
    .slice(0, -1)
    .reduce((best, w) => {
      const d = Math.abs(time(w.date) - cible);
      return d < best.d ? { w, d } : best;
    }, { w: weights[0], d: Number.POSITIVE_INFINITY });
  if (lastTime - time(prev.w.date) > 14 * JOUR_MS) return null;
  return ((last.kg - prev.w.kg) / prev.w.kg) * 100;
};

// égalité exacte d'abord, puis préfixe borné (`r1` ne doit pas matcher `r10-…`)
export const recetteParRef = (ref: string, recettes: Recette[]): Recette | undefined => {
  const cible = ref.toLowerCase();
  return recettes.find((r) => r.id === cible) ?? recettes.find((r) => r.id.startsWith(`${cible}-`));
};

// Somme des kcal des repas qui concernent le profil actif (batch exclu).
export const kcalDuJour = (
  jour: MenuDay | undefined,
  recettes: Recette[],
  profil: ProfileKey,
): number | null => {
  if (!jour || !jour.recetteRefs) return null;
  const keys: MealKey[] =
    profil === 'marc'
      ? ['dejeunerMarc', 'dinerFamille']
      : ['dejeunerMelanie', jour.dinerMelanie ? 'dinerMelanie' : 'dinerFamille'];
  let total: number | null = null;
  for (const key of keys) {
    const ref = jour.recetteRefs[key];
    if (!ref) continue;
    const recette = recetteParRef(ref, recettes);
    if (recette?.kcal != null) total = (total ?? 0) + recette.kcal;
  }
  return total;
};

export interface CompteChecklist {
  faites: number;
  total: number;
}

export const compteChecklist = (
  checks: Record<string, boolean>,
  items: Array<{ id: string }>,
): CompteChecklist => ({
  faites: items.filter((i) => checks[i.id]).length,
  total: items.length,
});
```

- [ ] **Step 4: Vérifier le vert**

Run: `npx vitest run tests/stats.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Gates + commit**

Run: `npm test && npm run typecheck && npm run lint`

```bash
git add src/lib/stats.ts tests/stats.test.ts
git commit -m "feat: stats dérivées (poids, kcal du jour par profil, compteurs checklist)"
```

### Task 6: Objectifs dans le profil (TDD)

**Files:**
- Modify: `src/lib/model.ts:89-93`
- Modify: `src/lib/storage.ts` (`loadProfile`)
- Test: `tests/storage.test.ts`

- [ ] **Step 1: Écrire les tests (rouge) — dans `tests/storage.test.ts`, describe `storage: profil`, ajouter :**

```ts
  it('les objectifs optionnels sont persistés et rechargés', () => {
    localStorage.clear();
    saveProfile({ id: 'marc', age: 41, taille: 178, poidsObjectif: 72, kcalObjectif: 2450 });
    expect(loadProfile()).toEqual({
      id: 'marc',
      age: 41,
      taille: 178,
      poidsObjectif: 72,
      kcalObjectif: 2450,
    });
  });

  it('un profil ancien sans objectifs charge tel quel', () => {
    localStorage.clear();
    localStorage.setItem('sportapp:profile', JSON.stringify({ id: 'marc', age: 41, taille: 178 }));
    expect(loadProfile()).toEqual({ id: 'marc', age: 41, taille: 178 });
  });

  it('un objectif non numérique invalide le profil (réparation silencieuse)', () => {
    localStorage.clear();
    localStorage.setItem(
      'sportapp:profile',
      JSON.stringify({ id: 'marc', age: 41, taille: 178, poidsObjectif: 'soixante' }),
    );
    expect(loadProfile()).toBeNull();
  });
```

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL (profil avec `poidsObjectif` string ne renvoie pas null / types TS).

- [ ] **Step 3: Modifier `model.ts` et `storage.ts`**

`src/lib/model.ts` :

```ts
export interface UserProfile {
  id: ProfileKey;
  age: number;
  taille: number;
  poidsObjectif?: number;
  kcalObjectif?: number;
}
```

Dans `src/lib/storage.ts`, remplacer la validation de `loadProfile` par :

```ts
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const optionalNum = (v: unknown): boolean => v === undefined || isNum(v);
  const ok =
    isPlainObject(parsed) &&
    (parsed.id === 'marc' || parsed.id === 'melanie') &&
    isNum(parsed.age) &&
    isNum(parsed.taille) &&
    optionalNum(parsed.poidsObjectif) &&
    optionalNum(parsed.kcalObjectif);
```

- [ ] **Step 4: Vérifier le vert**

Run: `npx vitest run tests/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Gates + commit**

```bash
git add src/lib/model.ts src/lib/storage.ts tests/storage.test.ts
git commit -m "feat: objectifs poids et kcal optionnels dans le profil (rétrocompatible)"
```

### Task 7: `WeightChart` (TDD) — remplace `Sparkline`

**Files:**
- Create: `src/components/WeightChart.tsx`
- Delete: `src/components/Sparkline.tsx`
- Test: `tests/components.test.tsx` (remplacer le `describe('Sparkline')`)

- [ ] **Step 1: Écrire les tests (rouge)**

Dans `tests/components.test.tsx`, remplacer tout le bloc `describe('Sparkline', ...)` par :

```tsx
describe('WeightChart', () => {
  const base = [
    { date: '2026-01-05', kg: 85 },
    { date: '2026-03-02', kg: 82 },
    { date: '2026-05-04', kg: 80.5 },
    { date: '2026-09-07', kg: 78 },
  ];

  it('affiche départ, actuel, objectif et les dates d axe', () => {
    render(<WeightChart weights={base} objectif={72} />);
    expect(screen.getAllByText('85 kg').length).toBeGreaterThanOrEqual(1); // chip + point de départ
    expect(screen.getAllByText('78 kg').length).toBeGreaterThanOrEqual(1); // chip + point actuel
    expect(screen.getByText('72 kg')).toBeInTheDocument(); // objectif (chip seul)
    expect(screen.getByText(/05\/01/)).toBeInTheDocument(); // 1re pesée
    expect(screen.getByText(/07\/09/)).toBeInTheDocument(); // dernière
    expect(screen.getByRole('img', { name: /courbe de poids/i })).toBeInTheDocument();
  });

  it('affiche « — » à la place de l objectif absent', () => {
    render(<WeightChart weights={base} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('invite à ajouter des pesées en dessous de 2 points', () => {
    render(<WeightChart weights={[{ date: '2026-09-07', kg: 78 }]} />);
    expect(screen.getByText(/Ajoutez au moins 2 pesées/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
```

Mettre à jour l'import en tête de fichier : remplacer `Sparkline` par `WeightChart` (`import { WeightChart } from '../src/components/WeightChart';`).

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/components.test.tsx`
Expected: FAIL (WeightChart n'existe pas).

- [ ] **Step 3: Implémenter `src/components/WeightChart.tsx`**

```tsx
import type { WeightEntry } from '../lib/storage';
import { formatDayMonth } from '../lib/dates';

const W = 300;
const H = 78;
const PAD_G = 26; // marge gauche pour les labels kg
const Y_TOP = 9;
const Y_BOT = 62;

// Catmull-Rom → bézier cubique : courbe lissée passant par tous les points.
function cheminLisse(pts: Array<[number, number]>): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export function WeightChart({ weights, objectif }: { weights: WeightEntry[]; objectif?: number }) {
  if (weights.length < 2) {
    return <p className="muted">Ajoutez au moins 2 pesées pour voir la courbe.</p>;
  }
  const kg = weights.map((w) => w.kg);
  const min = Math.min(...kg, objectif ?? Infinity);
  const max = Math.max(...kg, objectif ?? -Infinity);
  const span = max - min || 1;
  const y = (v: number) => Y_BOT - ((v - min) / (max - min)) * (Y_BOT - Y_TOP);
  const pts = weights.map((w, i): [number, number] => [
    PAD_G + (i / (weights.length - 1)) * (W - PAD_G),
    y(w.kg),
  ]);
  const premier = weights[0];
  const dernier = weights[weights.length - 1];
  const objectifY = objectif != null ? y(objectif) : null;
  const grid = [max, (min + max) / 2, min];
  const aire = `${cheminLisse(pts)} L ${W} ${Y_BOT} L ${PAD_G} ${Y_BOT} Z`;

  return (
    <div className="weight-chart">
      <div className="weight-chips">
        <div className="weight-chip">
          <span className="stat-label">Départ</span>
          <strong>{premier.kg} kg</strong>
        </div>
        <div className="weight-chip">
          <span className="stat-label">Actuel</span>
          <strong className="weight-actuel">{dernier.kg} kg</strong>
        </div>
        <div className="weight-chip">
          <span className="stat-label">Objectif</span>
          <strong className="weight-objectif">{objectif != null ? `${objectif} kg` : '—'}</strong>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="weight-curve"
        role="img"
        aria-label={`Courbe de poids de ${premier.kg} à ${dernier.kg} kg`}
      >
        <defs>
          <linearGradient id="poids-aire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((v) => (
          <g key={v}>
            <line x1={PAD_G} y1={y(v)} x2={W} y2={y(v)} className="weight-grid" />
            <text x={PAD_G - 4} y={y(v) + 3} textAnchor="end" className="weight-grid-label">
              {Math.round(v)}
            </text>
          </g>
        ))}
        {objectifY != null && (
          <>
            <line x1={PAD_G} y1={objectifY} x2={W} y2={objectifY} className="weight-objectif-ligne" />
            <text x={W} y={objectifY - 4} textAnchor="end" className="weight-objectif-texte">
              Objectif {objectif}
            </text>
          </>
        )}
        <path d={aire} fill="url(#poids-aire)" />
        <path d={cheminLisse(pts)} fill="none" className="weight-ligne" />
        <circle cx={pts[0][0]} cy={pts[0][1]} r="4" className="weight-point weight-point-depart" />
        <circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r="4.5"
          className="weight-point weight-point-actuel"
        />
        <text x={pts[0][0] + 8} y={pts[0][1] + 1} className="weight-label">
          {premier.kg} kg
        </text>
        <text x={pts[pts.length - 1][0] - 8} y={pts[pts.length - 1][1] - 9} textAnchor="end" className="weight-label weight-label-actuel">
          {dernier.kg} kg
        </text>
        <line x1={PAD_G} y1={Y_BOT} x2={W} y2={Y_BOT} className="weight-axe" />
        <text x={PAD_G} y={H - 5} className="weight-mois">
          {formatDayMonth(premier.date)}
        </text>
        <text x={W} y={H - 5} textAnchor="end" className="weight-mois">
          {formatDayMonth(dernier.date)}
        </text>
      </svg>
    </div>
  );
}
```

Ajouter les styles correspondants dans `src/index.css` (section « Profils ») :

```css
.weight-chart {
  margin: 10px 0;
}

.weight-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.weight-chip {
  background: var(--surface-2);
  border-radius: 8px;
  padding: 8px;
}

.weight-chip strong {
  display: block;
  font-size: 14px;
}

.weight-actuel {
  color: var(--accent);
}

.weight-objectif {
  color: var(--accent-2);
}

.weight-curve {
  width: 100%;
  height: auto;
  margin-top: 12px;
}

.weight-grid {
  stroke: var(--surface-2);
  stroke-width: 1;
}

.weight-grid + text,
.weight-mois {
  fill: var(--muted);
  font-size: 8px;
  font-family: inherit;
}

.weight-objectif-ligne {
  stroke: var(--accent-2);
  stroke-width: 1.2;
  stroke-dasharray: 4 4;
  opacity: 0.7;
}

.weight-objectif-texte {
  fill: var(--accent-2);
  font-size: 8px;
  font-family: inherit;
  opacity: 0.85;
}

.weight-ligne {
  stroke: var(--accent);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.weight-point {
  fill: var(--surface);
  stroke: var(--accent);
  stroke-width: 2;
}

.weight-point-actuel {
  fill: var(--accent);
  stroke: var(--surface);
}

.weight-label {
  fill: var(--muted);
  font-size: 8.5px;
  font-family: inherit;
}

.weight-label-actuel {
  fill: var(--text);
  font-size: 9px;
  font-weight: 600;
}

.weight-axe {
  stroke: var(--border);
  stroke-width: 1;
}
```

- [ ] **Step 4: Vérifier le vert**

Run: `npx vitest run tests/components.test.tsx`
Expected: PASS (WeightChart neuf ; `Sparkline.tsx` reste en place jusqu'à la Task 8 — ProfileView l'importe encore).

- [ ] **Step 5: Gates + commit**

Run: `npm test && npm run typecheck && npm run lint`

```bash
git add src/components/WeightChart.tsx tests/components.test.tsx src/index.css
git commit -m "feat: WeightChart — courbe lissée, grille, objectif (remplace la sparkline)"
```

### Task 8: `StatCards` (TDD) + intégration App/ProfileView

**Files:**
- Create: `src/components/StatCards.tsx`
- Modify: `src/components/ProfileView.tsx` (props, ACCENTS, WeightChart)
- Modify: `src/App.tsx:59-68` (StatCards + bump pesées + profile en prop)
- Test: `tests/components.test.tsx`

- [ ] **Step 1: Écrire les tests (rouge)**

Dans `tests/components.test.tsx`, ajouter (avec les imports `vi` de vitest déjà utilisés) :

```tsx
describe('StatCards', () => {
  const data = {
    meta: { semaine: '2026-S37', menu: 'A', du: '2026-09-07', au: '2026-09-13' },
    courses: [
      { id: 'courses:p:1', rayon: 'p', label: 'Poulet' },
      { id: 'courses:p:2', rayon: 'p', label: 'Riz' },
    ],
    menu: [{ jour: 'Mercredi', recetteRefs: { dejeunerMarc: 'r1', dinerFamille: 'r2' } }],
    batch: [],
    profiles: {
      marc: { cibles: [], seances: [{ id: 's1' }, { id: 's2' }], rappels: [] },
      melanie: { cibles: [], seances: [], rappels: [] },
    },
    recettes: [
      { id: 'r1', nom: 'R1', kcal: 680 },
      { id: 'r2', nom: 'R2', kcal: 620 },
    ],
  } as WeeklyData;

  beforeEach(() => {
    localStorage.clear();
    vi.setSystemTime(new Date('2026-09-09T10:00:00')); // mercredi
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('affiche poids, kcal du jour (menu du jour), séances et courses', () => {
    addWeight('marc', '2026-09-02', 78);
    addWeight('marc', '2026-09-08', 77.4);
    setCheck('2026-S37', 's1', true);
    render(<StatCards data={data} profile={{ id: 'marc', age: 41, taille: 178 }} />);

    expect(screen.getByText('Poids')).toBeInTheDocument();
    expect(screen.getByText('77,4')).toBeInTheDocument();
    expect(screen.getByText(/vs 7 j/)).toBeInTheDocument();
    expect(screen.getByText('Kcal du jour')).toBeInTheDocument();
    expect(screen.getByText('1300')).toBeInTheDocument();
    expect(screen.getByText('Séances')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('/2')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('affiche les lignes objectif quand le profil en a', () => {
    setCheck('2026-S37', 's1', true);
    render(
      <StatCards
        data={data}
        profile={{ id: 'marc', age: 41, taille: 178, kcalObjectif: 2000 }}
      />,
    );
    expect(screen.getByText(/objectif 2 000/)).toBeInTheDocument();
  });

  it('poids null et kcal null s affichent en tiret (pas de crash)', () => {
    render(<StatCards data={data} profile={{ id: 'melanie', age: 38, taille: 165 }} />);
    const tirets = screen.getAllByText('—');
    expect(tirets.length).toBeGreaterThanOrEqual(2);
  });
});
```

Attention : `WeeklyData` doit être importé dans ce fichier (`import type { WeeklyData } from '../src/lib/model';`) si absent. Le rendu du `Mercredi` fonctionne car `vi.setSystemTime` fixe `todayKey()` à mercredi.

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/components.test.tsx`
Expected: FAIL (StatCards n'existe pas).

- [ ] **Step 3: Implémenter `src/components/StatCards.tsx`**

```tsx
import { useState } from 'react';
import type { UserProfile, WeeklyData } from '../lib/model';
import { todayKey } from '../lib/dates';
import { getChecks, getWeights } from '../lib/storage';
import { compteChecklist, kcalDuJour, poidsActuel, variationPoids7j } from '../lib/stats';

function formatKg(kg: number): string {
  return kg.toFixed(1).replace('.', ',');
}

export function StatCards({ data, profile }: { data: WeeklyData; profile: UserProfile }) {
  const [weights] = useState(() => getWeights(profile.id));
  const checks = getChecks(data.meta.semaine);

  const actuel = poidsActuel(weights);
  const variation = variationPoids7j(weights);
  const jour = data.menu.find((d) => d.jour.trim().toLowerCase() === todayKey());
  const kcal = kcalDuJour(jour, data.recettes ?? [], profile.id);
  const seances = compteChecklist(checks, data.profiles[profile.id].seances);
  const courses = compteChecklist(checks, data.courses);
  const coursesRestantes = courses.total - courses.faites;

  // La variation est « bonne » si elle va dans le sens de l'objectif.
  let deltaClass = 'stat-delta-neutre';
  let deltaTexte: string | null = null;
  if (actuel && variation != null) {
    const pct = variation.toFixed(1).replace('.', ',');
    const fleche = variation < 0 ? '▼' : '▲';
    deltaTexte = `${fleche} ${variation < 0 ? '' : '+'}${pct} % vs 7 j`;
    if (profile.poidsObjectif != null) {
      const perte = profile.poidsObjectif < actuel.kg;
      deltaClass = (variation < 0) === perte ? 'stat-delta-bon' : 'stat-delta-alerte';
    }
  }

  return (
    <div className="stat-cards" role="list" aria-label="Résumé de mon suivi">
      <div className="stat-card" role="listitem" aria-label="Poids">
        <span className="stat-label">Poids</span>
        <span className="stat-value">
          {actuel ? `${actuel.kg.toFixed(1).replace('.', ',')}` : '—'}
          {actuel && <small> kg</small>}
        </span>
        {deltaTexte && <span className={`stat-delta ${deltaClass}`}>{deltaTexte}</span>}
      </div>
      <div className="stat-card" role="listitem" aria-label="Kcal du jour">
        <span className="stat-label">Kcal du jour</span>
        <span className="stat-value">
          {kcal != null ? kcal.toLocaleString('fr-FR').replace(/,/g, ' ') : '—'}
          {kcal != null && <small> kcal</small>}
        </span>
        {profile.kcalObjectif != null && (
          <span className="stat-delta stat-delta-neutre">
            objectif {profile.kcalObjectif.toLocaleString('fr-FR')}
          </span>
        )}
      </div>
      <div className="stat-card" role="listitem" aria-label="Séances">
        <span className="stat-label">Séances</span>
        <span className="stat-value">
          {seances.faites}
          <small>/{seances.total}</small>
        </span>
        <span className="stat-bar" aria-hidden="true">
          <span
            className="stat-bar-fill stat-bar-accent"
            style={{ width: seances.total ? `${(seances.faites / seances.total) * 100}%` : '0%' }}
          />
        </span>
      </div>
      <div className="stat-card" role="listitem" aria-label="Courses">
        <span className="stat-label">Courses</span>
        <span className="stat-value">
          {coursesRestantes}
          <small> restantes</small>
        </span>
        <span className="stat-bar" aria-hidden="true">
          <span
            className="stat-bar-fill stat-bar-lime"
            style={{ width: courses.total ? `${(courses.faites / courses.total) * 100}%` : '0%' }}
          />
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Ajouter les styles stat-cards dans `src/index.css`**

```css
/* ---------- Stat-cards (Mon suivi) ---------- */

.stat-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-label {
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-value small {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
}

.stat-delta {
  font-size: 10px;
  font-weight: 600;
}

.stat-delta-bon {
  color: var(--accent-2);
}

.stat-delta-alerte {
  color: var(--accent);
}

.stat-delta-neutre {
  color: var(--muted);
}

.stat-bar {
  display: block;
  height: 6px;
  margin-top: 6px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.stat-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
}

.stat-bar-accent {
  background: var(--accent);
}

.stat-bar-lime {
  background: var(--accent-2);
}
```

- [ ] **Step 5: Brancher dans App.tsx et ProfileView.tsx**

`src/App.tsx` — ajouter l'état bump et StatCards :

```tsx
import { StatCards } from './components/StatCards';

// dans App():
  const [weightsBump, setWeightsBump] = useState(0);
```

et remplacer le contenu de `{tab === 'suivi' && ( ... )}` par :

```tsx
        {tab === 'suivi' && (
          <>
            <p className="greeting">Salut {PRENOMS[profile.id]} 👋</p>
            <StatCards key={weightsBump} data={week.data} profile={profile} />
            <ProfileView
              profile={profile}
              data={week.data.profiles[profile.id]}
              semaine={week.data.meta.semaine}
              onWeightsChanged={() => setWeightsBump((b) => b + 1)}
            />
          </>
        )}
```

`src/components/ProfileView.tsx` — remplacer la signature et les usages :

```tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProfileData, UserProfile } from '../lib/model';
import { addWeight, getWeights } from '../lib/storage';
import type { WeightEntry } from '../lib/storage';
import { todayISO, formatDayMonth } from '../lib/dates';
import { Checklist } from './Checklist';
import { WeightChart } from './WeightChart';

const TITLES: Record<UserProfile['id'], string> = {
  marc: 'Marc — Diet & Sport',
  melanie: 'Mélanie — Keto & Sport',
};

export function ProfileView({
  profile,
  data,
  semaine,
  onWeightsChanged,
}: {
  profile: UserProfile;
  data: ProfileData;
  semaine: string;
  onWeightsChanged?: () => void;
}) {
  const [weights, setWeights] = useState<WeightEntry[]>(() => getWeights(profile.id));
  const [syncedProfile, setSyncedProfile] = useState(profile.id);
  const [date, setDate] = useState<string>(todayISO);
  const [kg, setKg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  if (syncedProfile !== profile.id) {
    setSyncedProfile(profile.id);
    setWeights(getWeights(profile.id));
    setError(null);
    setKg('');
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Number(kg);
    if (Number.isNaN(value) || value <= 0) {
      setError('Poids invalide.');
      return;
    }
    setError(null);
    setWeights(addWeight(profile.id, date, value));
    setKg('');
    onWeightsChanged?.();
  };

  return (
    <>
      <h2 className="profile-title">{TITLES[profile.id]}</h2>
      {/* ... sections Cibles / Rappels inchangées ... */}
      <section className="profile-section">
        <h3>Suivi poids</h3>
        <form className="weight-form" onSubmit={handleSubmit}>
          {/* champs inchangés */}
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <WeightChart weights={weights} objectif={profile.poidsObjectif} />
        <ul className="weight-list">
          {[...weights].reverse().map((w) => (
            <li key={w.date}>
              {formatDayMonth(w.date)} — {w.kg} kg
            </li>
          ))}
        </ul>
      </section>
      {/* ... section Rappels inchangée ... */}
    </>
  );
}
```

(Supprimer la constante `ACCENTS` et l'import de `Sparkline` — tout le fichier suit ce modèle, seule la section « Suivi poids » change.)

Supprimer ensuite le fichier devenu inutile :

```bash
rm src/components/Sparkline.tsx
```

- [ ] **Step 6: Mettre à jour les tests existants qui passent `profileKey`**

Dans `tests/components.test.tsx` (describe `ProfileView`) et `tests/app.test.tsx` : remplacer `profileKey="marc"` par `profile={{ id: 'marc', age: 41, taille: 178 }}` (et idem pour mélanie). Rien d'autre ne change (les textes restent identiques).

- [ ] **Step 7: Vérifier le vert + gates**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tout passe, zéro référence à Sparkline (`rg Sparkline src/ tests/` → 0 résultat).

- [ ] **Step 8: Commit**

```bash
git add src/components/StatCards.tsx src/components/ProfileView.tsx src/App.tsx src/index.css tests/components.test.tsx tests/app.test.tsx
git rm src/components/Sparkline.tsx
git commit -m "feat: stat-cards de suivi et widget poids (départ/actuel/objectif + courbe)"
```

### Task 9: Champs objectifs dans Onboarding et ProfilScreen

**Files:**
- Modify: `src/components/onboarding/Onboarding.tsx`
- Modify: `src/components/ProfilScreen.tsx`
- Test: `tests/app.test.tsx` / `tests/components.test.tsx` (extension du test onboarding existant si présent)

- [ ] **Step 1: Écrire les tests (rouge) — dans `tests/app.test.tsx` (ou le fichier où vit l'onboarding), ajouter :**

```tsx
  it('l onboarding accepte des objectifs optionnels et les persiste', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Marc/ }));
    await user.type(screen.getByLabelText('Poids (kg)'), '85');
    await user.type(screen.getByLabelText('Âge'), '41');
    await user.type(screen.getByLabelText('Taille (cm)'), '178');
    await user.type(screen.getByLabelText('Poids objectif (kg)'), '72');
    await user.click(screen.getByRole('button', { name: /C'est parti/ }));

    expect(JSON.parse(localStorage.getItem('sportapp:profile')!)).toMatchObject({
      id: 'marc',
      poidsObjectif: 72,
    });
  });
```

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/app.test.tsx`
Expected: FAIL (`Poids objectif (kg)` introuvable).

- [ ] **Step 3: Onboarding — ajouter les deux champs optionnels**

Dans `src/components/onboarding/Onboarding.tsx`, ajouter deux états :

```tsx
  const [poidsObjectif, setPoidsObjectif] = useState('');
  const [kcalObjectif, setKcalObjectif] = useState('');
```

Dans `valider()`, après les validations existantes, ajouter :

```tsx
    const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
    if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
      setError('Poids objectif invalide : entre 30 et 250 kg.');
      return;
    }
    const kcalObj = kcalObjectif ? Number.parseInt(kcalObjectif, 10) : undefined;
    if (kcalObjectif && (kcalObj === undefined || kcalObj < 800 || kcalObj > 6000)) {
      setError('Objectif kcal invalide : entre 800 et 6000.');
      return;
    }
```

et remplacer la construction du profil :

```tsx
    const profile: UserProfile = {
      id,
      age: ans,
      taille: cm,
      ...(obj != null ? { poidsObjectif: obj } : {}),
      ...(kcalObj != null ? { kcalObjectif: kcalObj } : {}),
    };
```

Dans le JSX de l'étape 2, après la row Âge/Taille, ajouter :

```tsx
            <div className="onboarding-row">
              <div className="onboarding-field">
                <label htmlFor="ob-obj-poids">Poids objectif (kg)</label>
                <input
                  id="ob-obj-poids"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={poidsObjectif}
                  onChange={(e) => {
                    setError(null);
                    setPoidsObjectif(e.target.value);
                  }}
                />
              </div>
              <div className="onboarding-field">
                <label htmlFor="ob-obj-kcal">Objectif kcal/jour</label>
                <input
                  id="ob-obj-kcal"
                  type="number"
                  inputMode="numeric"
                  value={kcalObjectif}
                  onChange={(e) => {
                    setError(null);
                    setKcalObjectif(e.target.value);
                  }}
                />
              </div>
            </div>
```

et mettre à jour le message d'erreur du formulaire incomplet : `'Formulaire incomplet : remplis ton poids, ton âge et ta taille.'` reste valable (les objectifs sont optionnels).

- [ ] **Step 4: ProfilScreen — mêmes champs éditables**

Dans `src/components/ProfilScreen.tsx` :

```tsx
  const [poidsObjectif, setPoidsObjectif] = useState(
    profile.poidsObjectif != null ? String(profile.poidsObjectif) : '',
  );
  const [kcalObjectif, setKcalObjectif] = useState(
    profile.kcalObjectif != null ? String(profile.kcalObjectif) : '',
  );
```

Dans `enregistrer()`, après la validation âge/taille :

```tsx
    const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
    if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
      setError('Poids objectif invalide : entre 30 et 250 kg.');
      return;
    }
    const kcalObj = kcalObjectif ? Number.parseInt(kcalObjectif, 10) : undefined;
    if (kcalObjectif && (kcalObj === undefined || kcalObj < 800 || kcalObj > 6000)) {
      setError('Objectif kcal invalide : entre 800 et 6000.');
      return;
    }
    const updated: UserProfile = {
      id: profile.id,
      age: ans,
      taille: cm,
      ...(obj != null ? { poidsObjectif: obj } : {}),
      ...(kcalObj != null ? { kcalObjectif: kcalObj } : {}),
    };
```

Dans le JSX, ajouter une row identique à celle de l'onboarding (ids `pf-obj-poids`, `pf-obj-kcal`, labels `Poids objectif (kg)`, `Objectif kcal/jour`) avec `onChange` qui fait `setSaved(false); setError(null);` puis set la valeur.

- [ ] **Step 5: Vérifier le vert + gates + commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

```bash
git add src/components/onboarding/Onboarding.tsx src/components/ProfilScreen.tsx tests/app.test.tsx
git commit -m "feat: poids objectif et objectif kcal dans l onboarding et le profil"
```

---

## Phase 3 — Recettes (contrat .md + parser + UI)

### Task 10: Parser — glucides, lipides, score, image (TDD)

**Files:**
- Modify: `src/lib/model.ts` (interface `Recette`)
- Modify: `src/lib/parse.ts` (`parseRecettes`)
- Test: `tests/parse.test.ts`

- [ ] **Step 1: Écrire les tests (rouge) — dans `tests/parse.test.ts`, ajouter :**

```ts
describe('recettes — clés macros, score, image', () => {
  const base = '---\nsemaine: 2026-S39\nmenu: A\ndu: 2026-09-21\nau: 2026-09-27\n---\n\n## Marc\n### Cibles\n- x\n### Seances\n- [ ] y\n### Rappels\n- z\n\n## Melanie\n### Cibles\n- x\n### Seances\n- [ ] y\n### Rappels\n- z\n\n## Courses\n### Fraicheur\n- Poulet\n\n## Menu\n### Lundi\n- dejeuner-marc: A\n\n## Batch\n- [ ] B\n\n## Recettes\n### R1 · Poulet rôti\nkcal: 450\nproteines: 35\nglucides: 30\nlipides: 12\nscore: 9\nimage: https://images.unsplash.com/photo-123\n1. Étape un\n';

  it('parse les nouvelles clés optionnelles', () => {
    const { data } = parseWeeklyFile(base);
    const [r1] = data.recettes ?? [];
    expect(r1?.nom).toBe('R1 · Poulet rôti');
    expect(r1?.glucides).toBe(30);
    expect(r1?.lipides).toBe(12);
    expect(r1?.score).toBe(9);
    expect(r1?.image).toBe('https://images.unsplash.com/photo-123');
  });

  it('score invalide (hors 0-10 ou non entier) → warning + champ absent', () => {
    const mauvais = base.replace('score: 9', 'score: 42');
    const { data, warnings } = parseWeeklyFile(mauvais);
    expect(data.recettes?.[0].score).toBeUndefined();
    expect(warnings.some((w) => w.includes('score'))).toBe(true);
  });

  it('image non-https → warning + champ absent', () => {
    const mauvais = base.replace('image: https://', 'image: http://');
    const { data, warnings } = parseWeeklyFile(mauvais);
    expect(data.recettes?.[0].image).toBeUndefined();
    expect(warnings.some((w) => w.includes('image'))).toBe(true);
  });

  it('glucides/lipides invalides → warning + champ absent (comme kcal)', () => {
    const mauvais = base.replace('glucides: 30', 'glucides: abc');
    const { data, warnings } = parseWeeklyFile(mauvais);
    expect(data.recettes?.[0].glucides).toBeUndefined();
    expect(warnings.some((w) => w.includes('glucides'))).toBe(true);
  });
});
```

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/parse.test.ts`
Expected: FAIL (clés non parsées → ligne ignorée).

- [ ] **Step 3: Implémenter dans `parse.ts`**

Dans `src/lib/parse.ts` (`parseRecettes`), remplacer la ligne du `kv` et le corps de dispatch :

```ts
    const kv = line.match(/^(temps|kcal|proteines|glucides|lipides|score|image|bases)\s*:\s*(.+?)\s*$/);
    if (kv) {
      if (kv[1] === 'temps') rec.temps = kv[2];
      else if (kv[1] === 'bases') rec.bases = kv[2].split(',').map((b) => b.trim());
      else if (kv[1] === 'image') {
        if (kv[2].startsWith('https://')) rec.image = kv[2];
        else warnings.push(`Valeur image invalide pour la recette « ${rec.nom} » : ligne ignorée.`);
      } else if (kv[1] === 'score') {
        const n = Number(kv[2]);
        if (Number.isInteger(n) && n >= 0 && n <= 10) rec.score = n;
        else warnings.push(`Valeur score invalide pour la recette « ${rec.nom} » : ligne ignorée.`);
      } else {
        const n = nombreValide(kv[2]);
        if (n === undefined)
          warnings.push(`Valeur ${kv[1]} invalide pour la recette « ${rec.nom} » : ligne ignorée.`);
        else if (kv[1] === 'kcal') rec.kcal = n;
        else if (kv[1] === 'proteines') rec.proteines = n;
        else if (kv[1] === 'glucides') rec.glucides = n;
        else rec.lipides = n;
      }
      continue;
    }
```

Dans `src/lib/model.ts` :

```ts
export interface Recette {
  id: string;
  nom: string;
  temps?: string;
  kcal?: number;
  proteines?: number;
  glucides?: number;
  lipides?: number;
  score?: number;
  image?: string;
  pour?: string;
  bases?: string[];
  etapes?: string[];
  mel?: string;
  batch?: string;
}
```

- [ ] **Step 4: Vérifier le vert + gates + commit**

Run: `npm test && npm run typecheck && npm run lint`

```bash
git add src/lib/parse.ts src/lib/model.ts tests/parse.test.ts
git commit -m "feat: parser recettes — glucides, lipides, score (0-10) et image (https) optionnels"
```

### Task 11: Fiche recette enrichie (image, macros, score) (TDD)

**Files:**
- Modify: `src/components/cuisine/MenuView.tsx` (`RecetteCard`)
- Modify: `src/index.css` (styles recette)
- Test: `tests/components.test.tsx` (describe `MenuView — accordéon recette`)

- [ ] **Step 1: Écrire les tests (rouge) — dans `tests/components.test.tsx`, describe `MenuView — accordéon recette`, ajouter :**

```tsx
  it('affiche photo, chips macros et score segmenté quand les données existent', async () => {
    const user = userEvent.setup();
    render(
      <MenuView
        menu={[{ jour: 'Lundi', dejeunerMarc: 'Poulet', recetteRefs: { dejeunerMarc: 'r1' } }]}
        recettes={[
          {
            id: 'r1',
            nom: 'Poulet rôti',
            kcal: 450,
            proteines: 35,
            glucides: 30,
            lipides: 12,
            score: 9,
            image: 'https://images.unsplash.com/photo-x?w=800',
          },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Poulet rôti/ }));

    const img = screen.getByRole('img', { name: /Poulet rôti/ });
    expect(img).toHaveAttribute('src', 'https://images.unsplash.com/photo-x?w=800');
    expect(screen.getByText(/450/)).toBeInTheDocument();
    expect(screen.getByText(/30g/)).toBeInTheDocument();
    expect(screen.getByText(/12g/)).toBeInTheDocument();
    expect(screen.getByText(/9\s*\/\s*10|9\/10/)).toBeInTheDocument();
    // 10 segments dont 9 remplis
    const barre = screen.getByTestId('score-bar');
    expect(barre.children).toHaveLength(10);
  });

  it('affiche le fallback gradient + emoji sans image', async () => {
    const user = userEvent.setup();
    render(
      <MenuView
        menu={[{ jour: 'Lundi', dejeunerMarc: 'Poulet', recetteRefs: { dejeunerMarc: 'r1' } }]}
        recettes={[{ id: 'r1', nom: 'Poulet rôti', kcal: 450 }]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Poulet rôti/ }));

    expect(screen.getByTestId('recette-fallback')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/components.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implémenter dans `RecetteCard` (MenuView.tsx)**

Remplacer le header de l'article par une structure avec hero :

```tsx
  return (
    <article className="recette-card" aria-label={recette.nom}>
      {recette.image ? (
        <img className="recette-hero" src={recette.image} alt={recette.nom} loading="lazy" />
      ) : (
        <div className="recette-fallback" data-testid="recette-fallback" aria-hidden="true">
          🍳
        </div>
      )}
      <div className="recette-corps">
        <header className="recette-head">
          <div className="recette-title">
            <div className="recette-nom">{recette.nom}</div>
            <div className="recette-meta">
              {recette.temps && <>⏱ {recette.temps}</>}
              {recette.temps && ' · '}
              pour 4
            </div>
          </div>
          <button type="button" className="recette-close" aria-label="Fermer la recette" onClick={onClose}>
            ×
          </button>
        </header>
        {/* ... suite inchangée : chips stats, macros, score, pour, bases, étapes, mel, batch ... */}
      </div>
    </article>
  );
```

Remplacer le bloc chips stats existant par (kcal/protéines avec nouveau libellé + glucides/lipides) :

```tsx
      {(recette.kcal != null || recette.proteines != null || recette.glucides != null || recette.lipides != null) && (
        <div className="recette-stats">
          {recette.kcal != null && <span>🔥 ~{recette.kcal} kcal /pers</span>}
          {recette.glucides != null && <span>🌾 {recette.glucides}g C</span>}
          {recette.proteines != null && <span>💪 {recette.proteines}g P</span>}
          {recette.lipides != null && <span>💧 {recette.lipides}g F</span>}
        </div>
      )}
      {recette.score != null && (
        <div className="recette-score">
          <span className="stat-label">Health score</span>
          <span className="recette-score-value">
            {recette.score}
            <small>/10</small>
          </span>
          <div className="score-bar" data-testid="score-bar" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < recette.score! ? 'score-seg on' : 'score-seg'} />
            ))}
          </div>
        </div>
      )}
```

Retirer l'icône `<span className="recette-ico">🍳</span>` du header (l'emoji vit dans le fallback hero).

Styles dans `src/index.css` (section « Fiche recette », adapter l'existant) :

```css
.recette-card {
  margin: 10px 0 4px;
  padding: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.recette-fallback {
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 35%, var(--surface-2)), color-mix(in srgb, var(--accent-2) 30%, var(--surface-2)));
}

.recette-corps {
  padding: 14px;
}

.recette-hero {
  width: 100%;
  height: 130px;
  object-fit: cover;
  display: block;
}

.recette-stats span {
  background: var(--surface-2);
  border: none;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
}

.recette-score {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.recette-score-value {
  font-size: 14px;
  font-weight: 600;
}

.recette-score-value small {
  color: var(--muted);
  font-weight: 400;
  font-size: 11px;
}

.score-bar {
  display: flex;
  gap: 3px;
  flex: 1;
}

.score-seg {
  flex: 1;
  height: 6px;
  border-radius: 4px;
  background: var(--surface-2);
}

.score-seg.on {
  background: var(--accent);
}
```

(Sur `.recette-hero`, appliquer la classe `recette-hero` à l'`<img>` : `className="recette-hero"`.)

- [ ] **Step 4: Vérifier le vert + gates + commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

```bash
git add src/components/cuisine/MenuView.tsx src/index.css tests/components.test.tsx
git commit -m "feat: fiche recette — photo hero (fallback gradient), chips macros, score segmenté"
```

### Task 12: Semaine d'exemple enrichie + README + cache Unsplash

**Files:**
- Modify: `src/assets/semaine-exemple.md` (R1, R2, R7)
- Modify: `README.md` (contrat .md)
- Modify: `vite.config.ts` (runtimeCaching)
- Test: `tests/app.test.tsx` (fixtures déjà couvertes — vérifier que les warnings restent vides)

- [ ] **Step 1: Enrichir les recettes de la semaine d'exemple**

Dans `src/assets/semaine-exemple.md`, ajouter sous `proteines:` de chaque recette :

R1 : `glucides: 45`, `lipides: 28`, `score: 7`, `image: https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80&auto=format&fit=crop`
R2 : `glucides: 68`, `lipides: 18`, `score: 6`, `image: https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&auto=format&fit=crop`
R7 : `glucides: 52`, `lipides: 24`, `score: 8`, `image: https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80&auto=format&fit=crop`

(Ordre des clés : `temps`, `kcal`, `proteines`, `glucides`, `lipides`, `score`, `image`, puis `- pour 4:`.)

- [ ] **Step 2: Vérifier que l'exemple parse sans warning**

Run: `npx vitest run tests/app.test.tsx`
Expected: le describe « Semaine d'exemple » passe toujours (warnings `[]`).

- [ ] **Step 3: Étendre le runtimeCaching aux images Unsplash**

Dans `vite.config.ts`, dans `workbox.runtimeCaching`, ajouter après l'entrée jpg/jpeg/webp :

```ts
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
```

- [ ] **Step 4: Mettre à jour le README (section du contrat .md, bloc Recettes)**

Ajouter dans la liste des clés de recette du README :

```markdown
- `glucides:` / `lipides:` (optionnels, g par personne — chips 🌾 C / 💧 F de la fiche)
- `score:` (optionnel, entier 0-10 — health score en barre segmentée)
- `image:` (optionnel, URL https — photo du plat, mise en cache PWA après 1ʳᵉ vue)
```

- [ ] **Step 5: Gates + commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

```bash
git add src/assets/semaine-exemple.md README.md vite.config.ts
git commit -m "feat: semaine d'exemple avec macros/score/photos + cache PWA Unsplash + README"
```

---

## Phase 4 — Nettoyage theming + docs sync

### Task 13: Suppression du `data-profile` (accent unique)

**Files:**
- Modify: `src/App.tsx:28-32`
- Modify: `src/components/onboarding/Onboarding.tsx:58`
- Test: `tests/app.test.tsx` (describe `Theming par profil (data-profile)`)

- [ ] **Step 1: Mettre à jour le test (rouge) — remplacer le describe `Theming par profil (data-profile)` par :**

```tsx
describe('Theming (accent unique)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-profile');
  });

  it('ne pose plus data-profile sur <html>, quel que soit le profil', () => {
    saveProfile({ id: 'melanie', age: 38, taille: 165 });
    const parsed = parseWeeklyFile(fixture());
    saveWeek(fixture(), parsed.data);

    render(<App />);

    expect(document.documentElement.getAttribute('data-profile')).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/app.test.tsx`
Expected: FAIL (App pose encore l'attribut).

- [ ] **Step 3: Supprimer le code**

`src/App.tsx` — supprimer le bloc :

```tsx
  if (profile) {
    document.documentElement.dataset.profile = profile.id;
  } else {
    delete document.documentElement.dataset.profile;
  }
```

`src/components/onboarding/Onboarding.tsx:58` — remplacer `<div className="onboarding" data-profile={id ?? undefined}>` par `<div className="onboarding">`.

- [ ] **Step 4: Vérifier le vert + gates + commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

```bash
git add src/App.tsx src/components/onboarding/Onboarding.tsx tests/app.test.tsx
git commit -m "feat: accent unique — suppression du theming data-profile"
```

### Task 14: Sync docs (AGENTS.md, design-system.md, README)

**Files:**
- Modify: `AGENTS.md` (section Le projet, Storage, Style de code)
- Modify: `ai/context/design-system.md` (tokens)
- Modify: `README.md` si nécessaire

- [ ] **Step 1: AGENTS.md**

Remplacer la ligne « L'app se teinte ensuite de la couleur perso » par :

```markdown
- L'app utilise un **accent unique** (orange #FFA257 + lime #C2E66E, palette Nutrigo) — plus de teinte par profil
```

Et dans « Style de code », remplacer la mention des accents profils (`--accent-marc/--accent-melanie`) par la description des tokens Nutrigo (`--accent` orange, `--accent-2` lime, Poppins auto-hébergée).

- [ ] **Step 2: `ai/context/design-system.md` — aligner les tokens sur `src/index.css`**

Lister les nouveaux tokens (bg #1b1d24, surface #272932, surface-2 #31333E, border #3F4351, text #F9F4F2, muted #8A8C90, accent #FFA257, accent-2 #C2E66E), la typo Poppins 400/500/600/700 et la règle « texte sombre #272932 sur accents clairs ». Si le fichier décrit les anciens tokens (`--accent-marc`, `--accent-melanie`, `--accent-strong`), les retirer. **Règle repo : si index.css et design-system.md divergent, corriger les deux.**

- [ ] **Step 3: Vérification finale complète (gates + e2e)**

Run: `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e`
Expected: tout passe, y compris zéro débordement horizontal 320/375.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md ai/context/design-system.md README.md
git commit -m "docs: sync AGENTS et design-system (accent unique Nutrigo, Poppins, tokens)"
```

### Task 15: Vérification PWA du build de prod

- [ ] **Step 1: Build + preview**

Run: `npm run build && npm run preview`
Vérifier : `ls dist/` contient `sw.js` + `manifest.webmanifest` ; `ls dist/assets/*.woff2` contient les 4 Poppins ; l'app se charge sur `http://localhost:4173/sport-app/` avec le fond `#1b1d24`.

- [ ] **Step 2: e2e sur le build de prod (comme le workflow Deploy)**

Run: `npm run e2e:preview`
Expected: vert.

---

## Récapitulatif des fichiers

| Action | Fichier |
|---|---|
| Create | `src/assets/fonts/poppins-{400,500,600,700}.woff2` |
| Create | `src/lib/stats.ts`, `src/components/StatCards.tsx`, `src/components/WeightChart.tsx` |
| Delete | `src/components/Sparkline.tsx` |
| Modify | `src/index.css`, `src/App.tsx`, `src/lib/model.ts`, `src/lib/parse.ts`, `src/lib/storage.ts`, `src/components/ProfileView.tsx`, `src/components/cuisine/MenuView.tsx`, `src/components/onboarding/Onboarding.tsx`, `src/components/ProfilScreen.tsx`, `vite.config.ts`, `src/assets/semaine-exemple.md`, `README.md`, `AGENTS.md`, `ai/context/design-system.md` |
| Tests | `tests/stats.test.ts` (new), `tests/parse.test.ts`, `tests/storage.test.ts`, `tests/components.test.tsx`, `tests/app.test.tsx` |
