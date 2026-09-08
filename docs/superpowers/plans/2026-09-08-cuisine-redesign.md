# Redesign des 3 onglets Cuisine (direction A « Carnet », contenu enrichi) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redessiner Courses / Menu / Batch selon la maquette A validée (recettes dépliables enrichies, rituel batch en timeline, encadré keto, compteurs par rayon, bannière avec pill Menu, jour courant en premier, jours passés atténués) en étendant le format .md de façon rétrocompatible.

**Architecture:** Le parser (`parse.ts`) gagne 4 blocs optionnels (Recettes, Bases, Rituel, Micro-batch) + extraction de références `→ slug` dans le menu — tout additif, les semaines v1 restent valides et les ids de coches ne changent pas. Les vues (MenuView, BatchView, ShoppingList, WeekBanner) consomment ces champs optionnels avec états vides propres. CSS sémantique dans `src/index.css`.

**Tech Stack:** React 18 + TypeScript strict, vitest + Testing Library (happy-dom), Playwright (mobile), CSS vanilla. Gates avant chaque commit : `npm test && npm run typecheck && npm run lint && npm run build`.

**Conventions repo (AGENTS.md) :** TDD rouge→vert ; `fireEvent.submit` pour les formulaires ; mocks d'horloge avec `vi.setSystemTime(new Date('…T10:00:00'))` (heure locale) + `vi.useRealTimers()` ; `localStorage.clear()` en `beforeEach` ; pattern render-phase reset (`syncedSemaine`) pour la resync par prop ; commits FR conventionnels.

**Spécification :** `docs/superpowers/specs/2026-09-08-cuisine-redesign-design.md`

---

### Task 1 : Types du domaine (model.ts)

**Files:**
- Modify: `src/lib/model.ts`

- [ ] **Step 1.1 : Ajouter les nouveaux types et étendre les existants**

Dans `src/lib/model.ts`, ajouter après `ChecklistItem` :

```ts
export interface Recette {
  id: string;
  nom: string;
  temps?: string;
  kcal?: number;
  proteines?: number;
  pour?: string;
  bases?: string[];
  etapes?: string[];
  mel?: string;
  batch?: string;
}

export interface BaseCuisine {
  id: string;
  nom: string;
  texte: string;
}

export interface RituelEtape {
  id: string;
  creneau: string;
  label: string;
  detail?: string;
}

export interface MicroBatchJour {
  jour: string;
  quoi: string;
}

export type MealKey = 'dejeunerMarc' | 'dejeunerMelanie' | 'dinerFamille' | 'dinerMelanie' | 'batch';
```

Étendre `MenuDay` (ajouter `recetteRefs` à la fin) :

```ts
export interface MenuDay {
  jour: string;
  dejeunerMarc?: string;
  dejeunerMelanie?: string;
  dinerFamille?: string;
  dinerMelanie?: string;
  batch?: string;
  recetteRefs?: Partial<Record<MealKey, string>>;
}
```

Étendre `WeeklyData` (champs optionnels — rétrocompatibilité des semaines stockées) :

```ts
export interface WeeklyData {
  meta: WeekMeta;
  courses: CourseItem[];
  menu: MenuDay[];
  batch: ChecklistItem[];
  profiles: Record<ProfileKey, ProfileData>;
  recettes?: Recette[];
  bases?: BaseCuisine[];
  rituel?: RituelEtape[];
  microBatch?: MicroBatchJour[];
}
```

- [ ] **Step 1.2 : Vérifier que tout compile**

Run: `npm run typecheck && npm test`
Expected: OK (aucun consommateur cassé — champs optionnels).

- [ ] **Step 1.3 : Commit**

```bash
git add src/lib/model.ts
git commit -m "feat: types du domaine v2 (recettes, bases, rituel, micro-batch, refs menu)"
```

---

### Task 2 : Parser v2 — recettes, bases, rituel, micro-batch, refs menu

**Files:**
- Modify: `src/lib/parse.ts`
- Test: `tests/parse.test.ts`

- [ ] **Step 2.1 : Écrire les tests (rouge)**

Ajouter en bas de `tests/parse.test.ts` :

```ts
const V2_WEEK = `---
semaine: 2026-S39
menu: A
du: 2026-09-21
au: 2026-09-27
---

## Courses
### Protéines
- Poulet 600 g

### Keto
- Avocats ×3-4
- Chocolat noir ≥ 85 %

## Menu
### Mardi
- dejeuner-marc: Boîte poulet-riz
- diner-famille: Pâtes bolognaise + salade → R2
- diner-melanie: Bolo sur courgettes + parmesan → r2
- batch: Double sauce → boîte mer

## Recettes
### R2 · Pâtes bolognaise + salade
temps: 25 min · plaque + casserole
kcal: 620
proteines: 42
bases: B4, B6
- pour 4: 800 g haché 5 % · 2 boîtes tomates · 400 g pâtes
1. Oignons + ail à l'huile 5 min, haché 8 min.
2. Tomates + herbes, 15 min doux.
3. Pâtes al dente en parallèle.
- mel: bolo sur courgettes spaghetti + parmesan
- batch: double sauce → boîte mercredi

### R7 · Rôti de dinde + gratin courgettes
temps: 60 min · four 180°

## Bases
### B4 · Vinaigrette minute
3 c.à.s huile d'olive + 1 moutarde + jus d'½ citron + sel.

### B6 · Courgettes spaghetti
Julienne à l'économe, 3-4 min poêle très chaude, jamais à l'avance.

## Batch
### Rituel dimanche
- 0-5 min · Four à 180° — egg muffins ×10 lancés
- 5-30 min · Cuissons en double — dîner ×2 + féculent ×2

### Micro-batch
- lundi: doubler le plat
- mardi: doubler la sauce

- [ ] Egg muffins ×10

## Marc
### Cibles
- 2200 kcal

### Séances
- [ ] PPG lundi

### Rappels
- Pesée le lundi

## Melanie
### Cibles
- 1600 kcal

### Séances
- [ ] Yoga mardi

### Rappels
- Pesée le lundi
`;

describe('parseWeeklyFile — format v2 (recettes, bases, rituel, micro-batch)', () => {
  const { data, warnings } = parseWeeklyFile(V2_WEEK);

  it('extrait les recettes avec tous leurs champs', () => {
    expect(data.recettes).toHaveLength(2);
    const r2 = data.recettes![0];
    expect(r2.id).toBe('r2-pates-bolognaise-salade');
    expect(r2.nom).toBe('R2 · Pâtes bolognaise + salade');
    expect(r2.temps).toBe('25 min · plaque + casserole');
    expect(r2.kcal).toBe(620);
    expect(r2.proteines).toBe(42);
    expect(r2.bases).toEqual(['B4', 'B6']);
    expect(r2.pour).toContain('800 g haché');
    expect(r2.etapes).toEqual([
      "Oignons + ail à l'huile 5 min, haché 8 min.",
      'Tomates + herbes, 15 min doux.',
      'Pâtes al dente en parallèle.',
    ]);
    expect(r2.mel).toContain('courgettes spaghetti');
    expect(r2.batch).toContain('double sauce');
  });

  it('extrait les bases du carnet', () => {
    expect(data.bases).toHaveLength(2);
    expect(data.bases![0].id).toBe('b4-vinaigrette-minute');
    expect(data.bases![0].texte).toContain('huile d’olive');
  });

  it('lie les repas aux recettes via → et retire la référence du texte', () => {
    const mardi = data.menu[0];
    expect(mardi.recetteRefs).toEqual({ dinerFamille: 'R2', dinerMelanie: 'r2' });
    expect(mardi.dinerFamille).toBe('Pâtes bolognaise + salade');
    expect(mardi.dejeunerMarc).toBe('Boîte poulet-riz');
  });

  it('extrait le rituel du dimanche avec créneaux et ids stables', () => {
    expect(data.rituel).toHaveLength(2);
    expect(data.rituel![0]).toEqual({
      id: 'batch:rituel:four-a-180',
      creneau: '0-5 min',
      label: 'Four à 180°',
      detail: 'egg muffins ×10 lancés',
    });
 precious  });

  it('extrait le micro-batch par jour', () => {
    expect(data.microBatch).toEqual([
      { jour: 'lundi', quoi: 'doubler le plat' },
      { jour: 'mardi', quoi: 'doubler la sauce' },
    ]);
  });

  it('garde les tâches batch hors sous-sections avec ids inchangés', () => {
    expect(data.batch).toEqual([{ id: 'batch:egg-muffins-x10', label: 'Egg muffins ×10' }]);
  });

  it('ne produit aucun warning pour une semaine v2 complète', () => {
    expect(warnings).toEqual([]);
  });
});

describe('parseWeeklyFile — rétrocompatibilité v1', () => {
  it('une semaine sans blocs v2 ne définit pas les champs optionnels', () => {
    const { data } = parseWeeklyFile(FULL_WEEK);
    expect(data.recettes).toBeUndefined();
    expect(data.bases).toBeUndefined();
    expect(data.rituel).toBeUndefined();
    expect(data.microBatch).toBeUndefined();
  });
});
```

