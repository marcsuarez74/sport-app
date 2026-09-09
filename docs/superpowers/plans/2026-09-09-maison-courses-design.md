# Plan — Maison & courses (chantier 3, axe 2) — implémentation TDD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Magasin, budget (estimé menu / payé réel / max hebdo), dépenses réelles (historique + comparatif par magasin), préférences de plats, personnes/repas par jour — collectés à l'onboarding (5e étape), éditables au Profil, affichés dans l'onglet Courses.

**Architecture:** Approche A — `UserProfile` v2 **étendu** de 5 champs optionnels (même clé `sportapp:profile`, garde par champ) + nouvelle clé `sportapp:depenses` (tableau brut `DepenseEntry[]`, convention `sportapp:weights:*`). Deux nouveaux composants dans `src/components/cuisine/CoursesBudget.tsx` (carte budget + panneau dépenses, état d'ouverture porté par `CuisineView`). Zéro changement du contrat .md (`data.budget` vient du chantier Herbes).

**Tech Stack:** React 18 + TypeScript strict + CSS sémantique (tokens Herbes), vitest + Testing Library (happy-dom), Playwright (WebKit, 375/320).

**Spec :** `docs/superpowers/specs/2026-09-09-maison-courses-design.md` · **Maquette (fait foi) :** `docs/superpowers/mockups/maison-courses-v2.html`

---

## ⚠️ Prérequis stricts

Ce plan **réutilise le code produit par les chantiers 1 et 2**. Vérifier avant de commencer :

- `src/components/Icon.tsx` existe (chantier 1) avec les icônes `cart`, `target`, `check`, `chev-left`, `chev-right`, `plus` (le `plus` a été ajouté par le chantier 2).
- `WeeklyData.budget?: string` existe (chantier 1, ligne `- budget:` des `## Courses`).
- `src/lib/model.ts` est en v2 : `UserProfile { id, dateNaissance, taille, poidsObjectif?, objectif, complements, regime }`, `Objectif`, `Regime`, `OBJECTIF_TYPES`, `REGIMES`, `COMPLEMENTS_PRESETS`, `normaliseComplement`.
- `src/components/onboarding/Onboarding.tsx` est le code final du plan chantier 2 (Task 4, lignes 1040-1438 du plan) : 4 étapes, `prefill`, dots ×4.
- `src/components/ProfilScreen.tsx` est le code final du plan chantier 2 (Task 6, lignes 2281-2581) : sections Mes infos / Objectif / Compléments / Régime / Semaine / Compte, `type Section`, helper `maj(section, patch)`.
- Les tests `tests/app.test.tsx` contiennent les describes `Onboarding — étape 1..4` et `Onboarding — migration` (plan chantier 2), avec les helpers `allerEtape2/3/4`, `remplirEtape2`, `soumettre`.
- Les storageState e2e (`tests/e2e/cuisine.spec.ts`, `dock.spec.ts`, `import-navigation.spec.ts`) posent le profil en forme v2 (plan chantier 2 Task 8).

Si un de ces points manque → **stop**, exécuter les chantiers 1-2 d'abord.

## Conventions du plan

- Boucle TDD : test (rouge) → run → implémentation (vert) → run → commit. `npm run test:watch` pour boucler.
- Commandes : `npx vitest run tests/<fichier>` pour cibler ; `npm test` passe complète.
- Chaque commit : un changement cohérent, message `feat:`/`test:`/`docs:` en français.
- Le localStorage contient des **données réelles** : ne JAMAIS renommer `sportapp:depenses` ni toucher aux clés existantes.
- Textes utilisateur en français. Dates : comparaisons par **chaînes ISO** (jamais `new Date('2026-09-09')` qui parse en UTC) ; « aujourd'hui » = `todayISO()` de `src/lib/dates.ts`.
- Icônes : `<Icon name="cart" size={14} />` (API chantier 1).

---

### Task 1 : Model — profil étendu, `DepenseEntry`, presets

**Files:**
- Modify: `src/lib/model.ts`

- [ ] **Step 1: Étendre `UserProfile`** — dans `src/lib/model.ts`, remplacer l'interface v2 :

```ts
export interface UserProfile {
  id: ProfileKey;
  dateNaissance: string; // AAAA-MM-JJ — l'âge s'affiche calculé (ageDepuis)
  taille: number;
  poidsObjectif?: number;
  objectif: Objectif;
  complements: string[];
  regime: Regime;
}
```

par :

```ts
export interface UserProfile {
  id: ProfileKey;
  dateNaissance: string; // AAAA-MM-JJ — l'âge s'affiche calculé (ageDepuis)
  taille: number;
  poidsObjectif?: number;
  objectif: Objectif;
  complements: string[];
  regime: Regime;
  // v2.1 — Maison & courses : tout optionnel, ignoré champ par champ si illégal (storage)
  magasin?: string; // nom libre, trim (ex. « Lidl »)
  budgetMax?: number; // € / semaine (plafond)
  preferences?: string[]; // types de plats souhaités (presets + libre) — pour le prompt IA
  personnes?: number; // personnes à table (entier ≥ 1)
  repasJour?: number; // repas par jour (entier ≥ 1)
}
```

- [ ] **Step 2: Ajouter `DepenseEntry` et les presets** — à la suite de `UserProfile` (après l'interface), ajouter :

```ts
export interface DepenseEntry {
  date: string; // AAAA-MM-JJ
  magasin: string; // trim, non vide
  total: number; // € positif, 2 décimales max
}

// Suggestions de la saisie magasin (datalist natif) — liste ouverte, la saisie
// libre reste possible (magasin de quartier).
export const MAGASINS_PRESETS: readonly string[] = [
  'Lidl',
  'Carrefour',
  'Auchan',
  'Intermarché',
  'Grand Frais',
  'Leclerc',
  'Aldi',
  'Super U',
  'Monoprix',
  'Casino',
];

// Presets des préférences (types de plats) — onboarding étape 5.
export const PREFERENCES_PRESETS: readonly string[] = [
  'Healthy',
  'Petit budget',
  'Rapide',
  'Batch-friendly',
];
```

- [ ] **Step 3: Vérifier le compile** — `npm run typecheck` : PASS (additif, aucun consommateur cassé).

- [ ] **Step 4: Commit**

```bash
git add src/lib/model.ts
git commit -m "feat: model — profil v2.1 (magasin, budgetMax, preferences, personnes, repasJour) + DepenseEntry + presets"
```

---

### Task 2 : Storage — dépenses + garde profil étendue

**Files:**
- Modify: `src/lib/storage.ts`
- Test: `tests/storage.test.ts`

- [ ] **Step 1: Tests dépenses + profil étendu (rouge)** — dans `tests/storage.test.ts`, ajouter en tête les imports de type :

```ts
import type { DepenseEntry, UserProfile } from '../src/lib/model';
```

puis, à la fin du fichier (avant les describes `dates: todayKey` si préférence pour l'ordre, sinon en fin de fichier) :

```ts
describe('storage: dépenses', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getDepenses retourne [] silencieusement quand la clé est absente (no warn, no remove)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getDepenses()).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('sportapp:depenses')).toBeNull();
    warnSpy.mockRestore();
  });

  it('saveDepense persiste et getDepenses relit', () => {
    saveDepense('2026-09-09', 'Lidl', 38.2);
    expect(getDepenses()).toEqual([{ date: '2026-09-09', magasin: 'Lidl', total: 38.2 }]);
  });

  it('saveDepense upsert : remplace la même paire (date, magasin) — casse du magasin ignorée', () => {
    saveDepense('2026-09-09', 'Lidl', 38.2);
    saveDepense('2026-09-09', 'lidl', 41.5);
    expect(getDepenses()).toEqual([{ date: '2026-09-09', magasin: 'Lidl', total: 38.2 }]);
    saveDepense('2026-09-09', 'Lidl', 39.9);
    expect(getDepenses()).toEqual([{ date: '2026-09-09', magasin: 'Lidl', total: 39.9 }]);
  });

  it('deux magasins le même jour = deux entrées, triées par date desc', () => {
    saveDepense('2026-09-02', 'Lidl', 35.1);
    saveDepense('2026-09-09', 'Intermarché', 41.3);
    saveDepense('2026-09-09', 'Lidl', 38.2);
    expect(getDepenses()).toEqual([
      { date: '2026-09-09', magasin: 'Lidl', total: 38.2 },
      { date: '2026-09-09', magasin: 'Intermarché', total: 41.3 },
      { date: '2026-09-02', magasin: 'Lidl', total: 35.1 },
    ]);
  });

  it('deleteDepense retire la ligne (casse ignorée)', () => {
    saveDepense('2026-09-09', 'Lidl', 38.2);
    saveDepense('2026-09-02', 'Lidl', 35.1);
    deleteDepense('2026-09-09', 'lidl');
    expect(getDepenses()).toEqual([{ date: '2026-09-02', magasin: 'Lidl', total: 35.1 }]);
  });

  it('rejette les entrées illégales et garde les valides (warn par entrée)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(
      'sportapp:depenses',
      JSON.stringify([
        { date: '2026-09-09', magasin: 'Lidl', total: 38.2 },
        { date: 'invalide', magasin: 'X', total: 5 },
        { date: '2026-09-02', magasin: '  ', total: 10 },
        { date: '2026-09-01', magasin: 'Aldi', total: -3 },
      ]),
    );
    expect(getDepenses()).toEqual([{ date: '2026-09-09', magasin: 'Lidl', total: 38.2 }]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('clé entière corrompue → warn + remove + []', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('sportapp:depenses', '{pas du json');
    expect(getDepenses()).toEqual([]);
    expect(localStorage.getItem('sportapp:depenses')).toBeNull();
    warnSpy.mockRestore();
  });

  it('clé non-tableau → warn + remove + []', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('sportapp:depenses', JSON.stringify({ oops: true }));
    expect(getDepenses()).toEqual([]);
    expect(localStorage.getItem('sportapp:depenses')).toBeNull();
    warnSpy.mockRestore();
  });
});

describe('storage: profil — champs maison & courses', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const base: UserProfile = {
    id: 'marc',
    dateNaissance: '1985-04-12',
    taille: 178,
    objectif: { type: 'maintien' },
    complements: [],
    regime: 'aucun',
  };

  it('roundtrip avec les champs maison remplis', () => {
    const p: UserProfile = {
      ...base,
      magasin: 'Lidl',
      budgetMax: 40,
      preferences: ['Healthy', 'Petit budget'],
      personnes: 4,
      repasJour: 3,
    };
    saveProfile(p);
    expect(loadProfile()).toEqual(p);
  });

  it('saveProfile dédoublonne et normalise preferences (casse/accents ignorés) et trim magasin', () => {
    saveProfile({ ...base, magasin: '  Lidl  ', preferences: ['Healthy', 'healthy', '  HEALTHY '] });
    expect(loadProfile()).toEqual({ ...base, magasin: 'Lidl', preferences: ['Healthy'] });
  });

  it('loadProfile ignore un champ optionnel illégal sans invalider le profil', () => {
    saveProfile({ ...base, budgetMax: 40 });
    // réécrit la clé en injectant des champs illégaux
    const raw = JSON.parse(localStorage.getItem('sportapp:profile')!);
    localStorage.setItem(
      'sportapp:profile',
      JSON.stringify({ ...raw, budgetMax: 'beaucoup', personnes: 0, magasin: 42 }),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadProfile()).toEqual(base);
    warnSpy.mockRestore();
  });

  it('loadProfile reste strict sur les champs requis', () => {
    saveProfile({ ...base, budgetMax: 40 });
    const raw = JSON.parse(localStorage.getItem('sportapp:profile')!);
    localStorage.setItem('sportapp:profile', JSON.stringify({ ...raw, dateNaissance: 1985 }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
    warnSpy.mockRestore();
  });
});
```

Ajouter `getDepenses, saveDepense, deleteDepense` aux imports existants de `../src/lib/storage`.

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL — `getDepenses` n'existe pas.

- [ ] **Step 3: Implémenter les dépenses** — dans `src/lib/storage.ts` :

Import du type : remplacer la ligne 1 par :

```ts
import type { DepenseEntry, ImportedWeek, ProfileKey, UserProfile, WeeklyData } from './model';
```

Ajouter `import { normaliseComplement } from './model';` (import de valeur, à placer après l'import de types).

À côté de la constante `weightsKey` :

```ts
const DEPENSES_KEY = 'sportapp:depenses';
```

À la fin du fichier, ajouter :

```ts
// Dépenses réelles de courses — tableau brut (convention sportapp:weights:*),
// trié par date desc. Garde de forme PAR ENTRÉE : une entrée illégale est
// rejetée (warn), les autres sont gardées. Tableau entier illégal → remove.
const estDepenseValide = (v: unknown): v is DepenseEntry =>
  isPlainObject(v) &&
  typeof v.date === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
  typeof v.magasin === 'string' &&
  v.magasin.trim().length > 0 &&
  typeof v.total === 'number' &&
  Number.isFinite(v.total) &&
  v.total > 0;

export const getDepenses = (): DepenseEntry[] => {
  const raw = localStorage.getItem(DEPENSES_KEY);
  if (raw === null) return [];
  const parsed = safeParse<unknown>(DEPENSES_KEY, raw, null);
  if (!Array.isArray(parsed)) {
    console.warn(`Dépenses corrompues ignorées : ${DEPENSES_KEY}`);
    localStorage.removeItem(DEPENSES_KEY);
    return [];
  }
  const out: DepenseEntry[] = [];
  for (const entry of parsed) {
    if (estDepenseValide(entry)) out.push(entry);
    else console.warn(`Dépense illégale ignorée : ${JSON.stringify(entry)}`);
  }
  return out;
};

// Upsert par (date, magasin) — la casse du magasin est ignorée pour la
// correspondance (évite « lidl » + « Lidl » en doublon), la première graphie
// saisie est conservée. Trie par date desc (à date égale : magasin A→Z).
export const saveDepense = (date: string, magasin: string, total: number): DepenseEntry[] => {
  const mag = magasin.trim();
  const list = getDepenses()
    .filter((d) => !(d.date === date && d.magasin.toLowerCase() === mag.toLowerCase()))
    .concat({ date, magasin: mag, total })
    .sort((a, b) => b.date.localeCompare(a.date) || a.magasin.localeCompare(b.magasin));
  localStorage.setItem(DEPENSES_KEY, JSON.stringify(list));
  return list;
};

export const deleteDepense = (date: string, magasin: string): DepenseEntry[] => {
  const mag = magasin.toLowerCase();
  const list = getDepenses().filter(
    (d) => !(d.date === date && d.magasin.toLowerCase() === mag),
  );
  localStorage.setItem(DEPENSES_KEY, JSON.stringify(list));
  return list;
};
```

- [ ] **Step 4: Implémenter la garde profil étendue** — dans `src/lib/storage.ts`, remplacer `saveProfile` par (dédoublonnage `preferences` + trim `magasin` à la sauvegarde) :

```ts
// Normalise un champ libre type « preferences » : trim, 40 caractères max,
// dédoublonnage insensible casse/accents (même règle que les compléments).
const normaliseChampsLibres = (list: string[]): string[] => {
  const out: string[] = [];
  for (const v of list) {
    const t = v.trim().slice(0, 40);
    if (t && !out.some((x) => normaliseComplement(x) === normaliseComplement(t))) out.push(t);
  }
  return out;
};

export const saveProfile = (profile: UserProfile): void => {
  const net: UserProfile = {
    ...profile,
    ...(profile.magasin !== undefined ? { magasin: profile.magasin.trim() } : {}),
    ...(profile.preferences !== undefined
      ? { preferences: normaliseChampsLibres(profile.preferences) }
      : {}),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(net));
};
```

Puis remplacer `loadProfile` par la v2.1 — les champs requis restent stricts, les champs maison sont **reconstruits champ par champ** (un champ illégal est ignoré, pas de null) :

```ts
export const loadProfile = (): UserProfile | null => {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw === null) return null;
  const parsed = safeParse<unknown>(PROFILE_KEY, raw, null);
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const isStr = (v: unknown): v is string => typeof v === 'string';
  const optionalNum = (v: unknown): boolean => v === undefined || isNum(v);
  const obj = isPlainObject(parsed) ? parsed.objectif : undefined;
  const complements = isPlainObject(parsed) ? parsed.complements : undefined;
  const ok =
    isPlainObject(parsed) &&
    (parsed.id === 'marc' || parsed.id === 'melanie') &&
    isStr(parsed.dateNaissance) &&
    isNum(parsed.taille) &&
    optionalNum(parsed.poidsObjectif) &&
    isPlainObject(obj) &&
    OBJECTIF_TYPES_VALIDES.includes(obj.type as string) &&
    (obj.echeance === undefined || isStr(obj.echeance)) &&
    Array.isArray(complements) &&
    complements.every(isStr) &&
    REGIMES_VALIDES.includes(parsed.regime as string);
  if (!ok) {
    console.warn(`Profil corrompu ignoré : ${PROFILE_KEY}`);
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
  const optionalInt1a12 = (v: unknown): v is number =>
    v === undefined || (isNum(v) && Number.isInteger(v) && v >= 1 && v <= 12);
  const optionalPositif = (v: unknown): v is number => v === undefined || (isNum(v) && v > 0);
  const p = parsed as unknown as UserProfile;
  // Reconstruction explicite : les champs optionnels illégaux sont ignorés
  // (retirés), le profil reste valide — et les clés inconnues sont lâchées.
  return {
    id: p.id,
    dateNaissance: p.dateNaissance,
    taille: p.taille,
    ...(optionalNum(p.poidsObjectif) && p.poidsObjectif !== undefined
      ? { poidsObjectif: p.poidsObjectif }
      : {}),
    objectif: {
      type: p.objectif.type,
      ...(p.objectif.echeance !== undefined ? { echeance: p.objectif.echeance } : {}),
    },
    complements: [...p.complements],
    regime: p.regime,
    ...(isStr(p.magasin) && p.magasin.trim() ? { magasin: p.magasin.trim() } : {}),
    ...(optionalPositif(p.budgetMax) && p.budgetMax !== undefined ? { budgetMax: p.budgetMax } : {}),
    ...(Array.isArray(p.preferences) && p.preferences.every(isStr)
      ? { preferences: [...p.preferences] }
      : {}),
    ...(optionalInt1a12(p.personnes) && p.personnes !== undefined ? { personnes: p.personnes } : {}),
    ...(optionalInt1a12(p.repasJour) && p.repasJour !== undefined ? { repasJour: p.repasJour } : {}),
  };
};
```

(`OBJECTIF_TYPES_VALIDES` et `REGIMES_VALIDES` existent déjà au-dessus de `loadProfile` depuis le chantier 2 — ne pas les réécrire.)

- [ ] **Step 5: Vérifier le vert**

Run: `npx vitest run tests/storage.test.ts`
Expected: PASS (tous les describes, y compris ceux du chantier 2).

- [ ] **Step 6: Vérifier aucune régression** — `npm test` : PASS. Si un test du chantier 2 échoue (roundtrip profil), c'est que la reconstruction perd une clé — corriger avant de continuer.

- [ ] **Step 7: Commit**

```bash
git add src/lib/storage.ts tests/storage.test.ts
git commit -m "feat: storage — clé sportapp:depenses (upsert date+magasin) et garde profil par champ"
```

---

### Task 3 : lib/prix — formatEuro, parseEuro

**Files:**
- Create: `src/lib/prix.ts`
- Test: `tests/lib/prix.test.ts`

- [ ] **Step 1: Test (rouge)** — créer `tests/lib/prix.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { formatEuro, parseEuro } from '../../src/lib/prix';

describe('formatEuro', () => {
  it('formate en fr-FR avec 2 décimales et le symbole €', () => {
    expect(formatEuro(38.2)).toMatch(/^38,20\s*€$/);
    expect(formatEuro(40)).toMatch(/^40,00\s*€$/);
    expect(formatEuro(1234.5)).toMatch(/^1\s*234,50\s*€$/);
  });
});

describe('parseEuro', () => {
  it('accepte la virgule, le point et les espaces', () => {
    expect(parseEuro('38,20')).toBe(38.2);
    expect(parseEuro('38.2')).toBe(38.2);
    expect(parseEuro(' 41,30 ')).toBe(41.3);
  });

  it('arrondit à 2 décimales', () => {
    expect(parseEuro('10,333')).toBe(10.33);
  });

  it('renvoie null si invalide ou ≤ 0', () => {
    expect(parseEuro('abc')).toBeNull();
    expect(parseEuro('')).toBeNull();
    expect(parseEuro('0')).toBeNull();
    expect(parseEuro('-5')).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/lib/prix.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter** — créer `src/lib/prix.ts` :

```ts
const format = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// 38.2 -> « 38,20 € » (fr-FR, 2 décimales) — carte budget, résumé, historique.
export const formatEuro = (n: number): string => format.format(n);

// « 38,20 » | « 38.2 » | « 41,30 » -> number arrondi à 2 décimales ; null si
// invalide ou ≤ 0 (une dépense ne peut pas être nulle).
export const parseEuro = (s: string): number | null => {
  const n = Number.parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  if (Number.isNaN(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
};
```

- [ ] **Step 4: Vérifier le vert**

Run: `npx vitest run tests/lib/prix.test.ts`
Expected: PASS. (Si le séparateur de milliers diffère selon l'ICU, le regex `1\s*234` tolère espace insécable.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/prix.ts tests/lib/prix.test.ts
git commit -m "feat: lib/prix — formatEuro et parseEuro mutualisés (fr-FR)"
```

---

### Task 4 : CoursesBudget — la carte « Budget courses »

**Files:**
- Create: `src/components/cuisine/CoursesBudget.tsx` (la carte seule — le panneau arrive en Task 5)
- Modify: `src/index.css`
- Test: `tests/components.test.tsx`

- [ ] **Step 1: Tests (rouge)** — dans `tests/components.test.tsx`, ajouter les imports :

```ts
import { CoursesBudget } from '../src/components/cuisine/CoursesBudget';
import type { DepenseEntry } from '../src/lib/model';
```

Ajouter le helper (après `profileV2`) :

```tsx
const seedDepenses = (list: DepenseEntry[]) =>
  localStorage.setItem('sportapp:depenses', JSON.stringify(list));

const dataAvecBudget = (budget?: string) => ({
  ...dataSemaine(), // helper existant du fichier (WeeklyData complet) — sinon dupliquer le helper ci-dessous
  ...(budget !== undefined ? { budget } : {}),
});
```

Si `dataSemaine()` n'existe pas dans le fichier, utiliser ce helper à la place (WeeklyData minimal valide) :

```tsx
const dataAvecBudget = (budget?: string): WeeklyData => ({
  meta: {
    semaine: '2026-S37',
    menu: 'Menu A',
    du: '2026-09-07',
    au: '2026-09-13',
  },
  courses: [],
  menu: [],
  batch: [],
  profiles: {
    marc: { cibles: [], seances: [], rappels: [] },
    melanie: { cibles: [], seances: [], rappels: [] },
  },
  ...(budget !== undefined ? { budget } : {}),
});
```

(+ import `import type { WeeklyData } from '../src/lib/model';` si absent.)

Ajouter le describe :

```tsx
describe('CoursesBudget — carte budget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('affiche estimé / payé / budget max alignés et le pourcentage', () => {
    seedDepenses([{ date: '2026-09-09', magasin: 'Lidl', total: 38.2 }]);
    render(
      <CoursesBudget
        data={dataAvecBudget('≈ 35 €')}
        profile={profileV2('marc', { magasin: 'Lidl', budgetMax: 40 })}
        onOuvrirDepenses={() => {}}
      />,
    );

    expect(screen.getByText('Budget courses')).toBeInTheDocument();
    expect(screen.getByText('≈ 35 €')).toBeInTheDocument();
    expect(screen.getByText('38,20 €')).toBeInTheDocument();
    expect(screen.getByText('40,00 €')).toBeInTheDocument();
    expect(screen.getByText('96 % du budget')).toBeInTheDocument();
    expect(screen.getByText('Lidl')).toBeInTheDocument(); // pill magasin
  });

  it('passe en rouge et annonce le dépassement au-delà du budget max', () => {
    seedDepenses([{ date: '2026-09-09', magasin: 'Lidl', total: 43.8 }]);
    render(
      <CoursesBudget
        data={dataAvecBudget('≈ 35 €')}
        profile={profileV2('marc', { budgetMax: 40 })}
        onOuvrirDepenses={() => {}}
      />,
    );

    expect(screen.getByText('43,80 €')).toBeInTheDocument();
    expect(screen.getByText('dépassé de 10 %')).toBeInTheDocument();
    expect(document.querySelector('.bud-bar.alerte')).not.toBeNull();
    expect(document.querySelector('.bud-pct.alerte')).not.toBeNull();
  });

  it('somme uniquement les dépenses de la semaine affichée', () => {
    seedDepenses([
      { date: '2026-09-09', magasin: 'Lidl', total: 38.2 },
      { date: '2026-09-02', magasin: 'Lidl', total: 10 }, // semaine précédente (du = 2026-09-07)
      { date: '2026-09-14', magasin: 'Lidl', total: 5 }, // semaine suivante
    ]);
    render(
      <CoursesBudget
        data={dataAvecBudget()}
        profile={profileV2('marc', { budgetMax: 40 })}
        onOuvrirDepenses={() => {}}
      />,
    );

    expect(screen.getByText('38,20 €')).toBeInTheDocument();
    expect(screen.queryByText('48,20 €')).not.toBeInTheDocument();
  });

  it('sans budget max : grille à 2 colonnes, pas de barre ni de pourcentage', () => {
    seedDepenses([{ date: '2026-09-09', magasin: 'Lidl', total: 38.2 }]);
    render(
      <CoursesBudget data={dataAvecBudget('≈ 35 €')} profile={profileV2('marc')} onOuvrirDepenses={() => {}} />,
    );

    expect(document.querySelector('.bud-grid.cols2')).not.toBeNull();
    expect(screen.queryByText('Budget max')).not.toBeInTheDocument();
    expect(document.querySelector('.bud-bar')).toBeNull();
  });

  it('estimé absent du .md : la cellule est masquée, les autres restent', () => {
    seedDepenses([{ date: '2026-09-09', magasin: 'Lidl', total: 38.2 }]);
    render(
      <CoursesBudget data={dataAvecBudget()} profile={profileV2('marc', { budgetMax: 40 })} onOuvrirDepenses={() => {}} />,
    );

    expect(screen.queryByText('Estimé menu')).not.toBeInTheDocument();
    expect(screen.getByText('Payé cette semaine')).toBeInTheDocument();
    expect(screen.getByText('Budget max')).toBeInTheDocument();
  });

  it('rien de saisi : « Payé » vaut —', () => {
    render(
      <CoursesBudget data={dataAvecBudget('≈ 35 €')} profile={profileV2('marc', { budgetMax: 40 })} onOuvrirDepenses={() => {}} />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(document.querySelector('.bud-bar')).toBeNull();
  });

  it('aucune donnée du tout : la carte ne rend rien', () => {
    const { container } = render(
      <CoursesBudget data={dataAvecBudget()} profile={profileV2('marc')} onOuvrirDepenses={() => {}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('le bouton « Total payé » ouvre le panneau dépenses', async () => {
    const onOuvrir = vi.fn();
    const user = userEvent.setup();
    render(
      <CoursesBudget
        data={dataAvecBudget('≈ 35 €')}
        profile={profileV2('marc', { budgetMax: 40 })}
        onOuvrirDepenses={onOuvrir}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Total payé/ }));
    expect(onOuvrir).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole('button', { name: /Voir mes dépenses réelles/ }));
    expect(onOuvrir).toHaveBeenCalledWith(false);
  });
});
```

NB : les props d'`onOuvrirDepenses` portent le focus (`true` = focus sur le total, cf. Task 5). Si `profileV2` est l'helper du plan chantier 2 (`(id, extra) => UserProfile`), il accepte `magasin`/`budgetMax` via `extra` (Partial) — rien à changer.

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/components.test.tsx -t "CoursesBudget"`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter la carte** — créer `src/components/cuisine/CoursesBudget.tsx` :

```tsx
import { useState } from 'react';
import { MAGASINS_PRESETS } from '../../lib/model';
import type { DepenseEntry, UserProfile, WeeklyData } from '../../lib/model';
import { getDepenses } from '../../lib/storage';
import { formatEuro } from '../../lib/prix';
import { Icon } from '../Icon';

// Somme des dépenses dont la date appartient à [du..au] — comparaison par
// chaînes ISO (jamais new Date sur une forme date-only, qui parserait en UTC).
export const payeSurSemaine = (depenses: DepenseEntry[], du: string, au: string): number =>
  depenses
    .filter((d) => d.date >= du && d.date <= au)
    .reduce((somme, d) => somme + d.total, 0);

export function CoursesBudget({
  data,
  profile,
  onOuvrirDepenses,
}: {
  data: WeeklyData;
  profile: UserProfile;
  onOuvrirDepenses: (focusTotal: boolean) => void;
}) {
  const [depenses] = useState<DepenseEntry[]>(() => getDepenses());

  const paye = payeSurSemaine(depenses, data.meta.du, data.meta.au);
  const enSemaine = depenses.some((d) => d.date >= data.meta.du && d.date <= data.meta.au);
  // Carte visible seulement si au moins une donnée existe (spec § 3).
  if (!data.budget && profile.budgetMax === undefined && !enSemaine) return null;

  const max = profile.budgetMax;
  const maxConnu = max !== undefined && enSemaine;
  const pct = maxConnu ? Math.round((paye / max) * 100) : null;
  const depasse = pct !== null && paye > max;

  return (
    <section className="bud" aria-label="Budget courses">
      <div className="bud-head">
        <b>Budget courses</b>
        {profile.magasin && (
          <span className="mag">
            <Icon name="cart" size={11} />
            {profile.magasin}
          </span>
        )}
      </div>
      <div className={`bud-grid${max === undefined ? ' cols2' : ''}`}>
        {data.budget && (
          <div className="bud-cell">
            <span className="l">Estimé menu</span>
            <span className="v">{data.budget}</span>
          </div>
        )}
        <div className="bud-cell">
          <span className="l">Payé cette semaine</span>
          <span className={`v${depasse ? ' alerte' : ''}`}>
            {enSemaine ? formatEuro(paye) : '—'}
          </span>
        </div>
        {max !== undefined && (
          <div className="bud-cell">
            <span className="l">Budget max</span>
            <span className="v">{formatEuro(max)}</span>
          </div>
        )}
      </div>
      {maxConnu && (
        <div className="bud-foot">
          <div className={`bud-bar${depasse ? ' alerte' : ''}`}>
            <i style={{ width: depasse ? '100%' : `${Math.min(pct!, 100)}%` }} />
          </div>
          <span className={`bud-pct${depasse ? ' alerte' : ''}`}>
            {depasse ? `dépassé de ${pct! - 100} %` : `${pct} % du budget`}
          </span>
        </div>
      )}
      <div className="bud-actions">
        <button type="button" className="bsoft" onClick={() => onOuvrirDepenses(true)}>
          <Icon name="plus" size={13} /> Total payé
        </button>
        <button type="button" className="blink" onClick={() => onOuvrirDepenses(false)}>
          Voir mes dépenses réelles
        </button>
      </div>
    </section>
  );
}
```

NB : `MAGASINS_PRESETS` est importé ici pour la datalist du panneau (Task 5) — si le linter refuse un import inutilisé à cette étape, déplacer l'import en Task 5.

- [ ] **Step 4: CSS** — dans `src/index.css`, ajouter :

```css
/* Carte « Budget courses » (onglet Courses) */
.bud {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px 15px;
}
.bud-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.bud-head b {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.mag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 9px;
  background: color-mix(in srgb, var(--accent-2) 60%, var(--surface));
  color: var(--text);
}
.bud-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
  margin-top: 13px;
}
.bud-grid.cols2 {
  grid-template-columns: 1fr 1fr;
}
.bud-cell .l {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  white-space: nowrap;
}
.bud-cell .v {
  display: block;
  font-size: 16.5px;
  font-weight: 700;
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}
.bud-cell .v.alerte {
  color: var(--danger);
}
.bud-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 13px;
}
.bud-bar {
  flex: 1;
  height: 6px;
  border-radius: 99px;
  background: var(--surface-2);
  overflow: hidden;
}
.bud-bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: var(--accent);
}
.bud-bar.alerte i {
  background: var(--danger);
}
.bud-pct {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--muted);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.bud-pct.alerte {
  color: var(--danger);
}
.bud-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}
.bud-actions .blink {
  margin-left: auto;
}

/* Boutons sobres (écrans maison & courses) — le gros basilic reste réservé
   au CTA de l'onboarding et aux « Enregistrer » du Profil (style v6). */
.bsoft {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border: 1.5px solid color-mix(in srgb, var(--accent) 35%, var(--border));
  background: var(--surface);
  color: var(--accent);
  border-radius: 999px;
  font: 700 12.5px Poppins, sans-serif;
  cursor: pointer;
}
.bsoft:active {
  transform: scale(0.97);
}
.blink {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: none;
  padding: 0;
  color: var(--accent);
  font: 700 12.5px Poppins, sans-serif;
  cursor: pointer;
}
```

(`--danger`, `--radius`, `--accent-2` existent dans les tokens Herbes — vérifier avec `rg -n "\-\-danger" src/index.css`.)

- [ ] **Step 5: Vérifier le vert**

Run: `npx vitest run tests/components.test.tsx -t "CoursesBudget"`
Expected: PASS. Puis `npm run typecheck && npm run lint` verts.

- [ ] **Step 6: Commit**

```bash
git add src/components/cuisine/CoursesBudget.tsx src/index.css tests/components.test.tsx
git commit -m "feat: carte Budget courses — estimé menu / payé réel / budget max (4 états)"
```

---

### Task 5 : DepensesPanel — saisie, « Par magasin », historique

**Files:**
- Modify: `src/components/cuisine/CoursesBudget.tsx` (2e export du même fichier)
- Modify: `src/index.css`
- Test: `tests/components.test.tsx`

- [ ] **Step 1: Tests (rouge)** — à la suite du describe précédent, dans `tests/components.test.tsx` :

```tsx
describe('DepensesPanel — saisie, par magasin, historique', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const rendrePanel = (profile = profileV2('marc', { magasin: 'Lidl' }), focusTotal = false) =>
    render(<DepensesPanel profile={profile} focusTotal={focusTotal} onRetour={() => {}} />);

  it('préremplit la date du jour et le magasin du profil', () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00'));
    rendrePanel();

    expect(screen.getByLabelText('Date')).toHaveValue('2026-09-09');
    expect(screen.getByLabelText('Magasin')).toHaveValue('Lidl');
    vi.useRealTimers();
  });

  it('enregistre une dépense (virgule acceptée) et la montre dans l historique', async () => {
    const user = userEvent.setup();
    rendrePanel();

    await user.type(screen.getByLabelText('Total (€)'), '38,20');
    await user.click(screen.getByRole('button', { name: /Enregistrer/ }));

    expect(getDepenses()).toEqual([
      { date: expect.any(String), magasin: 'Lidl', total: 38.2 },
    ]);
    expect(screen.getAllByText('38,20 €').length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent(/Enregistré/);
  });

  it('refuse un total invalide ou une date future (rien n est sauvé)', async () => {
    const user = userEvent.setup();
    rendrePanel();

    await user.type(screen.getByLabelText('Total (€)'), '0');
    await user.click(screen.getByRole('button', { name: /Enregistrer/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Total invalide/i);
    expect(getDepenses()).toEqual([]);

    await user.clear(screen.getByLabelText('Total (€)'));
    await user.type(screen.getByLabelText('Total (€)'), '38,20');
    await user.fill(screen.getByLabelText('Date'), '2999-01-01');
    await user.click(screen.getByRole('button', { name: /Enregistrer/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/futur/i);
    expect(getDepenses()).toEqual([]);
  });

  it('upsert : ressaisir la même paire (date, magasin) remplace le total', async () => {
    seedDepenses([{ date: '2026-09-09', magasin: 'Lidl', total: 38.2 }]);
    const user = userEvent.setup();
    rendrePanel();

    await user.clear(screen.getByLabelText('Magasin'));
    await user.type(screen.getByLabelText('Magasin'), 'Lidl');
    await user.clear(screen.getByLabelText('Total (€)'));
    await user.type(screen.getByLabelText('Total (€)'), '40');
    await user.click(screen.getByRole('button', { name: /Enregistrer/ }));

    expect(getDepenses()).toEqual([{ date: '2026-09-09', magasin: 'Lidl', total: 40 }]);
  });

  it('regroupe par magasin (casse ignorée) avec total et moyenne', () => {
    seedDepenses([
      { date: '2026-09-09', magasin: 'Lidl', total: 38.2 },
      { date: '2026-09-02', magasin: 'lidl', total: 35.1 },
      { date: '2026-08-26', magasin: 'Intermarché', total: 41.3 },
    ]);
    rendrePanel();

    expect(screen.getByText('Lidl')).toBeInTheDocument();
    expect(screen.getByText('2 sessions')).toBeInTheDocument();
    expect(screen.getByText('73,30 €')).toBeInTheDocument();
    expect(screen.getByText('≈ 36,65 € / session')).toBeInTheDocument();
    expect(screen.getByText('Intermarché')).toBeInTheDocument();
    expect(screen.getByText('1 session')).toBeInTheDocument();
  });

  it('supprime une ligne depuis l historique', () => {
    seedDepenses([
      { date: '2026-09-09', magasin: 'Lidl', total: 38.2 },
      { date: '2026-09-02', magasin: 'Lidl', total: 35.1 },
    ]);
    const user = userEvent.setup();
    rendrePanel();

    await user.click(screen.getByRole('button', { name: 'Supprimer 09/09 Lidl' }));
    expect(getDepenses()).toEqual([{ date: '2026-09-02', magasin: 'Lidl', total: 35.1 }]);
  });

  it('les champs magasin proposent le datalist des magasins connus', () => {
    rendrePanel();

    expect(screen.getByLabelText('Magasin')).toHaveAttribute('list');
    expect(
      screen.getAllByText('Intermarché').some((el) => el.closest('datalist')),
    ).toBe(true);
  });

  it('Annuler et Retour ferment le panneau', async () => {
    const onRetour = vi.fn();
    const user = userEvent.setup();
    render(<DepensesPanel profile={profileV2('marc')} focusTotal={false} onRetour={onRetour} />);

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onRetour).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Retour/ }));
    expect(onRetour).toHaveBeenCalledTimes(2);
  });
});
```

Ajouter `DepensesPanel` aux imports de `CoursesBudget`.

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/components.test.tsx -t "DepensesPanel"`
Expected: FAIL — `DepensesPanel` introuvable.

- [ ] **Step 3: Implémenter** — à la suite de `CoursesBudget.tsx` (même fichier), ajouter :

```tsx
export function DepensesPanel({
  profile,
  focusTotal,
  onRetour,
}: {
  profile: UserProfile;
  focusTotal: boolean;
  onRetour: () => void;
}) {
  const [depenses, setDepenses] = useState<DepenseEntry[]>(() => getDepenses());
  const [date, setDate] = useState(() => todayISO());
  const [magasin, setMagasin] = useState(profile.magasin ?? '');
  const [total, setTotal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const enregistrer = () => {
    const t = parseEuro(total);
    if (t === null) {
      setError('Total invalide : entre un montant supérieur à 0.');
      return;
    }
    if (date > todayISO()) {
      setError('La date ne peut pas être dans le futur.');
      return;
    }
    if (!magasin.trim()) {
      setError('Indique le magasin de la session.');
      return;
    }
    setError(null);
    setSaved(true);
    setDepenses(saveDepense(date, magasin, t));
    setTotal('');
  };

  // Regroupement « Par magasin » : casse ignorée, première graphie conservée,
  // tri par total décroissant.
  const parMagasin = [...depenses.reduce((map, d) => {
    const cle = d.magasin.toLowerCase();
    const acc = map.get(cle) ?? { nom: d.magasin, total: 0, sessions: 0 };
    acc.total += d.total;
    acc.sessions += 1;
    map.set(cle, acc);
    return map;
  }, new Map<string, { nom: string; total: number; sessions: number }>()).values()].sort(
    (a, b) => b.total - a.total,
  );

  return (
    <div className="dep-panel">
      <div className="dep-head">
        <button type="button" className="dep-back" onClick={onRetour}>
          <Icon name="chev-left" size={14} />
          Retour
        </button>
        <h1>Mes dépenses réelles</h1>
        <p className="dep-sub">Une ligne par session de courses.</p>
      </div>

      <div className="dep-form">
        <div className="frow">
          <div>
            <span className="fl">Date</span>
            <input
              type="date"
              aria-label="Date"
              value={date}
              onChange={(e) => {
                setSaved(false);
                setError(null);
                setDate(e.target.value);
              }}
            />
          </div>
          <div>
            <span className="fl">Magasin</span>
            <input
              list="dep-magasins"
              aria-label="Magasin"
              value={magasin}
              onChange={(e) => {
                setSaved(false);
                setError(null);
                setMagasin(e.target.value);
              }}
            />
            <datalist id="dep-magasins">
              {MAGASINS_PRESETS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div>
            <span className="fl">Total (€)</span>
            <input
              className="tot"
              inputMode="decimal"
              aria-label="Total (€)"
              placeholder="38,20"
              autoFocus={focusTotal}
              value={total}
              onChange={(e) => {
                setSaved(false);
                setError(null);
                setTotal(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="fact">
          <button type="button" className="blink" onClick={onRetour}>
            Annuler
          </button>
          <button type="button" className="bgo" onClick={enregistrer}>
            <Icon name="check" size={13} /> Enregistrer
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="muted" role="status">
            Enregistré ✓
          </p>
        )}
      </div>

      {parMagasin.length > 0 && (
        <>
          <p className="dep-sec-label">Par magasin</p>
          <div className="dep-sum">
            {parMagasin.map((m) => (
              <div className="s" key={m.nom}>
                <span className="nm">
                  {m.nom} <small>{`${m.sessions} session${m.sessions > 1 ? 's' : ''}`}</small>
                </span>
                <span className="tot">{formatEuro(m.total)}</span>
                <span className="avg">{`≈ ${formatEuro(m.total / m.sessions)} / session`}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {depenses.length > 0 && (
        <>
          <p className="dep-sec-label">Historique</p>
          <div className="dep-list">
            {depenses.map((d) => (
              <div className="dep" key={`${d.date}-${d.magasin}`}>
                <span className="d">{formatDayMonth(d.date)}</span>
                <span className="m">{d.magasin}</span>
                <span className="t">{formatEuro(d.total)}</span>
                <button
                  type="button"
                  className="rm"
                  aria-label={`Supprimer ${formatDayMonth(d.date)} ${d.magasin}`}
                  onClick={() => setDepenses(deleteDepense(d.date, d.magasin))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="hint dep-hint">
        Deux magasins le même jour = deux lignes. Touche ✕ pour corriger une erreur de saisie.
      </p>
    </div>
  );
}
```

Compléter les imports du fichier :

```tsx
import { todayISO, formatDayMonth } from '../../lib/dates';
import { parseEuro } from '../../lib/prix';
import { getDepenses, saveDepense, deleteDepense } from '../../lib/storage';
```

(l'import existant de Task 4 n'avait que `getDepenses` et `formatEuro` — fusionner en une seule ligne par module.)

- [ ] **Step 4: CSS** — dans `src/index.css`, ajouter :

```css
/* Panneau « Mes dépenses réelles » */
.dep-head {
  padding-top: 4px;
}
.dep-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: none;
  font: 600 13px Poppins, sans-serif;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
}
.dep-head h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 8px 0 0;
}
.dep-sub {
  font-size: 12px;
  color: var(--muted);
  margin: 2px 0 0;
}
.dep-form {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 13px 14px 14px;
  margin-top: 14px;
}
.dep-form .frow {
  display: grid;
  grid-template-columns: 1.15fr 1fr 0.8fr;
  gap: 9px;
}
.dep-form .fl {
  display: block;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin-bottom: 5px;
}
.dep-form input {
  width: 100%;
  border: 1.5px solid var(--border);
  background: var(--bg);
  border-radius: 10px;
  padding: 9px 10px;
  font: 500 13px Poppins, sans-serif;
  color: var(--text);
  min-width: 0;
}
.dep-form input.tot {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.dep-form .fact {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 11px;
}
.dep-form .bgo {
  min-height: 38px;
  border: 0;
  background: var(--accent);
  color: var(--surface);
  border-radius: 999px;
  padding: 0 16px;
  font: 700 12px Poppins, sans-serif;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dep-form .fact .blink {
  font-size: 12px;
}
.dep-sec-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin: 16px 0 8px;
}
.dep-sum {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}
.dep-sum .s {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 11px 13px;
  min-width: 0;
}
.dep-sum .nm {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
}
.dep-sum .nm small {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
}
.dep-sum .tot {
  display: block;
  font-size: 17px;
  font-weight: 700;
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}
.dep-sum .avg {
  font-size: 10.5px;
  color: var(--muted);
  font-weight: 600;
  margin-top: 1px;
  font-variant-numeric: tabular-nums;
}
.dep-list {
  display: flex;
  flex-direction: column;
}
.dep {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 2px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.dep:last-child {
  border-bottom: 0;
}
.dep .d {
  flex: 0 0 64px;
  color: var(--muted);
  font-weight: 600;
}
.dep .m {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}
.dep .t {
  font-weight: 700;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.dep .rm {
  width: 32px;
  height: 32px;
  margin-right: -6px;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  flex-shrink: 0;
}
.dep-hint {
  margin-top: 12px;
}
```

Et compléter la règle responsive (dans le bloc `@media (max-width: 360px)` s'il existe, sinon à la fin) :

```css
@media (max-width: 360px) {
  .dep-form .frow {
    grid-template-columns: 1fr 1fr;
  }
  .dep-form .frow > div:first-child,
  .dep-form .frow > div:last-child {
    grid-column: span 2;
  }
}
```

- [ ] **Step 5: Vérifier le vert**

Run: `npx vitest run tests/components.test.tsx -t "DepensesPanel"` puis `npm test`
Expected: PASS partout.

- [ ] **Step 6: Commit**

```bash
git add src/components/cuisine/CoursesBudget.tsx src/index.css tests/components.test.tsx
git commit -m "feat: panneau Dépenses réelles — saisie (upsert), résumé par magasin, historique"
```

---

### Task 6 : CuisineView — intégration de la carte et du panneau

**Files:**
- Modify: `src/components/cuisine/CuisineView.tsx`
- Modify: `src/App.tsx:99`
- Test: `tests/components.test.tsx` (describe `CuisineView — sous-onglets`)

- [ ] **Step 1: Tests (rouge)** — dans `tests/components.test.tsx`, dans le describe `CuisineView — sous-onglets` (existant, ligne ~369) : vérifier comment `CuisineView` est rendu et ajouter le prop `profile` à chaque render (rouge attendu : prop inconnue) :

```tsx
render(<CuisineView data={data} profile={profileV2('marc')} />);
```

puis ajouter dans ce describe :

```tsx
it('affiche la carte Budget courses au-dessus de la liste (tab courses)', () => {
  render(
    <CuisineView
      data={{ ...data, budget: '≈ 35 €' }}
      profile={profileV2('marc', { magasin: 'Lidl', budgetMax: 40 })}
    />,
  );

  expect(screen.getByText('Budget courses')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Courses' })).toBeInTheDocument();
});

it('le bouton Total payé ouvre le panneau dépenses à la place de la liste', async () => {
  const user = userEvent.setup();
  render(
    <CuisineView
      data={{ ...data, budget: '≈ 35 €' }}
      profile={profileV2('marc', { magasin: 'Lidl', budgetMax: 40 })}
    />,
  );

  await user.click(screen.getByRole('button', { name: /Total payé/ }));
  expect(screen.getByRole('heading', { name: /Mes dépenses réelles/ })).toBeInTheDocument();
  expect(screen.queryByText('Budget courses')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Retour/ }));
  expect(screen.getByText('Budget courses')).toBeInTheDocument();
});

it('sans aucune donnée budget : pas de carte, la liste de courses reste seule', () => {
  render(<CuisineView data={data} profile={profileV2('marc')} />);

  expect(screen.queryByText('Budget courses')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Courses' })).toBeInTheDocument();
});
```

(`data` est le helper WeeklyData déjà utilisé par ce describe — sinon le créer comme `dataAvecBudget` en Task 4 sans `budget`.)

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/components.test.tsx -t "CuisineView"`
Expected: FAIL — prop `profile` manquante (TS) / carte absente.

- [ ] **Step 3: Implémenter** — remplacer `src/components/cuisine/CuisineView.tsx` par :

```tsx
import { useState } from 'react';
import type { UserProfile, WeeklyData } from '../../lib/model';
import { BatchView } from './BatchView';
import { CoursesBudget, DepensesPanel } from './CoursesBudget';
import { MenuView } from './MenuView';
import { ShoppingList } from './ShoppingList';

type CuisineTab = 'courses' | 'menu' | 'batch';

const TABS: Array<{ id: CuisineTab; label: string }> = [
  { id: 'courses', label: 'Courses' },
  { id: 'menu', label: 'Menu' },
  { id: 'batch', label: 'Batch' },
];

export function CuisineView({ data, profile }: { data: WeeklyData; profile: UserProfile }) {
  const [tab, setTab] = useState<CuisineTab>('courses');
  const [depOuvert, setDepOuvert] = useState(false);
  const [depFocus, setDepFocus] = useState(false);
  const semaine = data.meta.semaine;
  return (
    <>
      <nav className="cuisine-tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={id === tab ? 'tab active' : 'tab'}
            aria-current={id === tab ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'courses' &&
        (depOuvert ? (
          <DepensesPanel
            profile={profile}
            focusTotal={depFocus}
            onRetour={() => setDepOuvert(false)}
          />
        ) : (
          <>
            <CoursesBudget
              data={data}
              profile={profile}
              onOuvrirDepenses={(focus) => {
                setDepFocus(focus);
                setDepOuvert(true);
              }}
            />
            <ShoppingList items={data.courses} semaine={semaine} budget={data.budget} />
          </>
        ))}
      {tab === 'menu' && <MenuView menu={data.menu} recettes={data.recettes} bases={data.bases} semaine={semaine} />}
      {tab === 'batch' && (
        <BatchView rituel={data.rituel} microBatch={data.microBatch} semaine={semaine} />
      )}
    </>
  );
}
```

⚠️ Adapter aux signatures **réelles post-Herbes** de `MenuView`/`BatchView`/`ShoppingList` (le chantier 1 a ajouté `budget` à ShoppingList et `semaine` à MenuView) — ne pas régresser : ouvrir le fichier et conserver les props exactes déjà en place, ne changer QUE l'ajout de `profile`, le state `depOuvert` et le bloc `tab === 'courses'`.

Dans `src/App.tsx` ligne 99, remplacer :

```tsx
{tab === 'cuisine' && <CuisineView data={affichee.data} />}
```

par :

```tsx
{tab === 'cuisine' && <CuisineView data={affichee.data} profile={profile} />}
```

- [ ] **Step 4: Vérifier le vert**

Run: `npm test` puis `npm run typecheck && npm run lint`
Expected: PASS (le describe existant `CuisineView — sous-onglets` reste vert après l'ajout du prop).

- [ ] **Step 5: Commit**

```bash
git add src/components/cuisine/CuisineView.tsx src/App.tsx tests/components.test.tsx
git commit -m "feat: onglet Courses — carte budget au-dessus de la liste, panneau dépenses"
```

---

### Task 7 : Onboarding — 5e étape « Maison & courses »

**Files:**
- Modify: `src/components/onboarding/Onboarding.tsx` (code final du plan chantier 2, Task 4)
- Test: `tests/app.test.tsx` (describes `Onboarding — …` ajoutés par le chantier 2)

- [ ] **Step 1: Tests (rouge)** — dans `tests/app.test.tsx`, adapter les describes onboarding (même pattern que le chantier 2 : helpers `allerEtape*`, `soumettre`, `onDone` du scope) :

**a. Étape 1** — dans le test « 4 points de progression » : `toHaveLength(4)` → `toHaveLength(5)` (libellé : « 5 points de progression »).

**b. Helper `allerEtape4`** — l'adapter pour accepter les choix faits à l'étape 4 (avant de quitter) :

```tsx
const allerEtape4 = async (choix: { regime?: Regime; complements?: string[] } = {}) => {
  const user = await allerEtape3();
  if (choix.complements) {
    for (const c of choix.complements) {
      await user.click(screen.getByRole('button', { name: c }));
    }
  }
  if (choix.regime) {
    const nom = REGIMES.find((r) => r.id === choix.regime)!.nom;
    await user.click(screen.getByRole('radio', { name: nom }));
  }
  return user;
};
```

(`REGIMES` vient de `../src/lib/model` — déjà importé par les tests d'étape 4 du chantier 2 ; ajouter le type `Regime` aux imports de type si absent.)

**c. Helper `allerEtape5`** — nouveau (étape 4 → 5) :

```tsx
const allerEtape5 = async (choix: { regime?: Regime; complements?: string[] } = {}) => {
  const user = await allerEtape4(choix);
  await user.click(screen.getByRole('button', { name: /Continuer/ }));
  expect(screen.getByRole('heading', { name: /Maison & courses/ })).toBeInTheDocument();
  return user;
};
```

**d. Étape 4** — supprimer du describe `Onboarding — étape 4` les deux tests qui soumettent (« choisit un régime et enregistre le profil v2 complet (C est parti) » et « enregistre sans aucun champ optionnel (maintien, aucun complément) ») : ils sont remplacés par les versions étape 5 ci-dessous. Les autres tests d'étape 4 (chips, doublon) restent.

**e. Nouveau describe** (à la suite de l'étape 4) :

```tsx
describe('Onboarding — étape 5 (maison & courses)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('affiche les champs maison avec le datalist magasins', async () => {
    await allerEtape5();

    expect(screen.getByLabelText('Magasin habituel')).toHaveAttribute('list');
    expect(
      screen.getAllByText('Intermarché').some((el) => el.closest('datalist')),
    ).toBe(true);
    expect(screen.getByLabelText('Budget max courses / semaine')).toBeInTheDocument();
    expect(screen.getByLabelText('Personnes à table')).toBeInTheDocument();
    expect(screen.getByLabelText('Repas par jour')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Healthy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Batch-friendly' })).toBeInTheDocument();
  });

  it('bascule les préférences presets et refuse le doublon à l ajout libre', async () => {
    const user = await allerEtape5();
    await user.click(screen.getByRole('button', { name: 'Petit budget' }));
    expect(screen.getByRole('button', { name: 'Petit budget' })).toHaveAttribute('aria-pressed', 'true');
    await user.type(screen.getByLabelText('Ajouter une préférence'), 'healthy');
    await user.click(screen.getByRole('button', { name: /Ajouter/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/déjà sélectionné/i);
    await user.clear(screen.getByLabelText('Ajouter une préférence'));
    await user.type(screen.getByLabelText('Ajouter une préférence'), 'Végé');
    await user.click(screen.getByRole('button', { name: /Ajouter/ }));
    expect(screen.getByRole('button', { name: /Végé/ })).toBeInTheDocument();
  });

  it('refuse un budget max invalide ou des personnes hors bornes', async () => {
    const user = await allerEtape5();
    await user.type(screen.getByLabelText('Budget max courses / semaine'), '0');
    await user.click(screen.getByRole('button', { name: /C'est parti/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Budget max invalide/i);

    await user.clear(screen.getByLabelText('Budget max courses / semaine'));
    await user.type(screen.getByLabelText('Personnes à table'), '0');
    await user.click(screen.getByRole('button', { name: /C'est parti/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Personnes à table/i);
    expect(loadProfile()).toBeNull();
  });

  it('C est parti enregistre le profil v2 complet (régime choisi à l étape 4 + maison)', async () => {
    const user = await allerEtape5({ regime: 'keto', complements: ['Créatine'] });
    await user.type(screen.getByLabelText('Magasin habituel'), 'Lidl');
    await user.type(screen.getByLabelText('Budget max courses / semaine'), '40');
    await user.type(screen.getByLabelText('Personnes à table'), '4');
    await user.type(screen.getByLabelText('Repas par jour'), '3');
    soumettre();

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        id: 'melanie',
        dateNaissance: '1987-03-02',
        taille: 165,
        objectif: { type: 'perte' },
        complements: ['Créatine'],
        regime: 'keto',
        magasin: 'Lidl',
        budgetMax: 40,
        preferences: [],
        personnes: 4,
        repasJour: 3,
      } satisfies UserProfile),
    );
    expect(getWeights('melanie')).toEqual([{ date: todayISO(), kg: 62.4 }]);
  });

  it('C est parti sans rien remplir : aucun champ maison n est écrit', async () => {
    const user = await allerEtape5();
    soumettre();

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        id: 'melanie',
        dateNaissance: '1987-03-02',
        taille: 165,
        objectif: { type: 'perte' },
        complements: [],
        regime: 'aucun',
      } satisfies UserProfile),
    );
  });
});
```

(Les états des étapes 3-4 persistent — c'est pourquoi les choix `regime`/`complements` passent par `allerEtape4` via `allerEtape5`, jamais saisis à l'étape 5.)

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/app.test.tsx -t "Onboarding"`
Expected: FAIL — l'étape 5 n'existe pas.

- [ ] **Step 3: Implémenter** — dans `src/components/onboarding/Onboarding.tsx` (code du plan chantier 2) :

3a. Types et states — remplacer :

```tsx
const [step, setStep] = useState<1 | 2 | 3 | 4>(prefill ? 2 : 1);
```

par :

```tsx
const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(prefill ? 2 : 1);
```

après l'état `regime`, ajouter :

```tsx
const [magasin, setMagasin] = useState('');
const [budgetMax, setBudgetMax] = useState('');
const [personnes, setPersonnes] = useState('');
const [repasJour, setRepasJour] = useState('');
const [preferences, setPreferences] = useState<string[]>([]);
const [nouvellePreference, setNouvellePreference] = useState('');
```

3b. Navigation — remplacer `aller`, `retour` et la signature de `continuerObjectif` :

```tsx
const aller = (n: 1 | 2 | 3 | 4 | 5) => {
  setError(null);
  setStep(n);
};

const retour = () => aller(Math.max(1, step - 1) as 1 | 2 | 3 | 4 | 5);
```

(`continuerObjectif` inchangé : `aller(4)`.)

3c. Préférences — à la suite de `basculerPreset` (règle compléments réutilisée) :

```tsx
const ajouterPreference = () => {
  const v = nouvellePreference.trim().slice(0, 40);
  if (!v) return;
  if (preferences.some((p) => normaliseComplement(p) === normaliseComplement(v))) {
    setError('Cette préférence est déjà sélectionnée.');
    return;
  }
  setError(null);
  setPreferences([...preferences, v]);
  setNouvellePreference('');
};

const basculerPreference = (preset: string) => {
  setError(null);
  setPreferences((ps) =>
    ps.some((p) => normaliseComplement(p) === normaliseComplement(preset))
      ? ps.filter((p) => normaliseComplement(p) !== normaliseComplement(preset))
      : [...ps, preset],
  );
};
```

3d. Validation étape 5 — nouvelle fonction (tout optionnel, valeurs contraintes si remplies) :

```tsx
const validerMaison = (): boolean => {
  const bud = budgetMax ? parseEuro(budgetMax) : undefined;
  if (budgetMax && (bud === null || bud > 10000)) {
    setError('Budget max invalide : entre un montant en euros (ex. 40).');
    return false;
  }
  const pers = personnes ? Number.parseInt(personnes, 10) : undefined;
  if (personnes && (pers === undefined || pers < 1 || pers > 12)) {
    setError('Personnes à table : entre 1 et 12.');
    return false;
  }
  const repas = repasJour ? Number.parseInt(repasJour, 10) : undefined;
  if (repasJour && (repas === undefined || repas < 1 || repas > 12)) {
    setError('Repas par jour : entre 1 et 12.');
    return false;
  }
  return true;
};
```

(+ `import { parseEuro } from '../../lib/prix';` en tête du fichier.)

3e. `valider` — insérer la validation maison et les champs dans le profil. Remplacer le début de `valider` :

```tsx
const valider = () => {
  const infos = validerInfos();
  if (!infos) return;
  const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
  if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
    setError('Poids objectif invalide : entre 30 et 250 kg.');
    return;
  }
  if (!validerMaison()) return;
  if (!id) return;
  const pers = personnes ? Number.parseInt(personnes, 10) : undefined;
  const repas = repasJour ? Number.parseInt(repasJour, 10) : undefined;
  const profile: UserProfile = {
    id,
    dateNaissance,
    taille: infos.cm,
    ...(obj != null ? { poidsObjectif: obj } : {}),
    objectif: { type: objectifType, ...(echeance ? { echeance } : {}) },
    complements: [...complements],
    regime,
    ...(magasin.trim() ? { magasin: magasin.trim() } : {}),
    ...(budgetMax ? { budgetMax: parseEuro(budgetMax)! } : {}),
    ...(preferences.length > 0 ? { preferences: [...preferences] } : {}),
    ...(pers != null ? { personnes: pers } : {}),
    ...(repas != null ? { repasJour: repas } : {}),
  };
  saveProfile(profile);
  addWeight(id, todayISO(), infos.kg);
  onDone(profile);
};
```

3f. Dots — remplacer `{[1, 2, 3, 4].map((n) => (` par `{[1, 2, 3, 4, 5].map((n) => (`.

3g. Étape 4 — remplacer le bloc CTA final :

```tsx
<button type="submit" className="onboarding-cta onb-full">
  C'est parti ! 🚀
</button>
<div className="onb-btnrow">
  <button type="button" className="onb-back" onClick={retour}>
    Retour
  </button>
</div>
```

par :

```tsx
<div className="onb-btnrow">
  <button type="button" className="onb-back" onClick={retour}>
    Retour
  </button>
  <button type="button" className="onb-next" onClick={() => aller(5)}>
    Continuer <Icon name="chev-right" size={14} />
  </button>
</div>
```

et le hint migration de l'étape 2 (« Ensuite : objectif puis compléments & régime (2 écrans rapides). ») devient : « Ensuite : objectif, personnalisation puis maison &amp; courses. ».

3h. Étape 5 — après le bloc `{step === 4 && (…)}`, ajouter :

```tsx
{step === 5 && (
  <>
    <h1>Maison &amp; courses</h1>
    <p className="onboarding-sub">
      Dernière étape — pour les listes, le budget et les prochains cycles. Tout est optionnel.
    </p>
    <div className="onboarding-field">
      <label htmlFor="ob-magasin">Magasin habituel</label>
      <input
        id="ob-magasin"
        list="ob-magasins"
        placeholder="Lidl, Intermarché…"
        value={magasin}
        onChange={(e) => {
          setError(null);
          setMagasin(e.target.value);
        }}
      />
      <datalist id="ob-magasins">
        {MAGASINS_PRESETS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </div>
    <div className="onboarding-field">
      <label htmlFor="ob-budget">Budget max courses / semaine (€, optionnel)</label>
      <input
        id="ob-budget"
        inputMode="decimal"
        value={budgetMax}
        onChange={(e) => {
          setError(null);
          setBudgetMax(e.target.value);
        }}
      />
      <p className="onb-hint">
        Le plafond à ne pas dépasser — l'app compare l'estimé du menu et ce que tu paies vraiment.
      </p>
    </div>
    <div className="onb-row2">
      <div className="onboarding-field">
        <label htmlFor="ob-personnes">Personnes à table</label>
        <input
          id="ob-personnes"
          inputMode="numeric"
          value={personnes}
          onChange={(e) => {
            setError(null);
            setPersonnes(e.target.value);
          }}
        />
      </div>
      <div className="onboarding-field">
        <label htmlFor="ob-repas">Repas par jour</label>
        <input
          id="ob-repas"
          inputMode="numeric"
          value={repasJour}
          onChange={(e) => {
            setError(null);
            setRepasJour(e.target.value);
          }}
        />
      </div>
    </div>
    <p className="onb-label">Préférences pour les prochains cycles</p>
    <div className="chips">
      {PREFERENCES_PRESETS.map((preset) => {
        const on = preferences.some(
          (p) => normaliseComplement(p) === normaliseComplement(preset),
        );
        return (
          <button
            key={preset}
            type="button"
            className={`chip${on ? ' on' : ''}`}
            aria-pressed={on}
            onClick={() => basculerPreference(preset)}
          >
            {preset}
          </button>
        );
      })}
      {preferences
        .filter((p) => !PREFERENCES_PRESETS.some((preset) => preset === p))
        .map((p) => (
          <button
            key={p}
            type="button"
            className="chip on"
            aria-pressed="true"
            onClick={() => basculerPreference(p)}
          >
            {p}
          </button>
        ))}
    </div>
    <div className="addrow">
      <input
        value={nouvellePreference}
        maxLength={40}
        placeholder="Ajouter une préférence…"
        aria-label="Ajouter une préférence"
        onChange={(e) => {
          setError(null);
          setNouvellePreference(e.target.value);
        }}
      />
      <button type="button" onClick={ajouterPreference}>
        <Icon name="plus" size={13} /> Ajouter
      </button>
    </div>
    <button type="submit" className="onboarding-cta onb-full">
      C'est parti ! 🚀
    </button>
    <div className="onb-btnrow">
      <button type="button" className="onb-back" onClick={retour}>
        Retour
      </button>
    </div>
  </>
)}
```

(+ `MAGASINS_PRESETS, PREFERENCES_PRESETS` aux imports de `../lib/model`.)

3i. CSS — dans `src/index.css`, à côté des styles onboarding :

```css
.onb-row2 {
  display: flex;
  gap: 10px;
}
.onb-row2 .onboarding-field {
  flex: 1;
  min-width: 0;
}
```

- [ ] **Step 4: Vérifier le vert**

Run: `npx vitest run tests/app.test.tsx` puis `npm test && npm run typecheck && npm run lint`
Expected: PASS (y compris les describes onboarding du chantier 2 restés verts après adaptation des 2 tests déplacés).

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/Onboarding.tsx src/index.css tests/app.test.tsx
git commit -m "feat: onboarding 5e étape Maison & courses — magasin, budget, foyer, préférences"
```

---

### Task 8 : ProfilScreen — section Maison & courses + Génération IA

**Files:**
- Modify: `src/components/ProfilScreen.tsx` (code final du plan chantier 2, Task 6)
- Modify: `src/index.css`
- Test: `tests/profil-screen.test.tsx`

- [ ] **Step 1: Tests (rouge)** — dans `tests/profil-screen.test.tsx` (helper profil post-2 du chantier 2, ex. `profilMarc`), ajouter :

```tsx
describe('ProfilScreen — Maison & courses', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('préremplit les champs depuis le profil et propose le datalist magasins', () => {
    render(
      <ProfilScreen
        profile={{
          ...profilMarc,
          magasin: 'Lidl',
          budgetMax: 40,
          preferences: ['Healthy', 'Rapide'],
          personnes: 4,
          repasJour: 3,
        }}
        onBack={() => {}}
        onChangeProfile={() => {}}
        onImported={() => {}}
      />,
    );

    expect(screen.getByLabelText('Magasin habituel')).toHaveValue('Lidl');
    expect(screen.getByLabelText('Magasin habituel')).toHaveAttribute('list');
    expect(screen.getByLabelText('Budget max courses / semaine (€)')).toHaveValue(40);
    expect(screen.getByLabelText('Personnes à table')).toHaveValue(4);
    expect(screen.getByLabelText('Repas par jour')).toHaveValue(3);
    expect(screen.getByRole('button', { name: /Retirer Healthy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retirer Rapide/ })).toBeInTheDocument();
  });

  it('enregistre la section (validation incluse)', async () => {
    const user = userEvent.setup();
    render(
      <ProfilScreen profile={profilMarc} onBack={() => {}} onChangeProfile={() => {}} onImported={() => {}} />,
    );

    await user.type(screen.getByLabelText('Magasin habituel'), 'Lidl');
    await user.type(screen.getByLabelText('Budget max courses / semaine (€)'), '40');
    await user.click(screen.getByRole('button', { name: /Ajouter/ })); // sans saisir → no-op
    await user.type(screen.getByLabelText('Ajouter une préférence'), 'Batch-friendly');
    await user.click(screen.getByRole('button', { name: /Ajouter/ }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer maison & courses' }));

    expect(loadProfile()).toEqual(
      expect.objectContaining({ magasin: 'Lidl', budgetMax: 40, preferences: ['Batch-friendly'] }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(/Enregistré/);
  });

  it('refuse un budget max invalide', async () => {
    const user = userEvent.setup();
    render(
      <ProfilScreen profile={profilMarc} onBack={() => {}} onChangeProfile={() => {}} onImported={() => {}} />,
    );

    await user.type(screen.getByLabelText('Budget max courses / semaine (€)'), '0');
    await user.click(screen.getByRole('button', { name: 'Enregistrer maison & courses' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Budget max invalide/i);
    expect(loadProfile()).toBeNull();
  });
});

describe('ProfilScreen — Génération IA', () => {
  beforeEach(() => {
    localStorage.clear();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('est masqué quand aucune donnée maison n est renseignée', () => {
    render(
      <ProfilScreen profile={profilMarc} onBack={() => {}} onChangeProfile={() => {}} onImported={() => {}} />,
    );

    expect(screen.queryByRole('button', { name: /Copier les paramètres IA/ })).not.toBeInTheDocument();
  });

  it('copie le bloc paramètres avec confirmation', async () => {
    const user = userEvent.setup();
    render(
      <ProfilScreen
        profile={{ ...profilMarc, magasin: 'Lidl', budgetMax: 40, personnes: 4, repasJour: 3, regime: 'keto' }}
        onBack={() => {}}
        onChangeProfile={() => {}}
        onImported={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Copier les paramètres IA/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      [
        '- Magasin : Lidl',
        '- Budget courses / semaine : 40,00 €',
        '- Personnes à table : 4 · 3 repas/jour',
        '- Régime : keto',
      ].join('\n'),
    );
    expect(screen.getByText(/Paramètres copiés/)).toBeInTheDocument();
  });
});
```

NB : adapter le nom du helper profil du fichier (`profilMarc` ou équivalent créé par le chantier 2 — conserver le nom réel). Si le fichier ne rend pas `ProfilScreen` avec ce set de props, recopier la signature du fichier (plan chantier 2, Task 6 : `profile, onBack, onChangeProfile, onProfileSaved?, onImported` — `onProfileSaved` optionnel).

- [ ] **Step 2: Vérifier le rouge**

Run: `npx vitest run tests/profil-screen.test.tsx`
Expected: FAIL — sections introuvables.

- [ ] **Step 3: Implémenter** — dans `src/components/ProfilScreen.tsx` :

3a. Type `Section` :

```tsx
type Section = 'infos' | 'objectif' | 'complements' | 'regime' | 'maison';
```

3b. States (après `regime`) :

```tsx
const [magasin, setMagasin] = useState(profile.magasin ?? '');
const [budgetMax, setBudgetMax] = useState(profile.budgetMax != null ? String(profile.budgetMax) : '');
const [personnes, setPersonnes] = useState(profile.personnes != null ? String(profile.personnes) : '');
const [repasJour, setRepasJour] = useState(profile.repasJour != null ? String(profile.repasJour) : '');
const [preferences, setPreferences] = useState<string[]>([...(profile.preferences ?? [])]);
const [nouvellePreference, setNouvellePreference] = useState('');
const [copie, setCopie] = useState(false);
```

3c. Bloc IA — fonction module-level (au-dessus du composant) :

```tsx
// Bloc « Paramètres » recopié dans le prompt de génération de cycle.
// Une ligne par donnée présente ; régime omis si aucun ; null si rien.
const paramsIaTexte = (p: UserProfile): string | null => {
  const lignes: string[] = [];
  if (p.magasin) lignes.push(`- Magasin : ${p.magasin}`);
  if (p.budgetMax != null) lignes.push(`- Budget courses / semaine : ${formatEuro(p.budgetMax)}`);
  if (p.personnes != null || p.repasJour != null) {
    const parties: string[] = [];
    if (p.personnes != null) parties.push(`${p.personnes}`);
    if (p.repasJour != null) parties.push(`${p.repasJour} repas/jour`);
    lignes.push(`- Personnes à table : ${parties.join(' · ')}`);
  }
  if (p.preferences && p.preferences.length > 0) {
    lignes.push(`- Préférences : ${p.preferences.map((x) => x.toLowerCase()).join(', ')}`);
  }
  if (p.regime !== 'aucun') lignes.push(`- Régime : ${p.regime}`);
  return lignes.length > 0 ? lignes.join('\n') : null;
};
```

(+ `import { formatEuro } from '../lib/prix';` et `MAGASINS_PRESETS` aux imports de `../lib/model`.)

3d. Handlers (après `enregistrerRegime`) :

```tsx
const enregistrerMaison = () => {
  const bud = budgetMax ? parseEuro(budgetMax) : undefined;
  if (budgetMax && (bud === null || bud > 10000)) {
    setError('Budget max invalide : entre un montant en euros (ex. 40).');
    return;
  }
  const pers = personnes ? Number.parseInt(personnes, 10) : undefined;
  if (personnes && (pers === undefined || pers < 1 || pers > 12)) {
    setError('Personnes à table : entre 1 et 12.');
    return;
  }
  const repas = repasJour ? Number.parseInt(repasJour, 10) : undefined;
  if (repasJour && (repas === undefined || repas < 1 || repas > 12)) {
    setError('Repas par jour : entre 1 et 12.');
    return;
  }
  setError(null);
  maj('maison', {
    ...(magasin.trim() ? { magasin: magasin.trim() } : {}),
    ...(bud != null ? { budgetMax: bud } : {}),
    ...(preferences.length > 0 ? { preferences: [...preferences] } : {}),
    ...(pers != null ? { personnes: pers } : {}),
    ...(repas != null ? { repasJour: repas } : {}),
  });
};

const ajouterPreference = () => {
  const v = nouvellePreference.trim().slice(0, 40);
  if (!v) return;
  if (preferences.some((p) => normaliseComplement(p) === normaliseComplement(v))) {
    setError('Cette préférence est déjà sélectionnée.');
    return;
  }
  setError(null);
  setPreferences([...preferences, v]);
  setNouvellePreference('');
};

const copierParametres = async () => {
  const texte = paramsIaTexte(profile);
  if (!texte) return;
  try {
    await navigator.clipboard.writeText(texte);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texte;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  setCopie(true);
};
```

(+ `import { parseEuro } from '../lib/prix';`.)

3e. Sections JSX — entre la section Régime et la section Semaine, insérer :

```tsx
<section className="profile-section">
  <h3>Maison &amp; courses</h3>
  <div className="onboarding-field">
    <label htmlFor="pf-magasin">Magasin habituel</label>
    <input
      id="pf-magasin"
      list="pf-magasins"
      placeholder="Lidl, Intermarché…"
      value={magasin}
      onChange={(e) => {
        setSavedSection(null);
        setError(null);
        setMagasin(e.target.value);
      }}
    />
    <datalist id="pf-magasins">
      {MAGASINS_PRESETS.map((m) => (
        <option key={m} value={m} />
      ))}
    </datalist>
  </div>
  <div className="onboarding-field">
    <label htmlFor="pf-budget">Budget max courses / semaine (€)</label>
    <input
      id="pf-budget"
      inputMode="decimal"
      value={budgetMax}
      onChange={(e) => {
        setSavedSection(null);
        setError(null);
        setBudgetMax(e.target.value);
      }}
    />
  </div>
  <div className="onb-row2">
    <div className="onboarding-field">
      <label htmlFor="pf-personnes">Personnes à table</label>
      <input
        id="pf-personnes"
        inputMode="numeric"
        value={personnes}
        onChange={(e) => {
          setSavedSection(null);
          setError(null);
          setPersonnes(e.target.value);
        }}
      />
    </div>
    <div className="onboarding-field">
      <label htmlFor="pf-repas">Repas par jour</label>
      <input
        id="pf-repas"
        inputMode="numeric"
        value={repasJour}
        onChange={(e) => {
          setSavedSection(null);
          setError(null);
          setRepasJour(e.target.value);
        }}
      />
    </div>
  </div>
  <div className="chips">
    {preferences.map((p) => (
      <button
        key={p}
        type="button"
        className="chip"
        onClick={() => {
          setSavedSection(null);
          setPreferences(preferences.filter((x) => x !== p));
        }}
      >
        {p}
        <span className="rm" aria-hidden="true">
          ✕
        </span>
        <span className="sr-only">{`Retirer ${p}`}</span>
      </button>
    ))}
  </div>
  <div className="addrow">
    <input
      value={nouvellePreference}
      maxLength={40}
      placeholder="Ajouter une préférence…"
      aria-label="Ajouter une préférence"
      onChange={(e) => {
        setError(null);
        setNouvellePreference(e.target.value);
      }}
    />
    <button type="button" onClick={ajouterPreference}>
      <Icon name="plus" size={13} /> Ajouter
    </button>
  </div>
  <button type="button" className="btn profil-save" onClick={enregistrerMaison}>
    Enregistrer maison &amp; courses
  </button>
  {fil('maison')}
</section>

<section className="profile-section">
  <h3>Génération IA</h3>
  {paramsIaTexte(profile) !== null && (
    <>
      <p className="onb-hint">
        Ces réglages complètent les « Paramètres » du prompt de génération de cycle — recopie-les d'un geste.
      </p>
      <button type="button" className="profil-ghost" onClick={copierParametres}>
        Copier les paramètres IA
      </button>
      {copie && (
        <p className="muted" role="status">
          Paramètres copiés ✓ — colle-les dans le prompt.
        </p>
      )}
    </>
  )}
</section>
```

3f. CSS — dans `src/index.css` (`.onb-row2` existe déjà depuis la Task 7) :

```css
.profil-ghost {
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 999px;
  width: 100%;
  min-height: 48px;
  font: 600 13px Poppins, sans-serif;
  cursor: pointer;
}
```

- [ ] **Step 4: Vérifier le vert**

Run: `npx vitest run tests/profil-screen.test.tsx` puis `npm test && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfilScreen.tsx src/index.css tests/profil-screen.test.tsx
git commit -m "feat: écran Profil — section Maison & courses + Copier les paramètres IA"
```

---

### Task 9 : e2e, docs, gates

**Files:**
- Modify: `tests/e2e/onboarding-mobile.spec.ts`, `tests/e2e/cuisine.spec.ts`
- Modify: `AGENTS.md`, `CHANGELOG.md`
- Optionnel: `ai/context/design-system.md` (si divergence)

- [ ] **Step 1: e2e onboarding 5 étapes** — dans `tests/e2e/onboarding-mobile.spec.ts` :
  - Renommer le describe `Onboarding 4 étapes — mobile` → `Onboarding 5 étapes — mobile`.
  - Dans le test « parcours complet », après l'étape Personnalisation (`Créatine` + `Keto`), remplacer le clic « C'est parti » par : `await page.getByRole('button', { name: /Continuer/ }).click();` puis :

```ts
await expect(page.getByRole('heading', { name: /Maison & courses/ })).toBeVisible();
await assertPasDeDebordement(page);
await page.getByLabel('Magasin habituel').fill('Lidl');
await page.getByLabel('Budget max courses / semaine').fill('40');
await page.getByRole('button', { name: /C'est parti/ }).click();
```

  - Vérifier le fil d'Ariane final du test (shell attendu après `C'est parti`) — conserver les assertions existantes.

- [ ] **Step 2: e2e courses & dépenses** — dans `tests/e2e/cuisine.spec.ts`, étendre le storageState du(des) test(s) concernés : au profil v2 existant, ajouter `"magasin": "Lidl", "budgetMax": 40` et ajouter la paire :

```ts
{
  name: 'sportapp:depenses',
  value: JSON.stringify([
    { date: '2026-09-09', magasin: 'Lidl', total: 38.2 },
  ]),
},
```

⚠️ La date du seed doit tomber dans la semaine affichée par le storageState (`sportapp:weeks` de ce spec) — si le spec pose une semaine différente, aligner la date de la dépense sur `du..au` de cette semaine (la carte affiche « Payé cette semaine » seulement pour des dates dans [du..au]).

Puis ajouter le test :

```ts
test('carte budget + saisie d une dépense → historique', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Budget courses')).toBeVisible();
  await expect(page.getByText('38,20 €')).toBeVisible();

  await page.getByRole('button', { name: /Total payé/ }).click();
  await expect(page.getByRole('heading', { name: /Mes dépenses réelles/ })).toBeVisible();
  await page.getByLabel('Total (€)').fill('35,10');
  await page.getByLabel('Magasin').fill('Carrefour');
  await page.getByRole('button', { name: /Enregistrer/ }).click();
  await expect(page.getByText('Enregistré ✓')).toBeVisible();
  await page.getByRole('button', { name: /Retour/ }).first().click();
  // Deux magasins → deux lignes, aucun upsert croisé (même si la date du jour
  // coïncide avec le seed) :
  await expect(page.getByText('38,20 €')).toBeVisible();
  await expect(page.getByText('35,10 €')).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
```

(La saisie utilise un magasin **différent** du seed : le test reste correct quel que soit le jour du run — si la date du jour égale la date du seed avec le même magasin, `saveDepense` ferait un upsert et remplacerait le total au lieu d'ajouter.)

- [ ] **Step 3: Lancer les e2e**

Run: `npm run e2e`
Expected: PASS sur les projets 375 + 320 (zéro débordement). Si `npx playwright install webkit chromium` est demandé, l'installer.

- [ ] **Step 4: Docs** — dans `AGENTS.md` :
  - Section « Chantiers en cours » : **retirer le chantier 3** (livré) — la section conserve les chantiers restants (1 et 2 s'ils ne sont pas encore livrés) et disparaît entièrement quand tout est livré.
  - Section « Le projet » : « onboarding en 2 étapes » → « onboarding en 5 étapes » (profil, infos, objectif, personnalisation, maison & courses) et mentionner la clé.
  - Section « Storage (localStorage) » : ajouter la ligne :

```markdown
- `sportapp:depenses` — dépenses réelles de courses (`[{ date, magasin, total }]`, trié par date desc, upsert par (date, magasin))
```

et dans la ligne `sportapp:profile` : shape v2.1 avec `magasin?, budgetMax?, preferences?, personnes?, repasJour?`.

- [ ] **Step 5: CHANGELOG** — dans `CHANGELOG.md`, section `[Non publié]` :

```markdown
### Ajouts
- Maison & courses : magasin habituel, budget courses (estimé du menu vs payé réel vs max hebdo), dépenses réelles avec historique et comparatif par magasin, préférences de plats, taille du foyer (personnes, repas/jour) — collectés à l'onboarding (5e étape), modifiables au Profil
- Carte « Budget courses » dans l'onglet Courses (estimé ≈ / payé cette semaine / budget max, barre et alerte de dépassement)
- « Copier les paramètres IA » : le bloc Paramètres du prompt de génération se copie d'un geste
```

- [ ] **Step 6: Gates complets**

Run: `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e`
Expected: tout vert. `npm run build && npm run preview` spot-check : la carte budget s'affiche sur le build de prod (le service worker garde l'ancien cache — forcer un reload).

- [ ] **Step 7: Commit + push**

```bash
git add AGENTS.md CHANGELOG.md tests/e2e/onboarding-mobile.spec.ts tests/e2e/cuisine.spec.ts
git commit -m "test+docs: e2e 5 étapes et dépenses, AGENTS/CHANGELOG maison & courses"
git push origin main
```

(Pousser déclenche le déploiement Pages — tout est vert localement avant.)

---

## Self-review (fait à l'écriture)

1. **Couverture spec** : § 1 model+storage (T1-T2) · § 2 onboarding/profil (T7-T8) · § 3 carte+panneau (T4-T6) · § 4 copie IA + prix (T3, T8) · § 5 validation (T2, T5, T7, T8) · § 6 tests (tous) · § 7 fichiers (mappés) · § 9 vérifications (T9). Le matériel et les listes adaptées sont hors périmètre (spec § 8).
2. **Placeholders** : aucun TBD/TODO, aucune ligne corrompue (vérifié au grep `dangereux|photographe|под`).
3. **Cohérence des noms** : `MAGASINS_PRESETS`/`PREFERENCES_PRESETS`/`DepenseEntry` (T1) ↔ storage (T2) ↔ composants (T4-T8) ; `getDepenses/saveDepense/deleteDepense` ; `formatEuro/parseEuro` ; `focusTotal` ; `paramsIaTexte` ; boutons `Enregistrer maison & courses` (T8) cohérents entre test et implémentation.