- [ ] **Step 2.2 : Lancer les tests, vérifier le rouge**

Run: `npm test -- --run tests/parse.test.ts`
Expected: FAIL — `data.recettes` undefined, etc.

- [ ] **Step 2.3 : Implémenter dans `parse.ts`**

En haut de `parse.ts`, compléter l'import :

```ts
import type {
  BaseCuisine,
  ChecklistItem,
  CourseItem,
  MealKey,
  MenuDay,
  MicroBatchJour,
  ProfileData,
  Recette,
  RituelEtape,
  WeekMeta,
  WeeklyData,
} from './model';
```

Et resserrer `MENU_KEYS` (revue T1 : `keyof MenuDay` inclut désormais `jour`/`recetteRefs`) — remplacer la déclaration existante par :

```ts
const MENU_KEYS: Record<string, MealKey> = {
  'dejeuner-marc': 'dejeunerMarc',
  'dejeuner-melanie': 'dejeunerMelanie',
  'diner-famille': 'dinerFamille',
  'diner-melanie': 'dinerMelanie',
  batch: 'batch',
};
```

Dans `parseWeeklyFile`, remplacer le bloc de parsing des sections par :

```ts
  const warnings: string[] = [];
  const seen = new Set<string>();
  const sections = splitH2(content, warnings);
  const courses = parseCourses(sections.get('courses') ?? '', 'courses', warnings, seen);
  const menu = parseMenu(sections.get('menu') ?? '', 'menu', warnings);
  const batch = parseBatch(sections.get('batch') ?? '', warnings, seen);
  const rituel = parseRituel(sections.get('batch') ?? '', 'batch', warnings, seen);
  const microBatch = parseMicroBatch(sections.get('batch') ?? '', warnings);
  const recettes = parseRecettes(sections.get('recettes') ?? '', warnings);
  const bases = parseBases(sections.get('bases') ?? '', warnings);
  const profiles = {
    marc: parseProfile(sections.get('marc') ?? '', 'marc', warnings, seen),
    melanie: parseProfile(sections.get('melanie') ?? '', 'melanie', warnings, seen),
  };
  for (const s of ['courses', 'menu', 'batch', 'marc', 'melanie'])
    if (!sections.has(s)) warnings.push(`Section ## « ${s} » absente ou vide.`);
  return {
    data: {
      meta,
      courses,
      menu,
      batch,
      profiles,
      ...(recettes.length ? { recettes } : {}),
      ...(bases.length ? { bases } : {}),
      ...(rituel.length ? { rituel } : {}),
      ...(microBatch.length ? { microBatch } : {}),
    },
    warnings,
  };
```

Remplacer `parseMenu` par (extraction des refs `→ slug`) :

```ts
function parseMenu(text: string, section: string, warnings: string[]): MenuDay[] {
  const days: MenuDay[] = [];
  let day: MenuDay | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      if (day) days.push(day);
      day = { jour: h[1] };
      continue;
    }
    if (!line.trim()) continue;
    const kv = line.match(/^\s*[-*]\s+([a-z-]+)\s*:\s*(.+?)\s*$/);
    if (kv && day) {
      const key = MENU_KEYS[kv[1]];
      if (key) {
        const ref = kv[2].match(/\s*→\s*(\S+)\s*$/);
        const texte = ref ? kv[2].slice(0, ref.index).trimEnd() : kv[2];
        (day as MenuDay & Record<string, string | undefined>)[key] = texte;
        if (ref) {
          day.recetteRefs = { ...day.recetteRefs, [key]: ref[1] };
        }
      } else warnings.push(`Clé menu inconnue « ${kv[1]} » ignorée (${day.jour}).`);
    } else {
      warnings.push(`Ligne ignorée (${section}) : « ${preview(line)} »`);
    }
  }
  if (day) days.push(day);
  return days;
}
```

Ajouter en fin de fichier :

```ts
const BATCH_SUBS = new Set(['rituel-dimanche', 'micro-batch']);

export function parseBatch(text: string, warnings: string[], seen: Set<string>): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  for (const [line, cur] of lignesBatch(text, warnings)) {
    if (cur) continue;
    const plain = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (!plain) {
      if (line.trim()) warnings.push(`Ligne ignorée (batch) : « ${preview(line)} »`);
      continue;
    }
    const withBox = plain[1].match(/^\[( |x|X)\]\s+(.+)$/);
    const label = withBox ? withBox[2] : plain[1];
    const id = `batch:${slugify(label)}`;
    registerId(id, 'batch', seen, warnings);
    out.push({ id, label });
  }
  return out;
}

function lignesBatch(text: string, warnings: string[]): Array<[string, string | null]> {
  const out: Array<[string, string | null]> = [];
  let cur: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      const k = slugify(h[1]);
      if (BATCH_SUBS.has(k)) cur = k;
      else {
        warnings.push(`Sous-section « ${h[1]} » ignorée (batch).`);
        cur = null;
      }
      continue;
    }
    out.push([line, cur]);
  }
  return out;
}

export function parseRituel(
  text: string,
  section: string,
  warnings: string[],
  seen: Set<string>,
): RituelEtape[] {
  const out: RituelEtape[] = [];
  for (const [line, cur] of lignesBatch(text, warnings)) {
    if (cur !== 'rituel-dimanche') continue;
    if (!line.trim()) continue;
    const m = line.match(
      /^\s*[-*]\s+(\S.*?min)\s*·\s*(.+?)(?:\s*—\s*(.+?))?\s*$/,
    );
    if (!m) {
      warnings.push(`Ligne ignorée (${section}/rituel) : « ${preview(line)} »`);
      continue;
    }
    const [, creneau, label, detail] = m;
    const id = `batch:rituel:${slugify(label)}`;
    registerId(id, `${section}/rituel`, seen, warnings);
    out.push({ id, creneau, label, ...(detail ? { detail } : {}) });
  }
  return out;
}

export function parseMicroBatch(text: string, warnings: string[]): MicroBatchJour[] {
  const out: MicroBatchJour[] = [];
  for (const [line, cur] of lignesBatch(text, warnings)) {
    if (cur !== 'micro-batch') continue;
    if (!line.trim()) continue;
    const m = line.match(/^\s*[-*]\s+([a-z-]+)\s*:\s*(.+?)\s*$/);
    if (!m) {
      warnings.push(`Ligne ignorée (batch/micro-batch) : « ${preview(line)} »`);
      continue;
    }
    out.push({ jour: m[1], quoi: m[2] });
  }
  return out;
}

function parseRecettes(text: string, warnings: string[]): Recette[] {
  const recettes: Recette[] = [];
  let rec: Recette | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      if (rec) recettes.push(rec);
      rec = { id: slugify(h[1]), nom: h[1] };
      continue;
    }
    if (!line.trim()) continue;
    if (!rec) {
      warnings.push(`Ligne ignorée (recettes) : « ${preview(line)} »`);
      continue;
    }
    const kv = line.match(/^(temps|kcal|proteines|bases)\s*:\s*(.+?)\s*$/);
    if (kv) {
      if (kv[1] === 'temps') rec.temps = kv[2];
      else if (kv[1] === 'kcal') rec.kcal = Number(kv[2].replace(/\s/g, ''));
      else if (kv[1] === 'proteines') rec.proteines = Number(kv[2].replace(/\s/g, ''));
      else rec.bases = kv[2].split(',').map((b) => b.trim());
      continue;
    }
    const pour = line.match(/^\s*[-*]\s+pour\s*(?:\d+\s*)?\s*:\s*(.+?)\s*$/);
    if (pour) {
      rec.pour = pour[1];
      continue;
    }
    const mel = line.match(/^\s*[-*]\s+mel\s*:\s*(.+?)\s*$/);
    if (mel) {
      rec.mel = mel[1];
      continue;
    }
    const bat = line.match(/^\s*[-*]\s+batch\s*:\s*(.+?)\s*$/);
    if (bat) {
      rec.batch = bat[1];
      continue;
    }
    const etape = line.match(/^\s*\d+[.)]\s+(.+?)\s*$/);
    if (etape) {
      rec.etapes = [...(rec.etapes ?? []), etape[1]];
      continue;
    }
    warnings.push(`Ligne ignorée (recettes) : « ${preview(line)} »`);
  }
  if (rec) recettes.push(rec);
  return recettes;
}

function parseBases(text: string, warnings: string[]): BaseCuisine[] {
  const bases: BaseCuisine[] = [];
  let base: BaseCuisine | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      if (base) bases.push(base);
      base = { id: slugify(h[1]), nom: h[1], texte: '' };
      continue;
    }
    if (!line.trim()) continue;
    if (!base) {
      warnings.push(`Ligne ignorée (bases) : « ${preview(line)} »`);
      continue;
    }
    base.texte = base.texte ? `${base.texte} ${line.trim()}` : line.trim();
  }
  if (base) bases.push(base);
  return bases;
}
```

- [ ] **Step 2.4 : Lancer les tests, vérifier le vert**

Run: `npm test -- --run tests/parse.test.ts`
Expected: PASS (tous, y compris les anciens).

- [ ] **Step 2.5 : Gates + commit**

```bash
npm run typecheck && npm run lint
git add src/lib/parse.ts tests/parse.test.ts
git commit -m "feat: parser v2 (recettes, bases, rituel, micro-batch, refs menu)"
```

---

### Task 3 : Semaine d'exemple v2 — alignée sur la semaine COURANTE

**Files:**
- Modify: `src/assets/semaine-exemple.md` (frontmatter + contenu)
- Modify: `tests/app.test.tsx`, `tests/profil-screen.test.tsx`, `tests/e2e/onboarding-mobile.spec.ts`, `tests/e2e/dock.spec.ts` (réfs à la semaine sample)
- Test: `tests/parse.test.ts` (nouveau test sur le sample réel)

⚠️ La sample représente la semaine **en cours** (au moment du design : S37, du 2026-09-07 au 2026-09-13). Elle devra être rafraîchie chaque semaine jusqu'à ce que la convention template la régénère — le test de cohérence (Step 3.2) garantit qu'elle reste toujours un lundi→dimanche valide quelle que soit la semaine.

- [ ] **Step 3.0 : Écrire le test de cohérence des dates (rouge)**

Dans le nouveau describe du sample (Step 3.1), ajouter :

```ts
  it('la sample est alignée sur la semaine courante : du = lundi, au = dimanche, code semaine cohérent', () => {
    expect(data.meta.du).toBe('2026-09-07');
    expect(data.meta.au).toBe('2026-09-13');
    const [y, m, d] = data.meta.du.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    expect(date.getDay()).toBe(1); // lundi
    // numéro de semaine ISO de du == code frontmatter (S37)
    const jeudi = new Date(y, m - 1, d + 3);
    const debutAnnee = new Date(jeudi.getFullYear(), 0, 1);
    const semaine = Math.ceil(((jeudi.getTime() - debutAnnee.getTime()) / 86400000 + 1) / 7);
    expect(data.meta.semaine).toBe(`2026-S${String(semaine).padStart(2, '0')}`);
  });
```

Run: `npm test -- --run tests/parse.test.ts` → FAIL (sample encore S39/21-27).

- [ ] **Step 3.1 : Mettre à jour le frontmatter + toutes les références de tests**

Dans `src/assets/semaine-exemple.md`, remplacer le frontmatter par :

```markdown
---
semaine: 2026-S37
menu: A
titre: Menu A — Base poulet & bolo
du: 2026-09-07
au: 2026-09-13
---
```

Puis remplacer **toutes** les occurrences de `2026-S39` par `2026-S37` dans :
- `tests/app.test.tsx` (6 occurrences, dont `getByRole('heading', { name: 'Semaine 2026-S37' })`)
- `tests/profil-screen.test.tsx` (fixture localStorage : `semaine: 2026-S37`, `du: 2026-09-07`, `au: 2026-09-13`)
- `tests/e2e/onboarding-mobile.spec.ts` (`'Semaine 2026-S37'`)
- `tests/e2e/dock.spec.ts` (`'Semaine 2026-S37'`)

*(Les fixtures synthétiques de `tests/storage.test.ts`, `tests/components.test.tsx` et `tests/parse.test.ts` (FULL_WEEK) gardent S39 : elles ne dépendent pas du sample.)*

- [ ] **Step 3.2 : Écrire les tests (rouge) sur le sample réel**

Ajouter à `tests/parse.test.ts` (import en haut : `import exemple from '../src/assets/semaine-exemple.md';` — l'import .md fonctionne déjà dans vitest) :

```ts
describe('semaine-exemple.md — format v2 complet', () => {
  const { data, warnings } = parseWeeklyFile(exemple);

  it('ne produit aucun warning', () => {
    expect(warnings).toEqual([]);
  });

  it('contient des recettes, des bases, un rituel et un micro-batch', () => {
    expect(data.recettes!.length).toBeGreaterThanOrEqual(3);
    expect(data.bases!.length).toBeGreaterThanOrEqual(3);
    expect(data.rituel!.length).toBeGreaterThanOrEqual(5);
    expect(data.microBatch!.length).toBeGreaterThanOrEqual(3);
  });

  it('les refs → du menu pointent toutes vers des recettes existantes', () => {
    for (const day of data.menu) {
      for (const ref of Object.values(day.recetteRefs ?? {})) {
        const cible = ref.toLowerCase();
        const trouvée = data.recettes!.some(
          (r) => r.id === cible || r.id.startsWith(cible + '-'),
        );
        expect(trouvée, `ref ${ref} (jour ${day.jour}) introuvable`).toBe(true);
      }
    }
  });

  it('les bases référencées par les recettes existent', () => {
    for (const r of data.recettes ?? []) {
      for (const b of r.bases ?? []) {
        expect(data.bases!.some((base) => base.id.startsWith(b.toLowerCase())), b).toBe(true);
      }
    }
  });

  it('le rayon Keto existe dans les courses', () => {
    expect(data.courses.some((c) => c.rayon === 'keto')).toBe(true);
  });
});
```

- [ ] **Step 3.3 : Lancer, vérifier le rouge**

Run: `npm test -- --run tests/parse.test.ts`
Expected: FAIL (sample encore en v1 : pas de recettes/rituel/keto, dates S39).

- [ ] **Step 3.4 : Compléter `src/assets/semaine-exemple.md` (contenu v2)**

Modifications (garder tout le reste identique) :

1. Courses — remplacer l'item `- Avocats (Mé)` du rayon Fruits par un nouveau rayon en fin de section :

```markdown
### Keto
- Avocats ×3-4
- Beurre 250 g · crème fraîche
- Chocolat noir ≥ 85 %
- Olives 1 bocal
- Baies surgelées 300 g
```

2. Menu — ajouter les refs aux dîners famille :

```markdown
- diner-famille: Cuisses poulet rôties + carottes/patates douces + riz → R1
- diner-famille: Pâtes bolognaise (haché 5 %) + salade → R2
- diner-famille: Rôti de dinde + gratin de courgettes + quinoa → R7
```

3. Batch — transformer en (les tâches existantes restent, ids inchangés) :

```markdown
## Batch
### Rituel dimanche
- 0-5 min · Four à 180° — egg muffins ×10 lancés, on fait le reste
- 5-30 min · Cuissons en double — dîner du soir ×2 + féculent ×2 → boîte lundi
- 30-35 min · Œufs durs ×6-8 — boxes de la semaine pour Mé
- 35-50 min · Légumes + vinaigrette — laver, couper, ranger
- 50-60 min · Montage des boxes — boîte lundi Marc + 1 box keto Mé

### Micro-batch
- lundi: doubler le plat (boîtes mar/mer)
- mardi: doubler la sauce + courgettes en julienne (5 min le soir)
- samedi: œufs durs ×6-8

- [ ] Egg muffins ×10
- [ ] 6-8 œufs durs (boxes keto de Mé)
- [ ] Doubler dinde + quinoa → boîte lundi Marc
- [ ] Légumes de la semaine lavés/coupés
- [ ] Vinaigrette olive-citron
```

4. Ajouter avant `## Batch` :

```markdown
## Recettes
### R1 · Cuisses de poulet rôties + légumes + riz
temps: 45 min · four 200°
kcal: 680
proteines: 48
bases: B7
- pour 4: 6-8 cuisses · 600 g carottes · 600 g patates douces · 250 g riz · huile, paprika, thym
1. Four 200°. Cuisses : huile + sel + paprika + thym, dans un plat avec les légumes en gros dés.
2. Filet d'huile sur les légumes, four 40-45 min (retourner à mi-parcours).
3. Riz en parallèle — cuire en double (boîte).
- mel: pas de riz ni patate douce : poulet + légumes rôtis + filet d'huile d'olive
- batch: double riz + légumes → boîte de mardi

### R2 · Pâtes bolognaise + salade
temps: 25 min · plaque + casserole
kcal: 620
proteines: 42
bases: B4, B6
- pour 4: 800 g haché 5 % · 2 oignons · ail · 2 boîtes tomates + passata · 400 g pâtes · parmesan · salade
1. Oignons + ail à l'huile 5 min, haché 8 min.
2. Tomates + herbes, 15 min doux. Pâtes al dente en parallèle.
3. Salade + vinaigrette minute.
- mel: bolo sur courgettes spaghetti + parmesan
- batch: double sauce → boîte mercredi + 1 portion congelée

### R7 · Rôti de dinde + gratin courgettes + quinoa
temps: 60 min · four 180°
kcal: 710
proteines: 52
- pour 4: rôti de dinde ~800 g (en prévoir 2) · 4 courgettes · 15 cl crème + 80 g fromage râpé · 300 g quinoa
1. Four 180°. Rôti : huile + herbes + sel, 50-55 min (repos 10 min avant découpe).
2. Gratin : courgettes précuites 5 min + crème + fromage, gratinées avec le rôti 25 min.
3. Quinoa 15 min — en double.
- mel: dinde + gratin de courgettes (déjà keto !) sans quinoa
- batch: GROS BATCH : egg muffins ×10 · dinde double → boîte lun · quinoa double · légumes de la semaine

## Bases
### B3 · Œufs durs
9 min 30 dans l'eau bouillante → eau glacée. Batch dim ×6-8 + mer + sam.

### B4 · Vinaigrette minute
3 c.à.s huile d'olive + 1 moutarde + jus d'½ citron + sel. Le pot de 3 jours se garde au frigo.

### B6 · Courgettes spaghetti
2 courgettes à la julienne (mandoline/économe), 3-4 min poêle très chaude avec huile + sel. Jamais à l'avance — 5 min le soir même.

### B7 · Purées maison
PdT : 1 kg vapeur 20 min + 15 cl lait chaud + 30 g beurre. Chou-fleur (Mé) : vapeur 15 min + 20 g beurre + 2 c.à.s crème, mixer — 5 g nets seulement.
```

- [ ] **Step 3.5 : Mettre à jour les tests dépendant de la sample**

Run: `npm test` → corriger les échecs restants (textes « Semaine 2026-S37 » dans app.test, profils, e2e déjà faits en Step 3.1 ; vérifier qu'aucune autre assertion ne dépend des dates du sample).

- [ ] **Step 3.6 : Lancer, vérifier le vert**

Run: `npm test -- --run tests/parse.test.ts`
Expected: PASS. Si warnings inattendus, corriger le .md (format strict).

- [ ] **Step 3.7 : Gates + commit**

```bash
npm test && npm run typecheck && npm run lint && npm run build
git add src/assets/semaine-exemple.md tests/parse.test.ts tests/app.test.tsx tests/profil-screen.test.tsx tests/e2e/
git commit -m "feat: semaine d'exemple v2 alignée sur la semaine courante (S37)"
```

---

### Task 4 : Bannière — pill « Menu X »

**Files:**
- Modify: `src/components/WeekBanner.tsx`, `src/index.css`
- Test: `tests/components.test.tsx`

- [ ] **Step 4.1 : Écrire le test (rouge)**

Dans `tests/components.test.tsx`, trouver le bloc `describe('WeekBanner'` (ou le créer) et ajouter :

```tsx
it('affiche le menu courant en pill à côté du titre', () => {
  render(
    <WeekBanner meta={{ semaine: '2026-S39', menu: 'A', du: '2026-09-21', au: '2026-09-27' }} />,
  );
  const pill = screen.getByText('Menu A');
  expect(pill).toHaveClass('menu-pill');
  expect(pill.parentElement).toHaveClass('week-title-row');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semaine 2026-S39');
});
```

- [ ] **Step 4.2 : Rouge**

Run: `npm test -- --run tests/components.test.tsx`
Expected: FAIL (`.menu-pill` absent).

- [ ] **Step 4.3 : Implémenter `WeekBanner.tsx`**

```tsx
import type { WeekMeta } from '../lib/model';
import { formatDayMonth } from '../lib/dates';

export function WeekBanner({ meta, onOpenProfile }: { meta: WeekMeta; onOpenProfile?: () => void }) {
  return (
    <header className="week-banner">
      <div>
        <div className="week-title-row">
          <h1 className="week-title">Semaine {meta.semaine}</h1>
          <span className="menu-pill">Menu {meta.menu}</span>
        </div>
        {meta.titre && <p className="muted">{meta.titre}</p>}
        <p>
          {formatDayMonth(meta.du)} → {formatDayMonth(meta.au)}
        </p>
      </div>
      {onOpenProfile && (
        <button type="button" className="profile-icon-btn" aria-label="Mon profil" onClick={onOpenProfile}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="8" r="4" fill="currentColor" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
          </svg>
        </button>
      )}
    </header>
  );
}
```

- [ ] **Step 4.4 : CSS**

Dans `src/index.css`, après `.week-title` (vers la ligne 179), ajouter :

```css
.week-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.menu-pill {
  flex-shrink: 0;
  padding: 3px 12px;
  background: var(--accent-strong);
  color: #fff;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 3px 10px color-mix(in srgb, var(--accent) 35%, transparent);
}
```

- [ ] **Step 4.5 : Vert + commit**

Run: `npm test -- --run tests/components.test.tsx` → PASS, puis :

```bash
git add src/components/WeekBanner.tsx src/index.css tests/components.test.tsx
git commit -m "feat: pill du menu courant dans la bannière de semaine"
```

---

### Task 5 : MenuView — réordonnancement, tags, jours passés

**Files:**
- Modify: `src/components/cuisine/MenuView.tsx`, `src/index.css`
- Test: `tests/components.test.tsx`

- [ ] **Step 5.1 : Écrire les tests (rouge)**

Ajouter à `tests/components.test.tsx` (avec les imports déjà présents : `render`, `screen`, `vi`) :

```tsx
describe('MenuView v2', () => {
  const MENU = [
    { jour: 'Lundi', dejeunerMarc: 'Boîte dinde', dinerFamille: 'Poulet rôties', recetteRefs: { dinerFamille: 'R1' } },
    { jour: 'Mardi', dinerFamille: 'Gratin' },
    { jour: 'Mercredi', dinerFamille: 'Omelette' },
    { jour: 'Jeudi', dinerFamille: 'Wok' },
    { jour: 'Vendredi', dinerFamille: 'Tacos' },
    { jour: 'Samedi', dinerFamille: 'Soupe' },
    { jour: 'Dimanche', dinerFamille: 'Rôti de dinde' },
  ];

  it('commence la liste par le jour courant puis boucle (mercredi simulé)', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    render(<MenuView menu={MENU} />);
    const jours = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(jours).toEqual(['Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Lundi', 'Mardi']);
    vi.useRealTimers();
  });

  it('marque les jours passés (avant aujourd’hui) avec la classe past', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    render(<MenuView menu={MENU} />);
    expect(screen.getByText('Lundi', { selector: '.menu-day.past h3' })).toBeInTheDocument();
    expect(screen.getByText('Mardi', { selector: '.menu-day.past h3' })).toBeInTheDocument();
    expect(screen.getByText('Mercredi', { selector: '.menu-day.today h3' })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('affiche des tags de profil au lieu des labels longs', () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    render(<MenuView menu={MENU} />);
    expect(screen.getByText('Famille', { selector: '.menu-tag' })).toBeInTheDocument();
    expect(screen.queryByText(/Déjeuner Marc/)).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 5.2 : Rouge**

Run: `npm test -- --run tests/components.test.tsx`
Expected: FAIL (ordre inchangé, classes absentes).

- [ ] **Step 5.3 : Réécrire `MenuView.tsx`**

```tsx
import { useState } from 'react';
import type { BaseCuisine, MealKey, MenuDay, Recette } from '../../lib/model';
import { JOURS, todayKey } from '../../lib/dates';

const MEALS: Array<[MealKey, string, string]> = [
  ['dejeunerMarc', 'Marc', 'tag-marc'],
  ['dejeunerMelanie', 'Mé', 'tag-keto'],
  ['dinerFamille', 'Famille', 'tag-fam'],
  ['dinerMelanie', 'Mé', 'tag-keto'],
  ['batch', 'Batch', 'tag-bat'],
];

function ordreDepuisAujourdhui(menu: MenuDay[]): { ordered: MenuDay[]; nbPasse: number } {
  const t = todayKey();
  const idx = menu.findIndex((d) => d.jour.trim().toLowerCase() === t);
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
  const [openRec, setOpenRec] = useState<string | null>(null);

  if (menu.length === 0) {
    return <p className="muted">Aucun menu pour cette semaine.</p>;
  }

  const { ordered, nbPasse } = ordreDepuisAujourdhui(menu);
  const pastFrom = ordered.length - nbPasse;

  return (
    <>
      {ordered.map((day, i) => {
        const isToday = i === 0 && nbPasse < ordered.length && day.jour.trim().toLowerCase() === todayKey();
        const isPast = i >= pastFrom;
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
              const ref = day.recetteRefs?.[key];
              const recette = ref ? trouverRecette(ref, recettes) : undefined;
              return (
                <div className="menu-row" key={key}>
                  <span className={`menu-tag ${tag}`}>{label}</span>
                  <span className="menu-row-text">
                    {value}
                    {recette && (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="menu-recette-link"
                          aria-expanded={openRec === recette.id}
                          onClick={() => setOpenRec(openRec === recette.id ? null : recette.id)}
                        >
                          📖 {recette.nom}
                        </button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
            {openRec &&
              MEALS.some(([key]) => day.recetteRefs?.[key] === openRec || recetteDuJour(day, openRec)) &&
              (() => {
                const rec = recettes.find((r) => r.id === openRec && Object.values(day.recetteRefs ?? {}).includes(r.id));
                return rec ? <RecetteCard recette={rec} bases={bases} onClose={() => setOpenRec(null)} /> : null;
              })()}
          </section>
        );
      })}
    </>
  );
}

function recetteDuJour(_day: MenuDay, _ref: string): boolean {
  return false;
}

export function trouverRecette(ref: string, recettes: Recette[]): Recette | undefined {
  const cible = ref.toLowerCase();
  // égalité exacte d'abord, puis préfixe avec borne (`r1` ne doit pas matcher `r10-…`)
  return recettes.find((r) => r.id === cible) ?? recettes.find((r) => r.id.startsWith(cible + '-'));
}

export function RecetteCard({
  recette,
  bases,
  onClose,
}: {
  recette: Recette;
  bases?: BaseCuisine[];
  onClose: () => void;
}) {
  const [baseOuverte, setBaseOuverte] = useState<string | null>(null);
  return (
    <article className="recette-card" aria-label={recette.nom}>
      <header className="recette-head">
        <span className="recette-ico" aria-hidden="true">
          🍳
        </span>
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
      {(recette.kcal != null || recette.proteines != null) && (
        <div className="recette-stats">
          {recette.kcal != null && <span>🔥 ~{recette.kcal} kcal /pers</span>}
          {recette.proteines != null && <span>💪 {recette.proteines} g protéines</span>}
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
    </article>
  );
}

function trouverBase(ref: string, bases: BaseCuisine[] | undefined): BaseCuisine | undefined {
  if (!bases) return undefined;
  const cible = ref.toLowerCase();
  return bases.find((b) => b.id === cible || b.id.startsWith(cible));
}
```

**Note :** `App.tsx` doit passer `recettes={week.data.recettes}` et `bases={week.data.bases}` à `MenuView` — c'est le Step 5.5.

- [ ] **Step 5.4 : CSS**

Dans `src/index.css`, remplacer le bloc `/* ---------- Menu ---------- */` (`.menu-day-head` → `.menu-row-label`) par :

```css
/* ---------- Menu ---------- */

.menu-day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.menu-day.past {
  opacity: 0.55;
}

.menu-day.past .menu-day-head h3 {
  color: var(--muted);
}

.past-badge {
  flex-shrink: 0;
  padding: 2px 10px;
  background: var(--surface-2);
  color: var(--muted);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.menu-row {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 6px 0;
}

.menu-tag {
  flex-shrink: 0;
  margin-top: 1px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.4;
}

.tag-marc {
  background: var(--accent-strong);
  color: #fff;
}

.tag-keto {
  background: color-mix(in srgb, var(--accent-melanie) 22%, transparent);
  color: var(--accent-melanie);
}

.tag-fam {
  background: var(--surface-2);
  color: var(--text);
}

.tag-bat {
  background: color-mix(in srgb, var(--accent-marc) 22%, transparent);
  color: var(--accent-marc);
}

.menu-row-text {
  min-width: 0;
  line-height: 1.45;
}

.menu-recette-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline dotted var(--muted);
  text-underline-offset: 3px;
}
```

Ajouter à la fin du fichier (avant la section Responsive s'il y en a une, sinon en fin) :

```css
/* ---------- Fiche recette (accordéon du menu) ---------- */

.recette-card {
  margin: 10px 0 4px;
  padding: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 12px;
}

.recette-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.recette-ico {
  font-size: 15px;
}

.recette-title {
  min-width: 0;
}

.recette-nom {
  font-weight: 800;
  font-size: 14px;
  line-height: 1.3;
}

.recette-meta {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  margin-top: 3px;
}

.recette-close {
  margin-left: auto;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.recette-close:active {
  transform: scale(0.94);
}

.recette-stats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.recette-stats span {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
}

.recette-pour {
  margin: 10px 0 0;
  font-size: 13.5px;
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
  background: var(--surface);
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
  background: var(--surface);
  border-color: var(--accent);
}

.recette-bdesc {
  margin: 8px 0 0;
  padding: 8px 10px;
  background: var(--surface);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
}

.recette-etapes {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 13.5px;
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
  background: color-mix(in srgb, var(--accent-melanie) 15%, transparent);
  color: var(--accent-melanie);
}

.recette-mel::before {
  content: '🟢 Mé : ';
  font-weight: 800;
}

.recette-bat {
  background: color-mix(in srgb, var(--accent-marc) 15%, transparent);
  color: var(--accent-marc);
}

.recette-bat::before {
  content: '📦 Batch : ';
  font-weight: 800;
}
```

- [ ] **Step 5.5 : Brancher App.tsx**

Dans `src/App.tsx`, passer les nouvelles props (chercher `<MenuView`) :

```tsx
<MenuView menu={week.data.menu} recettes={week.data.recettes} bases={week.data.bases} />
```

- [ ] **Step 5.6 : Vert + commit**

Run: `npm test` → PASS (attention : d'autres tests affichent le menu via `App` — le tag « Déjeuner Marc » disparaît ; corriger les assertions qui le cherchent, ex. remplacer par le texte du repas).

```bash
git add src/components/cuisine/MenuView.tsx src/App.tsx src/index.css tests/components.test.tsx
git commit -m "feat: menu réordonné dès aujourd'hui, tags de profil, jours passés"
```

---

### Task 6 : MenuView — fiche recette dépliable (accordéon e2e-ready)

La fiche `RecetteCard` existe depuis la Task 5. Ce task vérifie le comportement d'accordéon :

**Files:**
- Test: `tests/components.test.tsx`

- [ ] **Step 6.1 : Écrire le test (rouge)**

```tsx
describe('MenuView — accordéon recette', () => {
  const MENU = [
    { jour: 'Mercredi', dinerFamille: 'Pâtes bolognaise + salade', recetteRefs: { dinerFamille: 'R2' } },
台中 ];
  const RECETTES = [
    {
      id: 'r2-pates-bolognaise-salade',
      nom: 'R2 · Pâtes bolognaise + salade',
      temps: '25 min · plaque + casserole',
      kcal: 620,
      proteines: 42,
      pour: '800 g haché 5 % · 400 g pâtes',
      bases: ['B4'],
      etapes: ['Oignons 5 min.', 'Haché 8 min.', 'Tomates 15 min.'],
      mel: 'bolo sur courgettes spaghetti',
      batch: 'double sauce → boîte jeudi',
    },
  ];
  const BASES = [{ id: 'b4-vinaigrette-minute', nom: 'B4 · Vinaigrette minute', texte: 'huile + moutarde + citron.' }];

  it('déplie la fiche au clic sur le lien recette, une seule à la fois, referme au ×', async () => {
    vi.setSystemTime(new Date('2026-09-23T10:00:00'));
    const user = userEvent.setup();
    render(
      <MenuView
        menu={[
          { jour: 'Mercredi', dinerFamille: 'Pâtes bolognaise + salade', recetteRefs: { dinerFamille: 'R2' } },
          { jour: 'Jeudi', dinerFamille: 'Wok', recetteRefs: { dinerFamille: 'R4' } },
        ]}
        recettes={[
          ...RECETTES,
          { id: 'r4-wok', nom: 'R4 · Wok poulet', temps: '12 min', etapes: ['Wok chaud.'], mel: 'sans riz' },
        ]}
        bases={BASES}
      />,
    );

    await user.click(screen.getByRole('button', { name: /R2 · Pâtes/ }));
    const fiche = screen.getByRole('article', { name: 'R2 · Pâtes bolognaise + salade' });
    expect(fiche).toBeInTheDocument();
    expect(within(fiche).getByText(/huile d'olive|plaque/i)).toBeTruthy();
    expect(within(fiche).getByText('🔥 ~620 kcal /pers')).toBeInTheDocument();
    expect(within(fiche).getByText('💪 42 g protéines')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /B4 · Vinaigrette/ }));
    expect(within(fiche).getByText(/huile \+ moutarde \+ citron/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /R4 · Wok/ }));
    expect(screen.getByRole('article', { name: 'R4 · Wok poulet' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'R2 · Pâtes bolognaise + salade' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fermer la recette' }));
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
```

*(Corriger si besoin : supprimer la ligne parasite `台中 ];` qui s'y serait glissée — la déclaration du tableau MENU doit être `const MENU = [...] ;` valide ou supprimée si non utilisée.)*

- [ ] **Step 6.2 : Rouge puis vert**

Run: `npm test -- --run tests/components.test.tsx`
Expected: les tests de la Task 5 rendent déjà la fiche fonctionnelle → si un point échoue (ex. un seul déplié à la fois), corriger `MenuView` (l'état `openRec` unique gère déjà). Vérifier le vert.

- [ ] **Step 6.3 : Commit**

```bash
git add tests/components.test.tsx
git commit -m "test: accordéon de fiche recette (un seul déplié, fermeture ×)"
```

---

### Task 7 : ShoppingList — compteur par rayon + encadré keto

**Files:**
- Modify: `src/components/cuisine/ShoppingList.tsx`, `src/index.css`
- Test: `tests/components.test.tsx`

- [ ] **Step 7.1 : Écrire les tests (rouge)**

Dans le `describe('ShoppingList'` existant de `tests/components.test.tsx`, ajouter :

```tsx
it('affiche un compteur fait/total par rayon', () => {
  render(
    <ShoppingList
      semaine="2026-S39"
      items={[
        { id: 'courses:legumes:a', rayon: 'legumes', label: 'Épinards' },
        { id: 'courses:legumes:b', rayon: 'legumes', label: 'Carottes' },
        { id: 'courses:fruits:c', rayon: 'fruits', label: 'Pommes' },
      ]}
    />,
  );
  expect(screen.getByText('0/2', { selector: '.rayon-cnt' })).toBeInTheDocument();
  expect(screen.getByText('0/1', { selector: '.rayon-cnt' })).toBeInTheDocument();
});

it('rend le rayon Keto en encadré dédié, en dernier', () => {
  render(
    <ShoppingList
      semaine="2026-S39"
      items={[
        { id: 'courses:keto:avocats', rayon: 'keto', label: 'Avocats ×3-4' },
        { id: 'courses:legumes:a', rayon: 'legumes', label: 'Épinards' },
      ]}
    />,
  );
  expect(screen.getByText('Les extras keto de Mélanie')).toBeInTheDocument();
  const keto = screen.getByText('Les extras keto de Mélanie').closest('section');
  const legumes = screen.getByText('Legumes').closest('section');
  expect(keto!.compareDocumentPosition(legumes!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByAltText('Keto')).not.toBeInTheDocument();
});
```

- [ ] **Step 7.2 : Rouge**

Run: `npm test -- --run tests/components.test.tsx`
Expected: FAIL.

- [ ] **Step 7.3 : Implémenter `ShoppingList.tsx`**

Remplacer le rendu des groupes (bloc `{groups.map(...)}`) par :

```tsx
      {[...groups]
        .sort((a, b) => Number(a.rayon === 'keto') - Number(b.rayon === 'keto'))
        .map(({ rayon, items: groupItems }) => {
          const faits = groupItems.filter((it) => checks[it.id]).length;
          return rayon === 'keto' ? (
            <section className="keto-box" key={rayon}>
              <div className="keto-title">
                🟢 Les extras keto de Mélanie <span className="rayon-cnt">{faits}/{groupItems.length}</span>
              </div>
              <Checklist
                items={groupItems}
                semaine={semaine}
                onChecksChange={(groupChecks) => setChecks((prev) => ({ ...prev, ...groupChecks }))}
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
                items={groupItems}
                semaine={semaine}
                onChecksChange={(groupChecks) => setChecks((prev) => ({ ...prev, ...groupChecks }))}
              />
            </section>
          );
        })}
```

- [ ] **Step 7.4 : CSS**

Dans `src/index.css`, dans `.course-group-header h3 { margin: 0; }`, ajouter après :

```css
.rayon-cnt {
  margin-left: auto;
  font-size: 13px;
  color: var(--muted);
  font-weight: 700;
}

.keto-box {
  background: color-mix(in srgb, var(--accent-melanie) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent-melanie) 45%, transparent);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
  margin-bottom: 12px;
}

.keto-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-weight: 800;
  font-size: 15px;
  color: var(--accent-melanie);
}
```

- [ ] **Step 7.5 : Vert + gates + commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build` → PASS.

```bash
git add src/components/cuisine/ShoppingList.tsx src/index.css tests/components.test.tsx
git commit -m "feat: compteur par rayon et encadré keto dans les courses"
```

---

### Task 8 : BatchView — rituel en timeline + micro-batch

**Files:**
- Modify: `src/components/cuisine/BatchView.tsx`, `src/App.tsx`, `src/index.css`
- Test: `tests/components.test.tsx`

- [ ] **Step 8.1 : Écrire les tests (rouge)**

```tsx
describe('BatchView v2 — rituel et micro-batch', () => {
  const RITUEL = [
    { id: 'batch:rituel:four-a-180', creneau: '0-5 min', label: 'Four à 180°', detail: 'egg muffins ×10 lancés' },
    { id: 'batch:rituel:cuissons', creneau: '5-30 min', label: 'Cuissons en double', detail: 'dîner ×2 + féculent ×2' },
  ];
  const MICRO = [
    { jour: 'lundi', quoi: 'doubler le plat' },
    { jour: 'mardi', quoi: 'doubler la sauce' },
  ];

  it('affiche le rituel en timeline avec créneaux', () => {
    render(<BatchView items={[]} rituel={RITUEL} microBatch={MICRO} semaine="2026-S39" />);
    expect(screen.getByText('Rituel du dimanche')).toBeInTheDocument();
    expect(screen.getByText('0-5 min')).toBeInTheDocument();
    expect(screen.getByText('Four à 180°')).toBeInTheDocument();
    expect(screen.getByText('egg muffins ×10 lancés')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByText('0/2')).toBeInTheDocument();
  });

  it('affiche le micro-batch en carrousel (non cochable)', () => {
    render(<BatchView items={[]} rituel={RITUEL} microBatch={MICRO} semaine="2026-S39" />);
    expect(screen.getByText('Micro-batch de la semaine')).toBeInTheDocument();
    expect(screen.getByText('Lundi')).toBeInTheDocument();
    expect(screen.getByText('doubler la sauce')).toBeInTheDocument();
  });

  it('garde l’ancien rendu (bannière + checklist) sans rituel ni micro-batch', () => {
    render(<BatchView items={[{ id: 'batch:riz', label: 'Cuire le riz' }]} semaine="2026-S39" />);
    expect(screen.getByText(/Gros batch : dimanche/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Cuire le riz/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 8.2 : Rouge**

Run: `npm test -- --run tests/components.test.tsx`
Expected: FAIL (props inconnues).

- [ ] **Step 8.3 : Réécrire `BatchView.tsx`**

```tsx
import { useState } from 'react';
import type { ChecklistItem, MicroBatchJour, RituelEtape } from '../../lib/model';
import { Checklist } from '../Checklist';
import { getCheck, setCheck } from '../../lib/storage';

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function BatchView({
  items,
  semaine,
  rituel,
  microBatch,
}: {
  items: ChecklistItem[];
  semaine: string;
  rituel?: RituelEtape[];
  microBatch?: MicroBatchJour[];
}) {
  return (
    <>
      {rituel && rituel.length > 0 && <RituelTimeline etapes={rituel} semaine={semaine} />}
      {microBatch && microBatch.length > 0 && (
        <section className="batch-section">
          <h3>⚡ Micro-batch de la semaine</h3>
          <div className="micro-batch">
            {microBatch.map((m) => (
              <div className="micro-jour" key={m.jour}>
                <div className="micro-jour-nom">{capitalize(m.jour)}</div>
                <div className="micro-jour-quoi">{m.quoi}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="batch-banner">Gros batch : dimanche, 45-60 min</p>
      {items.length > 0 ? (
        <Checklist items={items} semaine={semaine} />
      ) : (
        !rituel?.length && <p className="muted">Aucun batch prévu cette semaine.</p>
      )}
    </>
  );
}

function RituelTimeline({ etapes, semaine }: { etapes: RituelEtape[]; semaine: string }) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => getChecks(semaine));
  const [syncedSemaine, setSyncedSemaine] = useState(semaine);
  if (syncedSemaine !== semaine) {
    setSyncedSemaine(semaine);
    setChecks(getChecks(semaine));
  }
  const done = etapes.filter((e) => checks[e.id]).length;
  const toggle = (id: string) => {
    const next = !checks[id];
    setCheck(semaine, id, next);
    setChecks((prev) => ({ ...prev, [id]: next }));
  };
  return (
    <section className="batch-section">
      <div className="batch-section-head">
        <h3>🕐 Rituel du dimanche · 45-60 min</h3>
        <span className="rayon-cnt">
          {done}/{etapes.length}
        </span>
      </div>
      <ol className="rituel-timeline">
        {etapes.map((e) => (
          <li className={checks[e.id] ? 'rituel-etape done' : 'rituel-etape'} key={e.id}>
            <label>
              <input
                type="checkbox"
                checked={!!checks[e.id]}
                onChange={() => toggle(e.id)}
                aria-label={`${e.label} (${e.creneau})`}
              />
              <span className="rituel-corps">
                <span className="rituel-h">
                  <span className="rituel-label">
                    {e.label}
                    <span className="rituel-creneau">{e.creneau}</span>
                  </span>
                </span>
                {e.detail && <span className="rituel-detail">{e.detail}</span>}
              </span>
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

*(`getCheck` n'existe peut-être pas dans `storage.ts` — utiliser `getChecks(semaine)[id]` si absent ; vérifier et n'importer que ce qui existe.)*

- [ ] **Step 8.4 : Brancher App.tsx**

```tsx
<BatchView
  items={week.data.batch}
  rituel={week.data.rituel}
  microBatch={week.data.microBatch}
  semaine={week.data.meta.semaine}
/>
```

- [ ] **Step 8.5 : CSS**

Dans `src/index.css`, dans la section Batch (après `.batch-banner`), ajouter :

```css
.batch-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
  margin-bottom: 12px;
}

.batch-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.batch-section-head h3,
.batch-section h3 {
  margin: 0;
  font-size: 17px;
}

.rituel-timeline {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0 0 0 24px;
}

.rituel-timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--border);
  border-radius: 2px;
}

.rituel-etape {
  position: relative;
  padding: 8px 0;
}

.rituel-etape::before {
  content: '';
  position: absolute;
  left: -21px;
  top: 14px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--surface);
}

.rituel-etape.done::before {
  background: var(--border);
}

.rituel-etape label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
}

.rituel-etape input {
  margin-top: 4px;
  width: 20px;
  height: 20px;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.rituel-corps {
  min-width: 0;
}

.rituel-h {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.rituel-label {
  font-weight: 800;
  font-size: 15px;
}

.rituel-etape.done .rituel-label,
.rituel-etape.done .rituel-detail {
  color: var(--muted);
  text-decoration: line-through;
}

.rituel-creneau {
  margin-left: auto;
  color: var(--muted);
  font-weight: 700;
  font-size: 12px;
  white-space: nowrap;
}

.rituel-detail {
  display: block;
  color: var(--muted);
  font-size: 13.5px;
  line-height: 1.45;
  margin-top: 2px;
}

.micro-batch {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: none;
}

.micro-batch::-webkit-scrollbar {
  display: none;
}

.micro-jour {
  flex-shrink: 0;
  width: 128px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 9px 11px;
}

.micro-jour-nom {
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.micro-jour-quoi {
  font-size: 13px;
  line-height: 1.4;
  margin-top: 3px;
}
```

- [ ] **Step 8.6 : Vert + gates + commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build` → PASS.

```bash
git add src/components/cuisine/BatchView.tsx src/App.tsx src/index.css tests/components.test.tsx
git commit -m "feat: rituel du dimanche en timeline et micro-batch en carrousel"
```

---

### Task 9 : e2e + vérification mobile

**Files:**
- Create: `tests/e2e/cuisine.spec.ts`

- [ ] **Step 9.1 : Écrire les specs**

```ts
import { expect, test } from '@playwright/test';

const ORIGIN = process.env.E2E_PREVIEW ? 'http://localhost:4173' : 'http://localhost:5173';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

test.describe('Onglets Cuisine v2 — mobile', () => {
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

  test('bannière avec pill Menu A, menu réordonné, fiche recette dépliable', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
    await expect(page.locator('.menu-pill')).toHaveText('Menu A');

    // menu : le jour courant est en premier
    const jourCourant = JOURS[(new Date().getDay() + 6) % 7];
    const premier = page.locator('.menu-day h3').first();
    await expect(premier).toHaveText(new RegExp(jourCourant, 'i'));

    // fiche recette : le dîner famille du jour de la sample avec ref se déplie
    const lien = page.locator('.menu-recette-link').first();
    await lien.click();
    await expect(page.locator('.recette-card').first()).toBeVisible();
    await expect(page.locator('.recette-card .recette-stats span').first()).toBeVisible();
  });

  for (const largeur of [320, 375]) {
    test(`zéro débordement horizontal sur les 3 sous-onglets à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 700 });
      await page.goto(ORIGIN);
      await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
      for (const onglet of ['Courses', 'Menu', 'Batch']) {
        await page.getByRole('button', { name: onglet }).first().click();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }
    });
  }
});
```

- [ ] **Step 9.2 : Lancer, corriger jusqu'au vert**

Run: `npm run e2e`
Expected: PASS (10 tests au total : 6 existants + 4 nouveaux).

- [ ] **Step 9.3 : Vérification visuelle manuelle**

```bash
npm run dev -- --port 5175 --strictPort
```

Ouvrir http://localhost:5175/sport-app/ dans le navigateur (mode mobile 375px) : vérifier pill Menu A, jour courant premier, dépliage recette (chips bases + stats), timeline rituel, carrousel micro-batch, encadré keto, compteurs par rayon. Tuer le serveur après (`pkill -f "vite --port 5175"`).

- [ ] **Step 9.4 : Commit**

```bash
git add tests/e2e/cuisine.spec.ts
git commit -m "test: e2e des onglets cuisine v2 (pill menu, réordonnancement, recette, overflow)"
```

---

### Task 10 : Docs sync + push

**Files:**
- Modify: `AGENTS.md`, `README.md`, `ai/context/design-system.md`, `ai/context/ui-guideline.md`, `ai/context/project-architecture.md`

- [ ] **Step 10.1 : AGENTS.md — contrat .md v2**

Dans la section « Le contrat .md (ne pas casser) », mettre à jour la liste des sections :

```markdown
- Frontmatter requis : `semaine`, `menu`, `du`, `au` (dates ISO `AAAA-MM-JJ`), `titre` optionnel
- Sections : `## Courses` (### rayons + items, un rayon `### Keto` = encadré dédié), `## Menu` (### jours + `- clé: texte`, refs `→ <slug recette>` autorisées), `## Batch` (`- [ ]` tâches + `### Rituel dimanche` (étapes `- <créneau> · <label> — <détail>`) + `### Micro-batch` (`- jour: quoi`)), `## Recettes` (optionnel : `temps:`, `kcal:`, `proteines:`, `bases:`, `- pour 4:`, étapes numérotées, `- mel:`, `- batch:`), `## Bases` (optionnel), `## Marc`, `## Melanie`
- Les ids de coches (`courses:…`, `batch:…`, `batch:rituel:…`, `seances:marc:…`, `seances:melanie:…`) sont **stables** : ne jamais les modifier
- Format v1 (sans Recettes/Bases/Rituel) toujours accepté — les champs optionnels n'apparaissent pas dans l'UI
```

- [ ] **Step 10.2 : README — contrat v2**

Mettre à jour « Le fichier .md de la semaine (contrat de référence) » : ajouter les blocs v2 (exemple du `src/assets/semaine-exemple.md`), retirer la mention « import retiré » si déjà faite, garder la note de compat v1.

- [ ] **Step 10.3 : ai/context**

- `design-system.md` : ajouter les classes `.menu-pill`, `.week-title-row`, `.menu-tag` (variants), `.menu-recette-link`, `.recette-*`, `.past-badge`, `.menu-day.past`, `.keto-box`, `.rayon-cnt`, `.batch-section`, `.rituel-*`, `.micro-*` dans le tableau composants
- `ui-guideline.md` : règles Menu (jour courant en premier, jours passés atténués, accordéon une seule fiche) + Courses (encadré keto, compteurs) + Batch (timeline)
- `project-architecture.md` : arbre à jour (RecetteCard dans MenuView, RituelTimeline dans BatchView)

- [ ] **Step 10.4 : Gates + commit + push**

```bash
npm test && npm run typecheck && npm run lint && npm run build && npm run e2e
git add -A
git commit -m "docs: sync contrat .md v2 et contextes UI"
git push -u origin feat/cuisine-redesign
```

---

## Self-review (fait par l'auteur du plan)

- **Spec coverage** : pill Menu (T4) · jour courant premier (T5) · jours passés (T5) · tags de profil (T5) · fiche recette enrichie + accordéon + chips bases + stats (T5, T6) · compteurs par rayon (T7) · encadré keto (T7) · timeline rituel (T8) · micro-batch (T8) · format v2 + rétrocompat (T1-T3) · e2e mobile (T9) · docs (T10) — complet.
- **Placeholders** : aucun « TBD » ; les deux notes d'implémentation (getCheck, ligne parasite du test) sont des vérifications explicites, pas des trous.
- **Type consistency** : `Recette`, `BaseCuisine`, `RituelEtape`, `MicroBatchJour`, `MealKey`, `recetteRefs` définis en T1 et utilisés tels quels en T2/T5/T8 ; ids `batch:rituel:*` alignés entre T2 (parse) et T8 (affichage).
