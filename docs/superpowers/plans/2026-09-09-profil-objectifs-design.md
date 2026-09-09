# Profil & objectifs — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profil v2 (date de naissance, objectif 4 types + échéance, compléments, régime), onboarding 4 étapes avec migration préremplie, bloc Objectif en tête de Mon suivi, stat-cards réduites à Poids, séances en liste libre.

**Architecture:** Même clé `sportapp:profile`, shape réécrit (`UserProfile` v2) ; l'ancienne forme est lue par `loadProfilLegacy()` (read-only) pour préremplir l'onboarding de migration, qui écrase la clé au save (migration à sens unique). Logique pure dans `src/lib/` (model, storage, dates), composants présentatifs ; CSS sémantique dans `src/index.css`.

**Tech Stack:** React 18 + TS strict, vitest + Testing Library (happy-dom), Playwright (375/320), CSS sémantique sans framework.

**Prérequis : le plan Herbes (`2026-09-09-refonte-herbes-design.md`) doit être exécuté AVANT** — ce plan réutilise `src/components/Icon.tsx` (`Icon`, `IconName`), le prop `renderLabel` de `Checklist`, les tokens Herbes (`--accent` basilic, `--accent-2` citron, `--surface-2`, `--radius` 18px) et la nav segmented.

**Maquette de référence (validée, fait foi) :** `docs/superpowers/mockups/profil-objectifs-v6.html` — onboarding 4 étapes, migration préremplie, bloc Objectif (interrupteurs de variantes), carte Poids hero, séances avec pastilles « conseillé », écran Profil. Spec : `docs/superpowers/specs/2026-09-09-profil-objectifs-design.md`.

**Décisions clés (firmées en brainstorming) :**
- `kcalObjectif` **disparaît** (plus de saisie, plus d'affichage) ; `age` → `dateNaissance` (AAAA-MM-JJ).
- Migration **forcée** : profil v1 détecté → onboarding prérempli (étape 2 directe, poids = dernière pesée, date de naissance à compléter, profil non modifiable).
- Objectif 4 types : perte / affiner / masse / maintien + échéance optionnelle ; compléments presets + libre ; régime descriptif mono-valeur.
- Stat-cards : **carte Poids seule**, pleine largeur, delta en **kg** (« ▼ -0,7 kg vs 7 jours ») — les cartes Courses / Kcal du jour / Séances sont supprimées. `kcalDuJour` sort de `stats.ts` ; `trouverJourDuJour` **reste** (MenuView l'utilise).
- Séances : liste libre à cocher, le préfixe jour du libellé .md devient une pastille « conseillé lun. » — ids de coches inchangés.
- Boutons : rangée `Retour` (fantôme) + `Continuer` (basilic, chevron) ; dernier écran `C'est parti ! 🚀` pleine largeur.

**Règles repo rappelées :** TDD (rouge → vert → commit), texte utilisateur en français, `localStorage.clear()` en `beforeEach`, fake timers `vi.setSystemTime(new Date('…T10:00:00'))` (forme avec heure) + `vi.useRealTimers()`, `fireEvent.submit` pour soumettre un form sous happy-dom, cibles tactiles ≥ 48 px, zéro débordement horizontal 320/375. Avant chaque commit : `npm test && npm run typecheck && npm run lint` (build + e2e aux tâches 7-8).

---

### Task 1 : Dates — helpers âge, échéance, jour

Fichiers : `src/lib/dates.ts`, `tests/lib/dates.test.ts` (nouveau).

- [ ] **Step 1: Écrire les tests (rouge)** — `tests/lib/dates.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ageDepuis,
  extraireJourLabel,
  formatJourMoisCourt,
  jourAbrege,
  joursRestants,
} from '../../src/lib/dates';

describe('dates: ageDepuis', () => {
  afterEach(() => vi.useRealTimers());

  it('calcule l âge atteint quand l anniversaire est passé', () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00'));
    expect(ageDepuis('1985-04-12')).toBe(41);
  });

  it("ne compte pas l'anniversaire pas encore atteint", () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00'));
    expect(ageDepuis('1985-12-01')).toBe(40);
  });

  it("compte l'anniversaire le jour même", () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00'));
    expect(ageDepuis('1990-09-09')).toBe(36);
  });
});

describe('dates: joursRestants', () => {
  afterEach(() => vi.useRealTimers());

  it('compte les jours jusqu à une échéance future', () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00'));
    expect(joursRestants('2026-12-15')).toBe(97);
  });

  it('retourne 0 le jour même', () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00'));
    expect(joursRestants('2026-09-09')).toBe(0);
  });

  it('retourne un nombre négatif si dépassée', () => {
    vi.setSystemTime(new Date('2026-09-09T10:00:00'));
    expect(joursRestants('2026-06-15')).toBe(-86);
  });
});

describe('dates: formatJourMoisCourt', () => {
  it('formate en jour + mois abrégé français', () => {
    expect(formatJourMoisCourt('2026-12-15')).toBe('15 déc.');
    expect(formatJourMoisCourt('2026-06-01')).toBe('1 juin');
    expect(formatJourMoisCourt('2026-02-03')).toBe('3 févr.');
  });
});

describe('dates: jourAbrege', () => {
  it('abrège les 7 jours', () => {
    expect(jourAbrege('lundi')).toBe('lun.');
    expect(jourAbrege('mercredi')).toBe('mer.');
    expect(jourAbrege('jeudi')).toBe('jeu.');
    expect(jourAbrege('vendredi')).toBe('ven.');
    expect(jourAbrege('samedi')).toBe('sam.');
    expect(jourAbrege('dimanche')).toBe('dim.');
    expect(jourAbrege('mardi')).toBe('mar.');
  });

  it('ignore la casse et rend le jour tel quel si inconnu', () => {
    expect(jourAbrege('Lundi')).toBe('lun.');
    expect(jourAbrege('inconnu')).toBe('inconnu');
  });
});

describe('dates: extraireJourLabel', () => {
  it('extrait le préfixe jour et le reste du libellé', () => {
    expect(extraireJourLabel('Lundi — Muscu libre 10h30 + navette vélo')).toEqual({
      jour: 'lundi',
      reste: 'Muscu libre 10h30 + navette vélo',
    });
  });

  it('accepte le tiret simple et les espaces', () => {
    expect(extraireJourLabel('Mardi - Pilates')).toEqual({ jour: 'mardi', reste: 'Pilates' });
  });

  it('ne coupe pas un libellé sans préfixe jour', () => {
    expect(extraireJourLabel('Full body')).toEqual({ jour: null, reste: 'Full body' });
  });
});
```

- [ ] **Step 2: Vérifier le rouge** — `npx vitest run tests/lib/dates.test.ts` → FAIL (exports inexistants).
- [ ] **Step 3: Implémenter** — ajouter à `src/lib/dates.ts` (à la suite de `formatDayMonth`) :

```ts
const MOIS_ABBR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// Âge atteint, calculé en heure locale (split, jamais de new Date sur une date seule).
export const ageDepuis = (dateNaissance: string): number => {
  const [y, m, d] = dateNaissance.split('-').map(Number);
  const now = new Date();
  const moisNow = now.getMonth() + 1;
  const jourNow = now.getDate();
  let age = now.getFullYear() - y;
  if (moisNow < m || (moisNow === m && jourNow < d)) age -= 1;
  return age;
};

// Jours jusqu'à l'échéance, signé (négatif = dépassée). Calcul local date-only.
export const joursRestants = (echeance: string): number => {
  const [y, m, d] = echeance.split('-').map(Number);
  const now = new Date();
  const aujourdhui = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cible = new Date(y, m - 1, d);
  return Math.round((cible.getTime() - aujourdhui.getTime()) / 86_400_000);
};

// '2026-12-15' -> '15 déc.' (bloc objectif).
export const formatJourMoisCourt = (iso: string): string => {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${MOIS_ABBR[Number(m) - 1] ?? ''}`.trim();
};

const JOURS_ABBR: Record<string, string> = {
  lundi: 'lun.',
  mardi: 'mar.',
  mercredi: 'mer.',
  jeudi: 'jeu.',
  vendredi: 'ven.',
  samedi: 'sam.',
  dimanche: 'dim.',
};

export const jourAbrege = (jour: string): string => JOURS_ABBR[jour.toLowerCase()] ?? jour.toLowerCase();

const JOUR_PREFIXE_RE = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*[—–-]\s*(.+)$/i;

// 'Lundi — Muscu libre' -> { jour: 'lundi', reste: 'Muscu libre' } ; sans jour -> jour null.
export const extraireJourLabel = (label: string): { jour: string | null; reste: string } => {
  const m = label.match(JOUR_PREFIXE_RE);
  return m ? { jour: m[1].toLowerCase(), reste: m[2].trim() } : { jour: null, reste: label };
};
```

- [ ] **Step 4: Vert** — `npx vitest run tests/lib/dates.test.ts` → PASS, puis `npm test && npm run typecheck && npm run lint` verts.
- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts tests/lib/dates.test.ts
git commit -m "feat: dates — helpers âge/échéance/jour abrégé pour le profil v2"
```

---

### Task 2 : Model — fondations v2 (additif)

Fichier : `src/lib/model.ts`. Ajouts uniquement — `UserProfile` (v1) reste en place, la bascule se fait en Task 4. Les icônes référencées existent dans l'`ICONS` d'`Icon.tsx` (prérequis Herbes) et sont sous-ensembles de `IconName`.

- [ ] **Step 1: Ajouter les types et constantes** — à la fin de `src/lib/model.ts` (après `PRENOMS`) :

```ts
// ——— Profil v2 (objectif, compléments, régime) ———

export type ObjectifType = 'perte' | 'affiner' | 'masse' | 'maintien';
export type Regime = 'keto' | 'vegetarien' | 'vegan' | 'sans-gluten' | 'aucun';

export interface Objectif {
  type: ObjectifType;
  echeance?: string; // AAAA-MM-JJ, optionnelle
}

// Ancienne forme stockée avant migration — lecture seule, préremplissage only.
export interface ProfilLegacy {
  id: ProfileKey;
  age: number;
  taille: number;
  poidsObjectif?: number;
  kcalObjectif?: number; // conservé pour le type legacy, ignoré au préremplissage
}

export const OBJECTIF_TYPES: Array<{ id: ObjectifType; nom: string; desc: string; icone: 'scale' | 'flame' | 'meat' | 'target' }> = [
  { id: 'perte', nom: 'Perte de poids', desc: 'Réduire progressivement, sans yoyo', icone: 'scale' },
  { id: 'affiner', nom: 'Affiner', desc: 'Recomposition : même poids, moins de gras', icone: 'flame' },
  { id: 'masse', nom: 'Prise de masse', desc: 'Prendre du muscle, avec la mangeoire qui va bien', icone: 'meat' },
  { id: 'maintien', nom: 'Maintien', desc: 'Stabiliser ce qui est en place', icone: 'target' },
];

export const REGIMES: Array<{ id: Regime; nom: string }> = [
  { id: 'keto', nom: 'Keto' },
  { id: 'vegetarien', nom: 'Végétarien' },
  { id: 'vegan', nom: 'Vegan' },
  { id: 'sans-gluten', nom: 'Sans gluten' },
  { id: 'aucun', nom: 'Aucun' },
];

export const COMPLEMENTS_PRESETS = ['Whey', 'Créatine', 'Oméga-3', 'Collagène', 'Magnésium', 'Vitamine D'];

// Comparaison insensible casse/accents pour dédoublonner les compléments.
export const normaliseComplement = (s: string): string =>
  s.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
```

- [ ] **Step 2: Vérifier** — `npm test && npm run typecheck && npm run lint` verts (ajout pur, rien ne casse).
- [ ] **Step 3: Commit**

```bash
git add src/lib/model.ts
git commit -m "feat: model — types objectif/régime/compléments + constantes partagées (profil v2)"
```

---

### Task 3 : Storage — lecture de l'ancienne forme

Fichiers : `src/lib/storage.ts`, `tests/storage.test.ts`. Lecture **read-only** (pas de remove, pas de warn — une donnée ancienne n'est pas corrompue) : l'écrasement se fera au `saveProfile` v2 (Task 4).

- [ ] **Step 1: Écrire les tests (rouge)** — dans `tests/storage.test.ts`, nouveau bloc après le describe `profil corrompu` :

```ts
describe('storage: loadProfilLegacy (ancienne forme age)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lit l ancienne forme {id, age, taille}', () => {
    localStorage.setItem('sportapp:profile', JSON.stringify({ id: 'marc', age: 41, taille: 178 }));
    expect(loadProfilLegacy()).toEqual({ id: 'marc', age: 41, taille: 178 });
  });

  it('lit les objectifs optionnels de l ancienne forme', () => {
    localStorage.setItem(
      'sportapp:profile',
      JSON.stringify({ id: 'melanie', age: 38, taille: 165, poidsObjectif: 62, kcalObjectif: 1450 }),
    );
    expect(loadProfilLegacy()).toEqual({
      id: 'melanie',
      age: 38,
      taille: 165,
      poidsObjectif: 62,
      kcalObjectif: 1450,
    });
  });

  it('retourne null sur la nouvelle forme v2 (pas un legacy)', () => {
    localStorage.setItem(
      'sportapp:profile',
      JSON.stringify({
        id: 'marc',
        dateNaissance: '1985-04-12',
        taille: 178,
        objectif: { type: 'perte' },
        complements: [],
        regime: 'aucun',
      }),
    );
    expect(loadProfilLegacy()).toBeNull();
  });

  it('retourne null si absent ou corrompu (silencieux, clé conservée)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadProfilLegacy()).toBeNull();
    localStorage.setItem('sportapp:profile', '{oops');
    expect(loadProfilLegacy()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBe('{oops');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('ne touche pas à la clé (migration à l enregistrement, pas à la lecture)', () => {
    localStorage.setItem('sportapp:profile', JSON.stringify({ id: 'marc', age: 41, taille: 178 }));
    loadProfilLegacy();
    expect(JSON.parse(localStorage.getItem('sportapp:profile')!)).toEqual({
      id: 'marc',
      age: 41,
      taille: 178,
    });
  });
});
```

Ajouter l'import en tête du fichier : `loadProfilLegacy` rejoint les imports existants de `../src/lib/storage`.

- [ ] **Step 2: Vérifier le rouge** — `npx vitest run tests/storage.test.ts` → FAIL (`loadProfilLegacy` n'existe pas).
- [ ] **Step 3: Implémenter** — dans `src/lib/storage.ts`, importer `ProfilLegacy` (type, depuis `./model`) et ajouter après `loadProfile` :

```ts
// Ancienne forme du profil ({age}) — lecture read-only pour préremplir
// l'onboarding de migration. Pas de warn ni de remove : la clé est écrasée
// par le saveProfile v2, pas avant.
export const loadProfilLegacy = (): ProfilLegacy | null => {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw === null) return null;
  const parsed = safeParse<unknown>(PROFILE_KEY, raw, null);
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const optionalNum = (v: unknown): boolean => v === undefined || isNum(v);
  const ok =
    isPlainObject(parsed) &&
    (parsed.id === 'marc' || parsed.id === 'melanie') &&
    isNum(parsed.age) &&
    isNum(parsed.taille) &&
    optionalNum(parsed.poidsObjectif) &&
    optionalNum(parsed.kcalObjectif);
  return ok ? (parsed as unknown as ProfilLegacy) : null;
};
```

- [ ] **Step 4: Vert** — `npx vitest run tests/storage.test.ts` → PASS, puis `npm test && npm run typecheck && npm run lint` verts.
- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts tests/storage.test.ts
git commit -m "feat: storage — loadProfilLegacy lit l ancienne forme du profil (read-only)"
```

---

### Task 4 : Bascule profil v2 — storage strict, onboarding 4 étapes, migration, carte Poids

La tâche pivot : `UserProfile` est réécrit (v2), `loadProfile` devient strict, l'onboarding passe à 4 étapes avec mode migration, la carte Poids remplace les 4 stat-cards. Tout doit être vert au commit final (les étapes intermédiaires cassent volontairement le typecheck — on ne commit qu'à la fin).

**Fichiers :** `src/lib/model.ts`, `src/lib/storage.ts`, `src/lib/stats.ts`, `src/components/StatCards.tsx`, `src/components/onboarding/Onboarding.tsx`, `src/components/ProfilScreen.tsx` (correctif mécanique), `src/components/Icon.tsx` (icône `plus`), `src/App.tsx`, `src/index.css`, `tests/storage.test.ts`, `tests/stats.test.ts`, `tests/components.test.tsx`, `tests/onboarding.test.tsx`, `tests/profil-screen.test.tsx`, `tests/app.test.tsx`.

- [ ] **Step 1: Model — remplacer `UserProfile` par la v2** — dans `src/lib/model.ts`, remplacer le bloc :

```ts
export interface UserProfile {
  id: ProfileKey;
  age: number;
  taille: number;
  poidsObjectif?: number;
  kcalObjectif?: number;
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
}
```

(`kcalObjectif` disparaît : plus collecté, plus affiché — décision maquette v2. Le typecheck va lever des erreurs partout : c'est attendu, on ne commit pas.)

- [ ] **Step 2: Storage — réécrire les tests (rouge)** — dans `tests/storage.test.ts`, remplacer **les deux describes** `storage: profil` (lignes 189-241) et `storage: profil corrompu` (243-288) par :

```ts
describe('storage: profil v2', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const profilV2Complet: UserProfile = {
    id: 'marc',
    dateNaissance: '1985-04-12',
    taille: 178,
    poidsObjectif: 74,
    objectif: { type: 'perte', echeance: '2026-12-15' },
    complements: ['Whey', 'Créatine'],
    regime: 'aucun',
  };

  it('loadProfile returns null silently when nothing saved (no warn, no remove)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadProfile()).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('saveProfile then loadProfile roundtrips the profile v2', () => {
    saveProfile(profilV2Complet);
    expect(loadProfile()).toEqual(profilV2Complet);
    saveProfile({ ...profilV2Complet, id: 'melanie', dateNaissance: '1987-03-02', taille: 165 });
    expect(loadProfile()).toEqual({
      ...profilV2Complet,
      id: 'melanie',
      dateNaissance: '1987-03-02',
      taille: 165,
    });
  });

  it('les champs optionnels (poidsObjectif, echeance) restent optionnels', () => {
    const minimal: UserProfile = {
      id: 'marc',
      dateNaissance: '1985-04-12',
      taille: 178,
      objectif: { type: 'maintien' },
      complements: [],
      regime: 'keto',
    };
    saveProfile(minimal);
    expect(loadProfile()).toEqual(minimal);
  });

  it('removeProfile removes the stored profile', () => {
    saveProfile(profilV2Complet);
    removeProfile();
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
  });

  it('un complément non string invalide le profil', () => {
    localStorage.setItem(
      'sportapp:profile',
      JSON.stringify({ ...profilV2Complet, complements: [42] }),
    );
    expect(loadProfile()).toBeNull();
  });
});

describe('storage: profil v2 corrompu', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const base: UserProfile = {
    id: 'marc',
    dateNaissance: '1985-04-12',
    taille: 178,
    objectif: { type: 'perte' },
    complements: [],
    regime: 'aucun',
  };

  const poser = (p: unknown) => localStorage.setItem('sportapp:profile', JSON.stringify(p));

  it('loadProfile returns null and removes corrupted JSON', () => {
    localStorage.setItem('sportapp:profile', '{oops');
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Profil corrompu ignoré : sportapp:profile');
  });

  it('refuse un id inconnu', () => {
    poser({ ...base, id: 'jean' });
    expect(loadProfile()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Profil corrompu ignoré : sportapp:profile');
  });

  it('refuse une dateNaissance non string', () => {
    poser({ ...base, dateNaissance: 1985 });
    expect(loadProfile()).toBeNull();
  });

  it('refuse un objectif manquant ou de type inconnu', () => {
    poser({ id: 'marc', dateNaissance: '1985-04-12', taille: 178, complements: [], regime: 'aucun' });
    expect(loadProfile()).toBeNull();
    poser({ ...base, objectif: { type: 'zigzag' } });
    expect(loadProfile()).toBeNull();
  });

  it('refuse un regime inconnu', () => {
    poser({ ...base, regime: 'carnivore' });
    expect(loadProfile()).toBeNull();
  });

  it('refuse des complements absents', () => {
    poser({ id: 'marc', dateNaissance: '1985-04-12', taille: 178, objectif: { type: 'perte' }, regime: 'aucun' });
    expect(loadProfile()).toBeNull();
  });

  it('loadProfile returns null and removes wrong shape (array, null)', () => {
    localStorage.setItem('sportapp:profile', '[1]');
    expect(loadProfile()).toBeNull();
    localStorage.setItem('sportapp:profile', 'null');
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem('sportapp:profile')).toBeNull();
  });
});
```

Ajouter `UserProfile` aux imports de type `../src/lib/model` en tête du fichier. Vérifier le rouge : `npx vitest run tests/storage.test.ts` → les nouveaux tests échouent (loadProfile v1 rejette la v2).

- [ ] **Step 3: Storage — `loadProfile` v2 strict** — dans `src/lib/storage.ts`, remplacer `loadProfile` par :

```ts
const OBJECTIF_TYPES_VALIDES = ['perte', 'affiner', 'masse', 'maintien'];
const REGIMES_VALIDES = ['keto', 'vegetarien', 'vegan', 'sans-gluten', 'aucun'];

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
  return parsed as unknown as UserProfile;
};
```

Vert : `npx vitest run tests/storage.test.ts` → PASS (le describe legacy de Task 3 doit rester vert : la v1 n'est **pas** une v2 corrompue aux yeux de `loadProfilLegacy`, et `loadProfile` sur une v1 → warn + null + remove — c'est le comportement de migration voulu).

- [ ] **Step 4: Stats — delta en kg (rouge)** — dans `tests/stats.test.ts`, remplacer le describe `stats: variationPoids7j` (3 tests) par :

```ts
describe('stats: variationKg7j', () => {
  it('retourne l écart en kg vs la pesée la plus proche de J-7', () => {
    const weights = [w('2026-08-01', 80), w('2026-08-29', 80), w('2026-09-01', 78), w('2026-09-08', 77.4)];
    expect(variationKg7j(weights)).toBeCloseTo(-0.6, 2);
  });

  it('retourne null avec une seule pesée', () => {
    expect(variationKg7j([w('2026-09-08', 78)])).toBeNull();
  });

  it('retourne null si la pesée précédente a plus de 14 jours', () => {
    expect(variationKg7j([w('2026-08-01', 80), w('2026-09-08', 78)])).toBeNull();
  });
});
```

Et **supprimer** le describe `stats: kcalDuJour` (5 tests, lignes 53-102) + l'import `kcalDuJour` ; remplacer l'import `variationPoids7j` par `variationKg7j`. (`trouverJourDuJour` **reste** : MenuView l'utilise.)

- [ ] **Step 5: Stats — implémentation (vert)** — dans `src/lib/stats.ts` :

```ts
// Écart en kg vs la pesée la plus proche de J-7 (fenêtre 14 jours max), null sinon.
export const variationKg7j = (weights: WeightEntry[]): number | null => {
  if (weights.length < 2) return null;
  const last = weights[weights.length - 1];
  const lastTime = time(last.date);
  const cible = lastTime - 7 * JOUR_MS;
  const prev = weights.slice(0, -1).reduce(
    (best, w) => {
      const d = Math.abs(time(w.date) - cible);
      return d < best.d ? { w, d } : best;
    },
    { w: weights[0], d: Number.POSITIVE_INFINITY },
  );
  if (lastTime - time(prev.w.date) > 14 * JOUR_MS) return null;
  return last.kg - prev.w.kg;
};
```

Supprimer `variationPoids7j` et `kcalDuJour` (et les imports devenus inutiles : `MealKey`, `ProfileKey` — `Recette` reste pour `recetteParRef`, `MenuDay` pour `trouverJourDuJour`). Vert : `npx vitest run tests/stats.test.ts`.

- [ ] **Step 6: StatCards — tests carte Poids (rouge)** — dans `tests/components.test.tsx`, remplacer tout le describe `StatCards` (lignes 818-903) par :

```tsx
describe('StatCards — carte Poids (hero)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('affiche le poids actuel et la variation en kg vs 7 jours', () => {
    addWeight('marc', '2026-09-02', 78);
    addWeight('marc', '2026-09-08', 77.4);
    render(<StatCards profile={profileV2('marc', { poidsObjectif: 70 })} />);

    expect(screen.getByText('Poids')).toBeInTheDocument();
    expect(screen.getByText('77,4')).toBeInTheDocument();
    expect(screen.getByText(/-0,6 kg/)).toBeInTheDocument();
    expect(screen.getByText('vs 7 jours')).toBeInTheDocument();
    expect(screen.queryByText('Kcal du jour')).not.toBeInTheDocument();
    expect(screen.queryByText('Séances')).not.toBeInTheDocument();
    expect(screen.queryByText('Courses')).not.toBeInTheDocument();
  });

  it('variation dans le sens de l objectif → stat-delta-bon, à contre-sens → stat-delta-alerte', () => {
    addWeight('marc', '2026-09-02', 78);
    addWeight('marc', '2026-09-08', 77.4);
    const { unmount } = render(
      <StatCards profile={profileV2('marc', { poidsObjectif: 70 })} />,
    );
    expect(screen.getByText(/-0,6 kg/)).toHaveClass('stat-delta-bon');
    unmount();

    addWeight('marc', '2026-09-02', 78);
    addWeight('marc', '2026-09-08', 78.5);
    render(<StatCards profile={profileV2('marc', { poidsObjectif: 70 })} />);
    expect(screen.getByText(/\+0,5 kg/)).toHaveClass('stat-delta-alerte');
  });

  it('sans poids objectif, la variation reste neutre', () => {
    addWeight('marc', '2026-09-02', 78);
    addWeight('marc', '2026-09-08', 77.4);
    render(<StatCards profile={profileV2('marc')} />);
    expect(screen.getByText(/-0,6 kg/)).toHaveClass('stat-delta-neutre');
  });

  it('sans pesée, le poids s affiche en tiret (aucun crash)', () => {
    render(<StatCards profile={profileV2('melanie')} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
```

Le helper `profileV2` est créé en Step 12 — l'ajouter tout de suite en haut du fichier (après les imports) pour débloquer :

```tsx
const profileV2 = (
  id: 'marc' | 'melanie' = 'marc',
  extra: Partial<UserProfile> = {},
): UserProfile => ({
  id,
  dateNaissance: id === 'marc' ? '1985-04-12' : '1987-03-02',
  taille: id === 'marc' ? 178 : 165,
  objectif: { type: 'perte', echeance: '2026-12-15' },
  complements: [],
  regime: id === 'melanie' ? 'keto' : 'aucun',
  ...extra,
});
```

(+ imports `UserProfile` en type.) Vérifier le rouge : `npx vitest run tests/components.test.tsx -t "StatCards"` → FAIL.

- [ ] **Step 7: StatCards — carte Poids seule (vert)** — remplacer tout le contenu de `src/components/StatCards.tsx` par :

```tsx
import { useState } from 'react';
import { getWeights } from '../lib/storage';
import { poidsActuel, variationKg7j } from '../lib/stats';
import type { UserProfile } from '../lib/model';
import { Icon } from './Icon';

export function StatCards({ profile }: { profile: UserProfile }) {
  // Invariant : le profil actif ne change jamais en place — un changement passe par
  // removeProfile → Onboarding, qui démonte tout le sous-arbre suivi. Si un changement
  // de profil en place était un jour ajouté, il faudrait ici un render-phase reset
  // (pattern syncedProfile) pour relire les pesées du nouveau profil.
  const [weights] = useState(() => getWeights(profile.id));

  const actuel = poidsActuel(weights);
  const variation = variationKg7j(weights);

  // La variation est « bonne » si elle va dans le sens de l'objectif.
  let deltaClass = 'stat-delta-neutre';
  let deltaTexte: string | null = null;
  if (actuel && variation != null) {
    const kg = Math.abs(variation).toFixed(1).replace('.', ',');
    const fleche = variation < 0 ? '▼' : '▲';
    deltaTexte = `${fleche} ${variation < 0 ? '-' : '+'}${kg} kg`;
    if (profile.poidsObjectif != null) {
      const perte = profile.poidsObjectif < actuel.kg;
      deltaClass = (variation < 0) === perte ? 'stat-delta-bon' : 'stat-delta-alerte';
    }
  }

  return (
    <div className="stat-cards" role="list" aria-label="Résumé de mon suivi">
      <div className="stat-card stat-card-hero" role="listitem" aria-label="Poids">
        <div>
          <span className="stat-label">
            <Icon name="scale" size={13} /> Poids
          </span>
          <span className="stat-value">
            {actuel ? `${actuel.kg.toFixed(1).replace('.', ',')}` : '—'}
            {actuel && <small> kg</small>}
          </span>
        </div>
        {deltaTexte && (
          <span className={`stat-delta ${deltaClass}`}>
            {deltaTexte}
            <small>vs 7 jours</small>
          </span>
        )}
      </div>
    </div>
  );
}
```

(`data` n'est plus nécessaire : la carte Poids ne lit que les pesées — le prop est **retiré**, l'appel App est mis à jour au Step 12.) Vérifier : `npx vitest run tests/components.test.tsx -t "StatCards"` → PASS.

- [ ] **Step 8: Icon — ajouter `plus`** — dans `src/components/Icon.tsx`, ajouter à `ICONS` (après `drop` par exemple) :

```tsx
  plus: <path d="M12 5.5v13M5.5 12h13" />,
```

Vérifier `npm run typecheck && npm run lint` (aucun test n'énumère les clés — si un test le fait après coup, l'ajouter à la liste).

- [ ] **Step 9: Onboarding — tests 4 étapes + migration (rouge)** — remplacer **tout** `tests/onboarding.test.tsx` par :

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { Onboarding } from '../src/components/onboarding/Onboarding';
import type { ProfilLegacy, UserProfile } from '../src/lib/model';
import { addWeight, getWeights, loadProfile } from '../src/lib/storage';
import { todayISO } from '../src/lib/dates';

// happy-dom ne déclenche pas la soumission implicite des formulaires :
// convention repo = fireEvent.submit.
const soumettre = () => fireEvent.submit(document.querySelector('.onboarding-form')!);

// Les input[type=date] ne se laissent pas taper : convention repo = fireEvent.change.
const saisirDate = (label: string, valeur: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value: valeur } });
};

const remplirEtape2 = async (
  user: ReturnType<typeof userEvent.setup>,
  overrides: { poids?: string; dateNaissance?: string; taille?: string } = {},
) => {
  await user.clear(screen.getByLabelText('Poids (kg)'));
  await user.type(screen.getByLabelText('Poids (kg)'), overrides.poids ?? '62.4');
  saisirDate('Date de naissance', overrides.dateNaissance ?? '1987-03-02');
  await user.clear(screen.getByLabelText('Taille (cm)'));
  await user.type(screen.getByLabelText('Taille (cm)'), overrides.taille ?? '165');
};

const allerEtape2 = async () => {
  const user = userEvent.setup();
  render(<Onboarding onDone={onDone} />);
  await user.click(screen.getByRole('button', { name: /Mélanie/ }));
  return user;
};

const allerEtape3 = async () => {
  const user = await allerEtape2();
  await remplirEtape2(user);
  await user.click(screen.getByRole('button', { name: /Continuer/ }));
  return user;
};

const allerEtape4 = async () => {
  const user = await allerEtape3();
  await user.click(screen.getByRole('button', { name: /Continuer/ }));
  return user;
};

let onDone: Mock<(profile: UserProfile) => void>;

beforeEach(() => {
  localStorage.clear();
  onDone = vi.fn();
});

describe('Onboarding — étape 1 (choix du profil)', () => {
  it('affiche la question, les deux cartes et 4 points de progression', () => {
    render(<Onboarding onDone={() => {}} />);

    expect(screen.getByRole('heading', { name: /Qui est derrière l'écran/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marc/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mélanie/ })).toBeInTheDocument();
    const dots = screen.getByRole('group', { name: /Progression/ });
    expect(dots.querySelectorAll('span')).toHaveLength(4);
    expect(dots.querySelectorAll('span')[0]).toHaveClass('onboarding-dot-active');
    expect(screen.queryByLabelText('Poids (kg)')).not.toBeInTheDocument();
  });

  it('le choix du profil passe à l étape 2 et le retour ramène à l étape 1', async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Mélanie/ }));
    expect(screen.getByRole('heading', { name: /Salut Mélanie/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Date de naissance')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Retour/ }));
    expect(screen.getByRole('heading', { name: /Qui est derrière l'écran/ })).toBeInTheDocument();
  });
});

describe('Onboarding — étape 2 (infos : poids, date de naissance, taille)', () => {
  it('refuse un formulaire incomplet avec une erreur explicite', async () => {
    await allerEtape2();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Poids (kg)'), '62.4');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/incomplet/i);
    expect(loadProfile()).toBeNull();
  });

  it('refuse un poids hors bornes', async () => {
    const user = await allerEtape2();
    await remplirEtape2(user, { poids: '500' });
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/poids/i);
  });

  it('refuse une date de naissance dans le futur', async () => {
    const user = await allerEtape2();
    await remplirEtape2(user, { dateNaissance: '2999-01-01' });
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/futur/i);
  });

  it('refuse un âge calculé hors bornes (naissance en 2020)', async () => {
    const user = await allerEtape2();
    await remplirEtape2(user, { dateNaissance: '2020-01-01' });
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/10 et 100 ans/i);
  });

  it('passe à l étape 3 (objectif) quand les infos sont valides', async () => {
    await allerEtape3();

    expect(screen.getByRole('heading', { name: /Ton objectif/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Perte de poids/ })).toBeChecked();
  });
});

describe('Onboarding — étape 3 (objectif)', () => {
  it('permet de choisir un des 4 types et affiche sa description', async () => {
    const user = await allerEtape3();

    await user.click(screen.getByRole('radio', { name: /Prise de masse/ }));
    expect(screen.getByRole('radio', { name: /Prise de masse/ })).toBeChecked();
    expect(screen.getByText(/Prendre du muscle/)).toBeInTheDocument();
  });

  it('valide le poids objectif (refus hors bornes)', async () => {
    const user = await allerEtape3();
    await user.type(screen.getByLabelText('Poids objectif (kg)'), '500');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/poids objectif/i);
  });

  it('le retour conserve les infos saisies', async () => {
    const user = await allerEtape3();
    await user.click(screen.getByRole('button', { name: /Retour/ }));

    expect(screen.getByLabelText('Poids (kg)')).toHaveValue(62.4);
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(screen.getByRole('heading', { name: /Ton objectif/ })).toBeInTheDocument();
  });
});

describe('Onboarding — étape 4 (compléments et régime)', () => {
  it('bascule les compléments presets', async () => {
    const user = await allerEtape4();
    const whey = screen.getByRole('button', { name: 'Whey' });
    expect(whey).not.toHaveAttribute('aria-pressed', 'true');
    await user.click(whey);
    expect(whey).toHaveAttribute('aria-pressed', 'true');
    await user.click(whey);
    expect(whey).not.toHaveAttribute('aria-pressed', 'true');
  });

  it('ajoute un complément libre et refuse le doublon (casse ignorée)', async () => {
    const user = await allerEtape4();
    await user.click(screen.getByRole('button', { name: 'Whey' }));
    await user.type(screen.getByLabelText('Ajouter un complément'), 'whey');
    await user.click(screen.getByRole('button', { name: /Ajouter/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/déjà sélectionné/i);
    await user.clear(screen.getByLabelText('Ajouter un complément'));
    await user.type(screen.getByLabelText('Ajouter un complément'), 'Zinc');
    await user.click(screen.getByRole('button', { name: /Ajouter/ }));
    expect(screen.getByRole('button', { name: /Zinc/ })).toBeInTheDocument();
  });

  it('choisit un régime et enregistre le profil v2 complet (C est parti)', async () => {
    const user = await allerEtape4();
    await user.click(screen.getByRole('button', { name: 'Créatine' }));
    await user.click(screen.getByRole('radio', { name: 'Keto' }));
    await user.type(screen.getByLabelText('Poids objectif (kg)'), '58');
    soumettre();

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        id: 'melanie',
        dateNaissance: '1987-03-02',
        taille: 165,
        poidsObjectif: 58,
        objectif: { type: 'perte' },
        complements: ['Créatine'],
        regime: 'keto',
      } satisfies UserProfile),
    );
    expect(loadProfile()).toEqual({
      id: 'melanie',
      dateNaissance: '1987-03-02',
      taille: 165,
      poidsObjectif: 58,
      objectif: { type: 'perte' },
      complements: ['Créatine'],
      regime: 'keto',
    });
    expect(getWeights('melanie')).toEqual([{ date: todayISO(), kg: 62.4 }]);
  });

  it('enregistre sans aucun champ optionnel (maintien, aucun complément)', async () => {
    const user = await allerEtape4();
    await user.click(screen.getByRole('radio', { name: 'Maintien' }));
    soumettre();

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        id: 'melanie',
        dateNaissance: '1987-03-02',
        taille: 165,
        objectif: { type: 'maintien' },
        complements: [],
        regime: 'aucun',
      } satisfies UserProfile),
    );
  });
});

describe('Onboarding — migration (prefill ancienne forme)', () => {
  const legacy: ProfilLegacy = { id: 'marc', age: 41, taille: 178, poidsObjectif: 74 };

  it('démarre à l étape 2 avec le bandeau, sans points ni étape 1', () => {
    render(<Onboarding onDone={() => {}} prefill={legacy} />);

    expect(screen.getByText(/Une mise à jour/)).toBeInTheDocument();
    expect(screen.getByText(/non modifiable ici/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mélanie/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Progression/ })).not.toBeInTheDocument();
  });

  it('préremplit poids (dernière pesée), taille et poids objectif ; date vide', () => {
    addWeight('marc', '2026-09-01', 79.1);
    addWeight('marc', '2026-09-09', 78.4);
    render(<Onboarding onDone={() => {}} prefill={legacy} />);

    expect(screen.getByLabelText('Poids (kg)')).toHaveValue(78.4);
    expect(screen.getByLabelText('Taille (cm)')).toHaveValue(178);
    expect(screen.getByLabelText('Poids objectif (kg)')).toHaveValue(74);
    expect(screen.getByLabelText('Date de naissance')).toHaveValue('');
  });

  it('la date de naissance reste obligatoire avant de continuer', async () => {
    const user = userEvent.setup();
    render(<Onboarding onDone={() => {}} prefill={legacy} />);
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByRole('alert')).toHaveTextContent(/incomplet/i);
  });

  it('enregistre le profil v2 (migration à sens unique) et appelle onDone', async () => {
    addWeight('marc', '2026-09-09', 78.4);
    const user = userEvent.setup();
    render(<Onboarding onDone={onDone} prefill={legacy} />);
    saisirDate('Date de naissance', '1985-04-12');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    soumettre();

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        id: 'marc',
        dateNaissance: '1985-04-12',
        taille: 178,
        poidsObjectif: 74,
        objectif: { type: 'perte' },
        complements: [],
        regime: 'aucun',
      } satisfies UserProfile),
    );
  });
});
```

Vérifier le rouge : `npx vitest run tests/onboarding.test.tsx` → FAIL (composant actuel = 2 étapes).

- [ ] **Step 10: Onboarding — implémentation 4 étapes (vert)** — remplacer tout `src/components/onboarding/Onboarding.tsx` par :

```tsx
import { useState } from 'react';
import {
  COMPLEMENTS_PRESETS,
  OBJECTIF_TYPES,
  REGIMES,
  normaliseComplement,
} from '../../lib/model';
import type { ObjectifType, ProfilLegacy, ProfileKey, Regime, UserProfile } from '../../lib/model';
import { ageDepuis, todayISO } from '../../lib/dates';
import { addWeight, getWeights, saveProfile } from '../../lib/storage';
import { Icon } from '../Icon';

const PROFILS: Array<{ id: ProfileKey; prenom: string; emoji: string; tagline: string }> = [
  { id: 'marc', prenom: 'Marc', emoji: '💪', tagline: 'Diet & sport' },
  { id: 'melanie', prenom: 'Mélanie', emoji: '🌿', tagline: 'Keto & sport' },
];

export function Onboarding({
  onDone,
  prefill,
}: {
  onDone: (profile: UserProfile) => void;
  prefill?: ProfilLegacy;
}) {
  // Migration : démarrer directement à l'étape 2, profil verrouillé (pas d'étape 1).
  const [step, setStep] = useState<1 | 2 | 3 | 4>(prefill ? 2 : 1);
  const [id, setId] = useState<ProfileKey | null>(prefill?.id ?? null);
  const [poids, setPoids] = useState(() => {
    if (!prefill) return '';
    const list = getWeights(prefill.id);
    const last = list.length > 0 ? list[list.length - 1] : undefined;
    return last ? String(last.kg) : '';
  });
  const [dateNaissance, setDateNaissance] = useState('');
  const [taille, setTaille] = useState(prefill ? String(prefill.taille) : '');
  const [objectifType, setObjectifType] = useState<ObjectifType>('perte');
  const [echeance, setEcheance] = useState('');
  const [poidsObjectif, setPoidsObjectif] = useState(
    prefill?.poidsObjectif != null ? String(prefill.poidsObjectif) : '',
  );
  const [complements, setComplements] = useState<string[]>([]);
  const [nouveauComplement, setNouveauComplement] = useState('');
  const [regime, setRegime] = useState<Regime>('aucun');
  const [error, setError] = useState<string | null>(null);

  const migration = prefill != null;
  const profil = id ? PROFILS.find((p) => p.id === id) : undefined;

  const aller = (n: 1 | 2 | 3 | 4) => {
    setError(null);
    setStep(n);
  };

  const choisir = (p: ProfileKey) => {
    setId(p);
    aller(2);
  };

  const retour = () => aller(Math.max(1, step - 1) as 1 | 2 | 3 | 4);

  // Valide l'étape 2 et retourne le poids/taille parsés, ou null avec un message.
  const validerInfos = (): { kg: number; cm: number } | null => {
    const kg = Number.parseFloat(poids.replace(',', '.'));
    const cm = Number.parseInt(taille, 10);
    if (!poids || !dateNaissance || !taille || Number.isNaN(kg) || Number.isNaN(cm)) {
      setError('Formulaire incomplet : remplis ton poids, ta date de naissance et ta taille.');
      return null;
    }
    if (kg < 30 || kg > 250) {
      setError('Poids invalide : entre 30 et 250 kg.');
      return null;
    }
    if (dateNaissance > todayISO()) {
      setError('La date de naissance ne peut pas être dans le futur.');
      return null;
    }
    const ans = ageDepuis(dateNaissance);
    if (ans < 10 || ans > 100) {
      setError('Âge calculé invalide : entre 10 et 100 ans.');
      return null;
    }
    if (cm < 120 || cm > 230) {
      setError('Taille invalide : entre 120 et 230 cm.');
      return null;
    }
    return { kg, cm };
  };

  const continuerInfos = () => {
    if (validerInfos()) aller(3);
  };

  const continuerObjectif = () => {
    const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
    if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
      setError('Poids objectif invalide : entre 30 et 250 kg.');
      return;
    }
    setError(null);
    aller(4);
  };

  const ajouterComplement = () => {
    const v = nouveauComplement.trim().slice(0, 40);
    if (!v) return;
    if (complements.some((c) => normaliseComplement(c) === normaliseComplement(v))) {
      setError('Ce complément est déjà sélectionné.');
      return;
    }
    setError(null);
    setComplements([...complements, v]);
    setNouveauComplement('');
  };

  const basculerPreset = (preset: string) => {
    setError(null);
    setComplements((cs) =>
      cs.some((c) => normaliseComplement(c) === normaliseComplement(preset))
        ? cs.filter((c) => normaliseComplement(c) !== normaliseComplement(preset))
        : [...cs, preset],
    );
  };

  const valider = () => {
    const infos = validerInfos();
    if (!infos) return;
    const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
    if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
      setError('Poids objectif invalide : entre 30 et 250 kg.');
      return;
    }
    if (!id) return;
    const profile: UserProfile = {
      id,
      dateNaissance,
      taille: infos.cm,
      ...(obj != null ? { poidsObjectif: obj } : {}),
      objectif: { type: objectifType, ...(echeance ? { echeance } : {}) },
      complements: [...complements],
      regime,
    };
    saveProfile(profile);
    addWeight(id, todayISO(), infos.kg);
    onDone(profile);
  };

  return (
    <div className="onboarding">
      {!migration && (
        <div className="onboarding-dots" role="group" aria-label="Progression de l'onboarding">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={n <= step ? 'onboarding-dot-active' : undefined} />
          ))}
        </div>
      )}

      {migration && (
        <p className="onb-note">
          <Icon name="check" size={16} />
          <span>
            <b>Une mise à jour 👋</b> — ton profil existe déjà : on l'a prérempli. Vérifie et
            complète ta <b>date de naissance</b>, c'est tout.
          </span>
        </p>
      )}

      {step === 1 && (
        <>
          <h1>Qui est derrière l'écran ?</h1>
          <p className="onboarding-sub">Choisis ton profil, on s'occupe du reste.</p>
          <div className="onboarding-cards">
            {PROFILS.map(({ id: pid, prenom, emoji, tagline }) => (
              <button
                key={pid}
                type="button"
                className={`onboarding-card onboarding-card-${pid}`}
                onClick={() => choisir(pid)}
              >
                <span className="onboarding-card-emoji" aria-hidden="true">
                  {emoji}
                </span>
                <span className="onboarding-card-prenom">{prenom}</span>
                <span className="onboarding-card-tagline">{tagline}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step >= 2 && id && (
        <form
          className="onboarding-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 4) valider();
          }}
        >
          {step === 2 && (
            <>
              <h1>Salut {profil?.prenom} 👋</h1>
              <p className="onboarding-sub">
                {migration ? 'On met ton profil à niveau.' : 'Tes bases, pour tes suivis.'}
              </p>
              {migration && (
                <p className="mig-prof">
                  <span>
                    Profil : {profil?.prenom} {profil?.emoji}
                  </span>
                  <span>non modifiable ici</span>
                </p>
              )}
              <div className="onboarding-field">
                <label htmlFor="ob-poids">Poids (kg)</label>
                <input
                  id="ob-poids"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={poids}
                  onChange={(e) => {
                    setError(null);
                    setPoids(e.target.value);
                  }}
                />
                {migration && <p className="onb-hint">Dernière pesée enregistrée — modifiable si besoin.</p>}
              </div>
              <div className="onboarding-field">
                <label htmlFor="ob-naissance" className={migration ? 'onb-req' : undefined}>
                  Date de naissance
                </label>
                <input
                  id="ob-naissance"
                  type="date"
                  value={dateNaissance}
                  onChange={(e) => {
                    setError(null);
                    setDateNaissance(e.target.value);
                  }}
                />
                <p className="onb-hint">
                  {migration
                    ? 'Nouvelle saisie obligatoire : ton âge devient calculé.'
                    : 'Ton âge se calcule tout seul — plus rien à mettre à jour chaque année.'}
                </p>
              </div>
              <div className="onboarding-field">
                <label htmlFor="ob-taille">Taille (cm)</label>
                <input
                  id="ob-taille"
                  type="number"
                  inputMode="numeric"
                  value={taille}
                  onChange={(e) => {
                    setError(null);
                    setTaille(e.target.value);
                  }}
                />
              </div>
              <div className="onb-btnrow">
                {!migration && (
                  <button type="button" className="onb-back" onClick={retour}>
                    Retour
                  </button>
                )}
                <button type="button" className="onb-next" onClick={continuerInfos}>
                  Continuer <Icon name="chev-right" size={14} />
                </button>
              </div>
              {migration && (
                <p className="onb-hint">Ensuite : objectif puis compléments &amp; régime (2 écrans rapides).</p>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h1>Ton objectif</h1>
              <p className="onboarding-sub">Pour que l'app te suive dans la bonne direction.</p>
              <div className="rcards" role="radiogroup" aria-label="Type d'objectif">
                {OBJECTIF_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={objectifType === t.id}
                    className={`rcard${objectifType === t.id ? ' sel' : ''}`}
                    onClick={() => {
                      setError(null);
                      setObjectifType(t.id);
                    }}
                  >
                    <span className="rcard-t">
                      <Icon name={t.icone} size={14} />
                      {t.nom}
                    </span>
                    <span className="rcard-d">{t.desc}</span>
                  </button>
                ))}
              </div>
              <div className="onboarding-field">
                <label htmlFor="ob-echeance">
                  Échéance <span className="onb-opt">(optionnelle)</span>
                </label>
                <input
                  id="ob-echeance"
                  type="date"
                  value={echeance}
                  onChange={(e) => {
                    setError(null);
                    setEcheance(e.target.value);
                  }}
                />
              </div>
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
              <div className="onb-btnrow">
                <button type="button" className="onb-back" onClick={retour}>
                  Retour
                </button>
                <button type="button" className="onb-next" onClick={continuerObjectif}>
                  Continuer <Icon name="chev-right" size={14} />
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1>Personnalisation</h1>
              <p className="onboarding-sub">
                Tes compléments et ton régime — modifiable plus tard dans le profil.
              </p>
              <p className="onb-label">Compléments</p>
              <div className="chips">
                {COMPLEMENTS_PRESETS.map((preset) => {
                  const on = complements.some((c) => normaliseComplement(c) === normaliseComplement(preset));
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`chip${on ? ' on' : ''}`}
                      aria-pressed={on}
                      onClick={() => basculerPreset(preset)}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
              <div className="addrow">
                <input
                  value={nouveauComplement}
                  maxLength={40}
                  placeholder="Ajouter un complément…"
                  aria-label="Ajouter un complément"
                  onChange={(e) => {
                    setError(null);
                    setNouveauComplement(e.target.value);
                  }}
                />
                <button type="button" onClick={ajouterComplement}>
                  <Icon name="plus" size={13} /> Ajouter
                </button>
              </div>
              <p className="onb-label">Régime</p>
              <div className="rline" role="radiogroup" aria-label="Régime">
                {REGIMES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={regime === r.id}
                    className={`rl${regime === r.id ? ' sel' : ''}`}
                    onClick={() => {
                      setError(null);
                      setRegime(r.id);
                    }}
                  >
                    <span className="rl-dot" aria-hidden="true" />
                    {r.nom}
                  </button>
                ))}
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

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 11: ProfilScreen — correctif mécanique v2 (compile + tests)** — dans `src/components/ProfilScreen.tsx` :
  - États : remplacer `const [age, setAge] = useState(String(profile.age));` par `const [dateNaissance, setDateNaissance] = useState(profile.dateNaissance);` et **supprimer** l'état `kcalObjectif` ;
  - `enregistrer` : valider `dateNaissance` (obligatoire, pas dans le futur, `ageDepuis` entre 10 et 100) et `taille`, puis construire `const updated: UserProfile = { ...profile, dateNaissance, taille: cm, ...(obj != null ? { poidsObjectif: obj } : {}) };` (le spread préserve `objectif`/`complements`/`regime` — les sections dédiées arrivent en Task 6) ;
  - Mes infos : remplacer le champ Âge par `Date de naissance` (input `type="date"`, id `pf-naissance`, hint `` {`${ageDepuis(dateNaissance)} ans — calculé automatiquement.`} ``) et supprimer le champ kcal ;
  - Importer `ageDepuis, todayISO` depuis `../lib/dates` (et `fireEvent` depuis `@testing-library/react` s'il n'y est pas encore).
  
  Dans `tests/profil-screen.test.tsx` : remplacer `const profileMarc: UserProfile = { id: 'marc', age: 41, taille: 178 };` par le helper :

```tsx
const profileMarc: UserProfile = {
  id: 'marc',
  dateNaissance: '1985-04-12',
  taille: 178,
  objectif: { type: 'perte', echeance: '2026-12-15' },
  complements: [],
  regime: 'aucun',
};
```

  puis adapter les tests « Âge » : `getByLabelText('Date de naissance')` avec `fireEvent.change(input, { target: { value: '1984-04-12' } })` au lieu de `user.type` (input date), valeurs attendues `{ id: 'marc', dateNaissance: '1984-04-12', taille: 178, objectif: { type: 'perte', echeance: '2026-12-15' }, complements: [], regime: 'aucun' }` ; supprimer les tests « objectif kcal » (champ disparu) et garder les tests poids objectif / bornes / confirmation / version / intégration App (les profils des fixtures passent au helper).

- [ ] **Step 12: App — porte de migration** — dans `src/App.tsx` :

```tsx
import { loadProfile, loadProfilLegacy, loadWeeks, removeProfile } from './lib/storage';
```

et dans le composant :

```tsx
  if (!profile) {
    return <Onboarding onDone={setProfile} prefill={loadProfilLegacy() ?? undefined} />;
  }
```

et l'appel StatCards perd le prop `data` (cf. Step 7) :

```tsx
            <StatCards key={weightsBump} profile={profile} />
```

Dans `tests/app.test.tsx` :
  - remplacer le helper `initProfile` par :

```tsx
const initProfile = (id: ProfileKey = 'marc') =>
  saveProfile({
    id,
    dateNaissance: id === 'marc' ? '1985-04-12' : '1987-03-02',
    taille: id === 'marc' ? 178 : 165,
    objectif: { type: 'perte', echeance: '2026-12-15' },
    complements: [],
    regime: id === 'melanie' ? 'keto' : 'aucun',
  });
```

  - describe `Theming` : remplacer `saveProfile({ id: 'melanie', age: 38, taille: 165 })` par `initProfile('melanie')` ;
  - describe `App — multi-semaines` beforeEach : `saveProfile({ id: 'marc', age: 41, taille: 178 })` → `initProfile()` ;
  - remplacer le describe `Onboarding — objectifs optionnels` par :
```tsx
describe('Onboarding v2 — persistance via App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('parcours complet 4 étapes : objectif, compléments et régime persistés', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Marc/ }));
    await user.type(screen.getByLabelText('Poids (kg)'), '85');
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1985-04-12' } });
    await user.type(screen.getByLabelText('Taille (cm)'), '178');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    await user.click(screen.getByRole('radio', { name: /Affiner/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    await user.click(screen.getByRole('button', { name: 'Créatine' }));
    await user.click(screen.getByRole('radio', { name: 'Keto' }));
    // happy-dom ne soumet pas le form au clic du bouton (convention repo : fireEvent.submit)
    fireEvent.submit(document.querySelector('.onboarding-form')!);

    expect(JSON.parse(localStorage.getItem('sportapp:profile')!)).toMatchObject({
      id: 'marc',
      objectif: { type: 'affiner' },
      complements: ['Créatine'],
      regime: 'keto',
    });
    expect(screen.getByText('Semaine 2026-S37')).toBeInTheDocument();
  });
});

describe('Migration profil v1 → v2', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('un profil ancien (age) relance l onboarding prérempli à l étape 2', () => {
    localStorage.setItem('sportapp:profile', JSON.stringify({ id: 'marc', age: 41, taille: 178 }));
    addWeight('marc', '2026-09-09', 78.4);
    render(<App />);

    expect(screen.getByText(/Une mise à jour/)).toBeInTheDocument();
    expect(screen.getByText(/non modifiable ici/)).toBeInTheDocument();
    expect(screen.getByLabelText('Poids (kg)')).toHaveValue(78.4);
    expect(screen.getByLabelText('Date de naissance')).toHaveValue('');
    expect(screen.queryByRole('button', { name: /Mélanie/ })).not.toBeInTheDocument();
  });

  it('après migration, le profil v2 est enregistré et l app s affiche', async () => {
    localStorage.setItem('sportapp:profile', JSON.stringify({ id: 'melanie', age: 38, taille: 165 }));
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1987-03-02' } });
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    fireEvent.submit(document.querySelector('.onboarding-form')!);

    expect(JSON.parse(localStorage.getItem('sportapp:profile')!)).toMatchObject({
      id: 'melanie',
      dateNaissance: '1987-03-02',
      objectif: { type: 'perte' },
      regime: 'aucun',
    });
    expect(screen.getByText('Semaine 2026-S37')).toBeInTheDocument();
  });
});
```

Ajouter `addWeight` aux imports de `../src/lib/storage`.

- [ ] **Step 13: components.test — migrer les profils** — dans `tests/components.test.tsx`, remplacer toutes les props `profile={{ id: 'marc', age: 41, taille: 178 }}` / `profile={{ id: 'melanie', age: 38, taille: 165 }}` des describes `ProfileView` et `WeekBanner`/`ImportButton` s'ils en ont, par `profile={profileV2('marc')}` / `profile={profileV2('melanie')}`. Vérifier au grep qu'il ne reste aucun `age:` : `rg -n "age: 4|age: 3" tests/ --glob '!tests/e2e/**'`.

- [ ] **Step 14: CSS** — dans `src/index.css` :
  - `.onboarding-dots .onboarding-dot-active` → ajouter `width: 22px; background: var(--accent);` (progression remplie, cf. maquette) ;
  - remplacer `.stat-cards { grid-template-columns: 1fr 1fr; … }` par `grid-template-columns: 1fr;` et ajouter :

```css
.stat-card-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.stat-card-hero .stat-value {
  font-size: 26px;
  margin-top: 0;
}
.stat-delta small {
  display: block;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}
```

  - supprimer les règles `.stat-bar`, `.stat-bar-fill`, `.stat-bar-accent`, `.stat-bar-lime` **après vérification** `rg -n "stat-bar" src/` (plus aucun usage) ;
  - ajouter le bloc familles nouvelles (onboarding 4 étapes, migration, cartes radio, chips) :

```css
/* ——— Onboarding 4 étapes + migration ——— */
.onb-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: color-mix(in srgb, var(--accent-2) 32%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent-2) 55%, var(--border));
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 12.5px;
  line-height: 1.5;
}
.onb-note svg {
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 2px;
}
.mig-prof {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface-2);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  margin-top: 12px;
}
.mig-prof span:last-child {
  color: var(--muted);
  font-weight: 500;
  font-size: 11.5px;
}
.onb-req::after {
  content: ' · à compléter';
  color: var(--danger);
  font-weight: 700;
  font-size: 11px;
}
.onb-hint {
  font-size: 11px;
  color: var(--muted);
  margin-top: 5px;
  line-height: 1.4;
}
.onb-opt {
  font-weight: 500;
}
.onb-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 18px;
}
.onb-btnrow {
  display: flex;
  gap: 9px;
  margin-top: 24px;
  align-items: center;
}
.onb-next {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 48px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font: 700 14px Poppins, sans-serif;
  cursor: pointer;
}
.onb-next:active {
  transform: scale(0.97);
}
.onb-back {
  min-height: 48px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 999px;
  padding: 0 18px;
  font: 600 13px Poppins, sans-serif;
  cursor: pointer;
}
.onb-back:active {
  transform: scale(0.97);
}
.onb-full {
  width: 100%;
  margin-top: 24px;
}

/* ——— Cartes radio objectif ——— */
.rcards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 14px;
}
.rcard {
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  min-height: 48px;
  transition: border-color 0.15s, background 0.15s;
}
.rcard-t {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 700;
}
.rcard-d {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
  line-height: 1.4;
}
.rcard.sel {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  box-shadow: inset 0 0 0 1px var(--accent);
}
.rcard.sel .rcard-t {
  color: var(--accent);
}

/* ——— Radios en ligne (régime, objectif au profil) ——— */
.rline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.rl {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 12px;
  padding: 11px 14px;
  min-height: 48px;
  font: 600 13.5px Poppins, sans-serif;
  color: var(--text);
  cursor: pointer;
}
.rl-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rl.sel {
  border-color: var(--accent);
}
.rl.sel .rl-dot {
  border-color: var(--accent);
}
.rl.sel .rl-dot::after {
  content: '';
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
}

/* ——— Chips compléments ——— */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}
.chip {
  display: inline-flex;
  align-items: center;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 999px;
  padding: 8px 13px;
  min-height: 42px;
  font: 600 12.5px Poppins, sans-serif;
  color: var(--text);
  cursor: pointer;
}
.chip.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.chip .rm {
  margin-left: 4px;
  opacity: 0.7;
}
.addrow {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.addrow input {
  flex: 1;
  min-width: 0;
  border: 1.5px solid var(--border);
  background: var(--bg);
  border-radius: 12px;
  padding: 10px 12px;
  font: 500 13px Poppins, sans-serif;
  color: var(--text);
}
.addrow button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 42px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 999px;
  padding: 0 15px;
  font: 600 12.5px Poppins, sans-serif;
  color: var(--text);
  cursor: pointer;
}
```

- [ ] **Step 15: Vert global + commit** — `npm test && npm run typecheck && npm run lint` tous verts (corriger les derniers ajustements de tests si besoin), puis :

```bash
git add -A
git commit -m "feat: profil v2 — onboarding 4 étapes, migration préremplie, carte Poids seule (kcal retiré)"
```

---

---

### Task 5 : Bloc Objectif en tête de Mon suivi

Fichiers : `src/components/ObjectifBloc.tsx` (nouveau), `src/App.tsx`, `src/index.css`, `tests/components.test.tsx`.

- [ ] **Step 1: Écrire les tests (rouge)** — dans `tests/components.test.tsx`, nouveau describe (après `StatCards`) :

```tsx
describe('ObjectifBloc', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.setSystemTime(new Date('2026-09-09T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('perte : kg restants, barre de progression et détail départ → cible', () => {
    addWeight('marc', '2026-08-12', 82.8);
    addWeight('marc', '2026-09-07', 79.1);
    addWeight('marc', '2026-09-09', 78.4);
    render(<ObjectifBloc profile={profileV2('marc', { poidsObjectif: 74 })} />);

    expect(screen.getByText(/Perte de poids/)).toBeInTheDocument();
    expect(screen.getByText(/4,4/)).toBeInTheDocument();
    expect(screen.getByText(/restants/)).toBeInTheDocument();
    expect(screen.getByText(/Départ 82,8 kg/)).toHaveTextContent(
      'Départ 82,8 kg · 82,8 → 78,4 → cible 74,0 kg',
    );
    const barre = document.querySelector('.obj-bar span') as HTMLElement;
    expect(barre.style.width).toBe('50%');
    expect(screen.getByText(/Échéance :/)).toHaveTextContent('15 déc. · dans 97 jours');
  });

  it('échéance dépassée : mention « dépassée » et classe late', () => {
    render(
      <ObjectifBloc
        profile={profileV2('marc', { poidsObjectif: 74, objectif: { type: 'perte', echeance: '2026-06-15' } })}
      />,
    );
    expect(screen.getByText(/dépassée/)).toBeInTheDocument();
    expect(document.querySelector('.obj-echeance')).toHaveClass('late');
  });

  it('sans échéance, pas de ligne échéance', () => {
    render(
      <ObjectifBloc
        profile={profileV2('marc', { poidsObjectif: 74, objectif: { type: 'perte' } })}
      />,
    );
    expect(screen.queryByText(/Échéance :/)).not.toBeInTheDocument();
  });

  it('masse : kg à prendre, sens de la barre inversé', () => {
    addWeight('marc', '2026-08-12', 74);
    addWeight('marc', '2026-09-09', 75.8);
    render(
      <ObjectifBloc
        profile={profileV2('marc', { poidsObjectif: 82, objectif: { type: 'masse' } })}
      />,
    );
    expect(screen.getByText(/6,2/)).toBeInTheDocument();
    expect(screen.getByText(/à prendre/)).toBeInTheDocument();
  });

  it('maintien : pas de barre, ligne poids actuel (+ cible si présente)', () => {
    addWeight('marc', '2026-09-09', 78.4);
    render(
      <ObjectifBloc
        profile={profileV2('marc', { poidsObjectif: 74, objectif: { type: 'maintien' } })}
      />,
    );
    expect(document.querySelector('.obj-bar')).toBeNull();
    expect(screen.getByText(/Poids actuel 78,4 kg · cible 74,0 kg/)).toBeInTheDocument();
  });

  it('sans pesée : aucun crash, pas de barre ni de poids', () => {
    render(<ObjectifBloc profile={profileV2('marc', { poidsObjectif: 74 })} />);
    expect(document.querySelector('.obj-bar')).toBeNull();
    expect(screen.queryByText(/Poids actuel/)).not.toBeInTheDocument();
  });

  it('affiche la pill régime sauf si « aucun », et les compléments en chips', () => {
    render(
      <ObjectifBloc
        profile={profileV2('marc', { complements: ['Whey', 'Zinc'], regime: 'keto' })}
      />,
    );
    expect(screen.getByText('Keto')).toBeInTheDocument();
    expect(screen.getByText('Whey')).toBeInTheDocument();
    expect(screen.getByText('Zinc')).toBeInTheDocument();

    render(<ObjectifBloc profile={profileV2('melanie', { regime: 'aucun' })} />);
    expect(screen.queryByText('Aucun')).not.toBeInTheDocument();
  });
});
```

Vérifier le rouge : `npx vitest run tests/components.test.tsx -t "ObjectifBloc"` → FAIL (module inexistant).

- [ ] **Step 2: Implémenter `src/components/ObjectifBloc.tsx`** :

```tsx
import { useState } from 'react';
import { OBJECTIF_TYPES, REGIMES } from '../lib/model';
import type { UserProfile } from '../lib/model';
import { formatJourMoisCourt, joursRestants } from '../lib/dates';
import { getWeights } from '../lib/storage';
import { poidsActuel } from '../lib/stats';
import { Icon } from './Icon';

const fmt = (kg: number): string => kg.toFixed(1).replace('.', ',');

// Progression perte/masse : départ = 1re pesée, actuel = dernière, 0-100 %.
const progression = (type: 'perte' | 'masse', depart: number, actuel: number, cible: number): number | null => {
  const total = type === 'perte' ? depart - cible : cible - depart;
  const fait = type === 'perte' ? depart - actuel : actuel - depart;
  if (total <= 0) return null;
  return Math.min(100, Math.max(0, (fait / total) * 100));
};

export function ObjectifBloc({ profile }: { profile: UserProfile }) {
  // Remonté via weightsBump côté App (remount à l'ajout d'une pesée).
  const [weights] = useState(() => getWeights(profile.id));
  const type = OBJECTIF_TYPES.find((t) => t.id === profile.objectif.type)!;
  const regime = REGIMES.find((r) => r.id === profile.regime)!;
  const actuel = poidsActuel(weights);
  const depart = weights.length > 0 ? weights[0] : null;
  const cible = profile.poidsObjectif;
  const avecBarre =
    (profile.objectif.type === 'perte' || profile.objectif.type === 'masse') &&
    cible != null &&
    depart != null &&
    actuel != null;

  let barrePct: number | null = null;
  let kgRestant: number | null = null;
  if (avecBarre && cible != null && depart && actuel) {
    barrePct = progression(profile.objectif.type, depart.kg, actuel.kg, cible);
    kgRestant = profile.objectif.type === 'perte' ? actuel.kg - cible : cible - actuel.kg;
  }

  const echeance = profile.objectif.echeance;
  const restants = echeance ? joursRestants(echeance) : null;

  return (
    <section className="obj-bloc" aria-label="Mon objectif">
      <div className="obj-pills">
        <span className="obj-pill-type">
          <Icon name={type.icone} size={11} />
          {type.nom}
        </span>
        {profile.regime !== 'aucun' && (
          <span className="obj-pill-reg">
            <Icon name="leaf" size={11} />
            {regime.nom}
          </span>
        )}
      </div>

      {echeance && restants != null && (
        <p className={`obj-echeance${restants < 0 ? ' late' : ''}`}>
          <Icon name="clock" size={12} />
          Échéance : <b>{formatJourMoisCourt(echeance)}</b> ·{' '}
          <b>
            {restants > 0 ? `dans ${restants} jours` : restants === 0 ? "aujourd'hui" : 'dépassée'}
          </b>
        </p>
      )}

      {barrePct != null && kgRestant != null && cible != null && depart && actuel ? (
        <div className="obj-prog">
          <p className="obj-kg">
            {fmt(Math.abs(kgRestant))}
            <small> kg</small>{' '}
            <span>{profile.objectif.type === 'perte' ? 'restants' : 'à prendre'}</span>
          </p>
          <div className="obj-bar" aria-hidden="true">
            <span style={{ width: `${barrePct}%` }} />
          </div>
          <p className="obj-det">
            Départ {fmt(depart.kg)} kg · {fmt(depart.kg)} → {fmt(actuel.kg)} → cible {fmt(cible)} kg
          </p>
        </div>
      ) : (
        actuel && (
          <p className="obj-plain">
            <Icon name="scale" size={13} />
            Poids actuel <b>{fmt(actuel.kg)} kg</b>
            {cible != null && (
              <>
                {' '}· cible <b>{fmt(cible)} kg</b>
              </>
            )}
          </p>
        )
      )}

      {profile.complements.length > 0 && (
        <div className="obj-comps">
          <span className="obj-comps-label">Compléments</span>
          {profile.complements.map((c) => (
            <span key={c} className="cchip">
              {c}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Rendre le bloc dans App** — dans `src/App.tsx` : import `{ ObjectifBloc } from './components/ObjectifBloc';` puis, dans l'onglet suivi :

```tsx
        {tab === 'suivi' && (
          <>
            <p className="greeting">Salut {PRENOMS[profile.id]} 👋</p>
            <ObjectifBloc key={`obj-${weightsBump}`} profile={profile} />
            <StatCards key={weightsBump} profile={profile} />
            <ProfileView
```

- [ ] **Step 4: CSS** — dans `src/index.css` (section suivi) :

```css
/* ——— Bloc objectif ——— */
.obj-bloc {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}
.obj-pills {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
.obj-pill-type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--accent);
  color: #fff;
}
.obj-pill-reg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 10px;
  background: color-mix(in srgb, var(--accent-2) 60%, var(--surface));
  color: var(--text);
}
.obj-echeance {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--muted);
  margin-top: 10px;
}
.obj-echeance b {
  color: var(--text);
}
.obj-echeance.late b {
  color: var(--danger);
}
.obj-prog {
  margin-top: 12px;
}
.obj-kg {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.obj-kg small {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-left: 2px;
}
.obj-kg span {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-left: 2px;
}
.obj-bar {
  height: 7px;
  border-radius: 99px;
  background: var(--surface-2);
  margin-top: 9px;
  overflow: hidden;
}
.obj-bar span {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: var(--accent);
}
.obj-det {
  font-size: 11px;
  color: var(--muted);
  margin-top: 6px;
  line-height: 1.4;
}
.obj-plain {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
  margin-top: 12px;
}
.obj-plain b {
  color: var(--text);
}
.obj-comps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}
.obj-comps-label {
  width: 100%;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.cchip {
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  padding: 3px 10px;
  background: var(--surface-2);
  color: var(--text);
}
```

- [ ] **Step 5: Vert + commit** — `npm test && npm run typecheck && npm run lint` verts, puis :

```bash
git add src/components/ObjectifBloc.tsx src/App.tsx src/index.css tests/components.test.tsx
git commit -m "feat: bloc Objectif en tête de Mon suivi — type, échéance, progression, compléments"
```

---

### Task 6 : ProfilScreen — sections Objectif, Compléments, Régime

Fichiers : `src/components/ProfilScreen.tsx`, `src/index.css`, `tests/profil-screen.test.tsx`.

- [ ] **Step 1: Écrire les tests (rouge)** — dans `tests/profil-screen.test.tsx`, ajouter au describe `ProfilScreen (unité)` :

```tsx
  it('sections dédiées : objectif affiché et modifiable', async () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { name: 'Objectif', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Perte de poids' })).toBeChecked();
    expect(screen.getByLabelText('Échéance (optionnelle)')).toHaveValue('2026-12-15');

    await user.click(screen.getByRole('radio', { name: 'Maintien' }));
    fireEvent.change(screen.getByLabelText('Échéance (optionnelle)'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: "Enregistrer l'objectif" }));

    expect(loadProfile()).toMatchObject({ objectif: { type: 'maintien' } });
    expect(onProfileSaved).toHaveBeenCalled();
  });

  it('sections dédiées : compléments ajoutés et retirés, persistés', async () => {
    render(
      <ProfilScreen profile={{ ...profileMarc, complements: ['Whey'] }} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );
    const user = userEvent.setup();

    expect(screen.getByRole('button', { name: /Whey/ })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Ajouter un complément'), 'Zinc');
    await user.click(screen.getByRole('button', { name: /Ajouter/ }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les compléments' }));

    expect(loadProfile()).toMatchObject({ complements: ['Whey', 'Zinc'] });

    await user.click(screen.getByRole('button', { name: /Retirer Whey/ }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer les compléments' }));
    expect(loadProfile()).toMatchObject({ complements: ['Zinc'] });
  });

  it('sections dédiées : régime persisté', async () => {
    render(
      <ProfilScreen profile={profileMarc} onBack={onBack} onChangeProfile={onChangeProfile} onProfileSaved={onProfileSaved} onImported={onImported} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: 'Végétarien' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le régime' }));

    expect(loadProfile()).toMatchObject({ regime: 'vegetarien' });
  });
```

(Importer `fireEvent` en tête si absent.) Adapter aussi : le bouton « Enregistrer » de Mes infos devient `Enregistrer mes infos` (mettre à jour les tests existants qui cliquent `Enregistrer`). Vérifier le rouge.

- [ ] **Step 2: Implémenter** — réécrire `src/components/ProfilScreen.tsx` :

```tsx
import { useState } from 'react';
import { COMPLEMENTS_PRESETS, PRENOMS, REGIMES, normaliseComplement } from '../lib/model';
import type { ObjectifType, Regime, UserProfile } from '../lib/model';
import { ageDepuis, todayISO } from '../lib/dates';
import { saveProfile } from '../lib/storage';
import { ImportButton } from './ImportButton';
import { Icon } from './Icon';

type Section = 'infos' | 'objectif' | 'complements' | 'regime';

export function ProfilScreen({
  profile,
  onBack,
  onChangeProfile,
  onProfileSaved,
  onImported,
}: {
  profile: UserProfile;
  onBack: () => void;
  onChangeProfile: () => void;
  onProfileSaved?: (p: UserProfile) => void;
  onImported: () => void;
}) {
  const [dateNaissance, setDateNaissance] = useState(profile.dateNaissance);
  const [taille, setTaille] = useState(String(profile.taille));
  const [objectifType, setObjectifType] = useState<ObjectifType>(profile.objectif.type);
  const [echeance, setEcheance] = useState(profile.objectif.echeance ?? '');
  const [poidsObjectif, setPoidsObjectif] = useState(
    profile.poidsObjectif != null ? String(profile.poidsObjectif) : '',
  );
  const [complements, setComplements] = useState<string[]>([...profile.complements]);
  const [nouveauComplement, setNouveauComplement] = useState('');
  const [regime, setRegime] = useState<Regime>(profile.regime);
  const [savedSection, setSavedSection] = useState<Section | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maj = (section: Section, patch: Partial<UserProfile>) => {
    const updated: UserProfile = { ...profile, ...patch };
    saveProfile(updated);
    onProfileSaved?.(updated);
    setSavedSection(section);
  };

  const enregistrerInfos = () => {
    const cm = Number.parseInt(taille, 10);
    if (!dateNaissance || Number.isNaN(cm)) {
      setError('Formulaire incomplet : remplis ta date de naissance et ta taille.');
      return;
    }
    if (dateNaissance > todayISO()) {
      setError('La date de naissance ne peut pas être dans le futur.');
      return;
    }
    const ans = ageDepuis(dateNaissance);
    if (ans < 10 || ans > 100) {
      setError('Âge calculé invalide : entre 10 et 100 ans.');
      return;
    }
    if (cm < 120 || cm > 230) {
      setError('Taille invalide : entre 120 et 230 cm.');
      return;
    }
    setError(null);
    maj('infos', { dateNaissance, taille: cm });
  };

  const enregistrerObjectif = () => {
    const obj = poidsObjectif ? Number.parseFloat(poidsObjectif.replace(',', '.')) : undefined;
    if (poidsObjectif && (obj === undefined || obj < 30 || obj > 250)) {
      setError('Poids objectif invalide : entre 30 et 250 kg.');
      return;
    }
    setError(null);
    maj('objectif', {
      objectif: { type: objectifType, ...(echeance ? { echeance } : {}) },
      ...(obj != null ? { poidsObjectif: obj } : {}),
    });
  };

  const enregistrerComplements = () => maj('complements', { complements: [...complements] });

  const enregistrerRegime = () => maj('regime', { regime });

  const ajouterComplement = () => {
    const v = nouveauComplement.trim().slice(0, 40);
    if (!v) return;
    if (complements.some((c) => normaliseComplement(c) === normaliseComplement(v))) {
      setError('Ce complément est déjà sélectionné.');
      return;
    }
    setError(null);
    setComplements([...complements, v]);
    setNouveauComplement('');
  };

  const changerProfil = () => {
    if (
      window.confirm(
        `Changer de profil ? ${PRENOMS[profile.id]} restera sur ce téléphone avec ses données.`,
      )
    )
      onChangeProfile();
  };

  const fil = (s: Section) =>
    savedSection === s ? (
      <p className="muted" role="status">
        Enregistré ✓
      </p>
    ) : null;

  return (
    <div className="profil-screen">
      <button type="button" className="profil-back" onClick={onBack}>
        ← Retour
      </button>
      <h1>Profil</h1>

      <section className="profile-section">
        <h3>Mes infos</h3>
        <div className="onboarding-field">
          <label htmlFor="pf-naissance">Date de naissance</label>
          <input
            id="pf-naissance"
            type="date"
            value={dateNaissance}
            onChange={(e) => {
              setSavedSection(null);
              setError(null);
              setDateNaissance(e.target.value);
            }}
          />
          <p className="onb-hint">
            {dateNaissance
              ? `${ageDepuis(dateNaissance)} ans — calculé automatiquement.`
              : 'Sélectionne ta date de naissance.'}
          </p>
        </div>
        <div className="onboarding-field">
          <label htmlFor="pf-taille">Taille (cm)</label>
          <input
            id="pf-taille"
            type="number"
            inputMode="numeric"
            value={taille}
            onChange={(e) => {
              setSavedSection(null);
              setError(null);
              setTaille(e.target.value);
            }}
          />
        </div>
        <button type="button" className="btn profil-save" onClick={enregistrerInfos}>
          Enregistrer mes infos
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {fil('infos')}
      </section>

      <section className="profile-section">
        <h3>Objectif</h3>
        <div className="rline" role="radiogroup" aria-label="Type d'objectif">
          {(
            [
              ['perte', 'Perte de poids'],
              ['affiner', 'Affiner'],
              ['masse', 'Prise de masse'],
              ['maintien', 'Maintien'],
            ] as const
          ).map(([id, nom]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={objectifType === id}
              className={`rl${objectifType === id ? ' sel' : ''}`}
              onClick={() => {
                setSavedSection(null);
                setError(null);
                setObjectifType(id);
              }}
            >
              <span className="rl-dot" aria-hidden="true" />
              {nom}
            </button>
          ))}
        </div>
        <div className="onboarding-field">
          <label htmlFor="pf-echeance">Échéance (optionnelle)</label>
          <input
            id="pf-echeance"
            type="date"
            value={echeance}
            onChange={(e) => {
              setSavedSection(null);
              setEcheance(e.target.value);
            }}
          />
        </div>
        <div className="onboarding-field">
          <label htmlFor="pf-obj-poids">Poids objectif (kg)</label>
          <input
            id="pf-obj-poids"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={poidsObjectif}
            onChange={(e) => {
              setSavedSection(null);
              setError(null);
              setPoidsObjectif(e.target.value);
            }}
          />
        </div>
        <button type="button" className="btn profil-save" onClick={enregistrerObjectif}>
          Enregistrer l'objectif
        </button>
        {fil('objectif')}
      </section>

      <section className="profile-section">
        <h3>Compléments</h3>
        <div className="chips">
          {complements.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              onClick={() => {
                setSavedSection(null);
                setComplements(complements.filter((x) => x !== c));
              }}
            >
              {c}
              <span className="rm" aria-hidden="true">
                ✕
              </span>
              <span className="sr-only">{`Retirer ${c}`}</span>
            </button>
          ))}
        </div>
        <div className="addrow">
          <input
            value={nouveauComplement}
            maxLength={40}
            placeholder="Ajouter un complément…"
            aria-label="Ajouter un complément"
            onChange={(e) => {
              setError(null);
              setNouveauComplement(e.target.value);
            }}
          />
          <button type="button" onClick={ajouterComplement}>
            <Icon name="plus" size={13} /> Ajouter
          </button>
        </div>
        <button type="button" className="btn profil-save" onClick={enregistrerComplements}>
          Enregistrer les compléments
        </button>
        {fil('complements')}
      </section>

      <section className="profile-section">
        <h3>Régime</h3>
        <div className="rline" role="radiogroup" aria-label="Régime">
          {REGIMES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={regime === r.id}
              className={`rl${regime === r.id ? ' sel' : ''}`}
              onClick={() => {
                setSavedSection(null);
                setError(null);
                setRegime(r.id);
              }}
            >
              <span className="rl-dot" aria-hidden="true" />
              {r.nom}
            </button>
          ))}
        </div>
        <button type="button" className="btn profil-save" onClick={enregistrerRegime}>
          Enregistrer le régime
        </button>
        {fil('regime')}
      </section>

      <section className="profile-section">
        <h3>Semaine</h3>
        <ImportButton onImported={onImported} label="Importer un cycle (.md)" />
      </section>

      <section className="profile-section">
        <h3>Compte</h3>
        <button type="button" className="profil-switch" onClick={changerProfil}>
          Changer de profil
        </button>
      </section>

      <p className="muted profil-about">
        Rituel v{__APP_VERSION__} — vos données restent sur votre téléphone.
      </p>
    </div>
  );
}
```

Le test « compléments : retirer » cherche `Retirer Whey` (accessible name = texte visible + sr-only). Ajouter en CSS `.sr-only` si absent (`rg -n "sr-only" src/index.css`) :

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

et :

```css
.profil-save {
  width: 100%;
  margin-top: 16px;
}
.profil-switch {
  border: 1.5px solid var(--danger);
  background: var(--surface);
  color: var(--danger);
  border-radius: 999px;
  width: 100%;
  min-height: 48px;
  font: 600 13px Poppins, sans-serif;
  cursor: pointer;
}
```

(remplacer l'ancienne règle `.profil-switch` — vérifier avant avec `rg -n "profil-switch" src/` que seul ProfilScreen l'utilise). Poids objectif reste dans la section Objectif (déplacé depuis Mes infos — les tests de Step 11 de Task 4 qui le lisaient dans Mes infos sont mis à jour ici : `getByLabelText('Poids objectif (kg)')` inchangé, seule la section h3 change).

- [ ] **Step 3: Vert + commit** — `npm test && npm run typecheck && npm run lint` verts, puis :

```bash
git add src/components/ProfilScreen.tsx src/index.css tests/profil-screen.test.tsx
git commit -m "feat: écran Profil — sections Objectif, Compléments, Régime (enregistrement par section)"
```

---

### Task 7 : Séances en liste libre — le jour devient une recommandation

Fichiers : `src/components/Checklist.tsx` (prop `className`), `src/components/ProfileView.tsx`, `src/index.css`, `tests/components.test.tsx`.

- [ ] **Step 1: Checklist — prop `className`** — dans `src/components/Checklist.tsx` (le prop `renderLabel` vient du plan Herbes ; ici on ajoute seulement `className`) :

```tsx
export function Checklist({
  items,
  semaine,
  className,
  onChecksChange,
}: {
  items: ChecklistItem[];
  semaine: string;
  className?: string;
  onChecksChange?: (checks: Record<string, boolean>) => void;
}) {
```

et la balise racine :

```tsx
    <ul className={className ? `checklist ${className}` : 'checklist'}>
```

- [ ] **Step 2: Écrire les tests (rouge)** — dans `tests/components.test.tsx`, ajouter au describe `ProfileView` (après le test « renders the seances checklist ») :

```tsx
  it('séances : le préfixe jour devient une pastille « conseillé », le reste est la liste', () => {
    const data: ProfileData = {
      cibles: [],
      seances: [
        { id: 's-lun', label: 'Lundi — Muscu libre 10h30' },
        { id: 's-libre', label: 'Course ou repos' },
      ],
      rappels: [],
    };
    render(<ProfileView profile={profileV2('marc')} data={data} semaine="S40" />);

    expect(screen.getByText('Muscu libre 10h30')).toBeInTheDocument();
    expect(screen.getByText('conseillé lun.')).toBeInTheDocument();
    expect(screen.getByText('Course ou repos')).toBeInTheDocument();
    // pas de pastille sans préfixe jour
    expect(screen.getAllByText(/conseillé/)).toHaveLength(1);
    // le titre porte le compte
    expect(screen.getByText(/Séances de la semaine · 0\/2/)).toBeInTheDocument();
  });

  it('séances : le compte du titre se met à jour au cochage', async () => {
    const user = userEvent.setup();
    render(<ProfileView profile={profileV2('marc')} data={profileData} semaine="S40" />);
    await user.click(screen.getByRole('checkbox', { name: 'Full body A' }));

    expect(screen.getByText(/Séances de la semaine · 1\/2/)).toBeInTheDocument();
  });
```

⚠️ Le test « renders the seances checklist » existant cherche `getByRole('checkbox', { name: 'Full body A' })` — toujours valide (pas de préfixe jour). Vérifier le rouge : `npx vitest run tests/components.test.tsx -t "ProfileView"` → FAIL (pastille absente).

- [ ] **Step 3: Implémenter dans `src/components/ProfileView.tsx`** — imports :

```tsx
import { addWeight, getChecks, getWeights } from '../lib/storage';
import { compteChecklist } from '../lib/stats';
import { extraireJourLabel, jourAbrege, todayISO, formatDayMonth } from '../lib/dates';
```

états + render-phase reset (pattern repo, en plus de `syncedProfile`) :

```tsx
  const [checksMap, setChecksMap] = useState(() => getChecks(semaine));
  const [syncedSemaine, setSyncedSemaine] = useState(semaine);
  if (syncedSemaine !== semaine) {
    setSyncedSemaine(semaine);
    setChecksMap(getChecks(semaine));
  }
  const compte = compteChecklist(checksMap, data.seances);
```

section Séances :

```tsx
      <section className="profile-section">
        <h3>Séances de la semaine · {compte.faites}/{compte.total}</h3>
        <Checklist
          items={data.seances}
          semaine={semaine}
          className="checklist-seances"
          onChecksChange={(p) => setChecksMap((c) => ({ ...c, ...p }))}
          renderLabel={(it) => {
            const { jour, reste } = extraireJourLabel(it.label);
            return (
              <>
                {reste}
                {jour && <span className="seance-rec">conseillé {jourAbrege(jour)}</span>}
              </>
            );
          }}
        />
        <p className="onb-hint">
          Coche quand tu les fais — le jour n'est qu'une recommandation, tu t'organises comme tu veux.
        </p>
      </section>
```

- [ ] **Step 4: CSS** — dans `src/index.css` :

```css
/* ——— Séances : jour en recommandation ——— */
.checklist-seances label span:first-of-type {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.seance-rec {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  background: var(--surface-2);
  border-radius: 999px;
  padding: 3px 8px;
}
```

- [ ] **Step 5: Vert + commit** — `npm test && npm run typecheck && npm run lint` verts, puis :

```bash
git add src/components/Checklist.tsx src/components/ProfileView.tsx src/index.css tests/components.test.tsx
git commit -m "feat: séances en liste libre — le jour devient une pastille « conseillé »"
```

---

### Task 8 : e2e — storageStates v2, parcours migration et suivi

Fichiers : `tests/e2e/cuisine.spec.ts`, `tests/e2e/dock.spec.ts`, `tests/e2e/import-navigation.spec.ts`, `tests/e2e/onboarding-mobile.spec.ts`, `tests/e2e/suivi-objectif.spec.ts` (nouveau).

- [ ] **Step 1: Migrer les storageStates** — dans les 3 specs (`cuisine`, `dock`, `import-navigation`), remplacer la valeur de `sportapp:profile` :

```ts
{ name: 'sportapp:profile', value: JSON.stringify({ id: 'marc', age: 41, taille: 178 }) },
```

par :

```ts
{
  name: 'sportapp:profile',
  value: JSON.stringify({
    id: 'marc',
    dateNaissance: '1985-04-12',
    taille: 178,
    objectif: { type: 'perte', echeance: '2026-12-15' },
    complements: [],
    regime: 'aucun',
  }),
},
```

- [ ] **Step 2: Réécrire `tests/e2e/onboarding-mobile.spec.ts`** :

```ts
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

test.describe('Onboarding 4 étapes — mobile', () => {
  test('étape 2 : aucun débordement horizontal et champs dans le viewport', async ({ page }) => {
    const largeur = page.viewportSize()!.width;
    await page.goto('/');
    await page.getByRole('button', { name: /Mélanie/ }).click();

    await expect(page.getByLabel('Date de naissance')).toBeVisible();
    await assertPasDeDebordement(page);

    for (const label of ['Date de naissance', 'Taille (cm)']) {
      const champ = page.getByLabel(label);
      const box = (await champ.boundingBox())!;
      expect(box.x, `${label} commence dans le viewport`).toBeGreaterThanOrEqual(0);
      expect(
        box.x + box.width,
        `${label} tient entièrement dans le viewport`,
      ).toBeLessThanOrEqual(largeur + OVERFLOW_TOLERANCE);
    }
  });

  test('parcours complet : poids/date/taille → objectif → personnalisation → shell', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Mélanie/ }).click();

    await page.getByLabel('Poids (kg)').fill('62.4');
    await page.getByLabel('Date de naissance').fill('1987-03-02');
    await page.getByLabel('Taille (cm)').fill('165');
    await assertPasDeDebordement(page);
    await page.getByRole('button', { name: /Continuer/ }).click();

    await expect(page.getByRole('heading', { name: /Ton objectif/ })).toBeVisible();
    await page.getByRole('radio', { name: /Affiner/ }).click();
    await page.getByRole('button', { name: /Continuer/ }).click();

    await expect(page.getByRole('heading', { name: /Personnalisation/ })).toBeVisible();
    await page.getByRole('button', { name: 'Créatine' }).click();
    await page.getByRole('radio', { name: 'Keto' }).click();
    await page.getByRole('button', { name: /C'est parti/ }).click();

    // Profil enregistré + semaine d'exemple auto-chargée → shell direct
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
    const profil = await page.evaluate(() => JSON.parse(localStorage.getItem('sportapp:profile')!));
    expect(profil).toEqual({
      id: 'melanie',
      dateNaissance: '1987-03-02',
      taille: 165,
      objectif: { type: 'affiner' },
      complements: ['Créatine'],
      regime: 'keto',
    });
  });

  test('migration : profil ancien → onboarding prérempli à l étape 2', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sportapp:profile', JSON.stringify({ id: 'melanie', age: 38, taille: 165 }));
      localStorage.setItem(
        'sportapp:weights:melanie',
        JSON.stringify([{ date: '2026-09-08', kg: 62.1 }]),
      );
    });
    await page.goto('/');

    await expect(page.getByText(/Une mise à jour/)).toBeVisible();
    await expect(page.getByText(/non modifiable ici/)).toBeVisible();
    await expect(page.getByLabel('Poids (kg)')).toHaveValue(62.1);
    await expect(page.getByLabel('Date de naissance')).toHaveValue('');

    await page.getByLabel('Date de naissance').fill('1987-03-02');
    await page.getByRole('button', { name: /Continuer/ }).click();
    await page.getByRole('button', { name: /Continuer/ }).click();
    await page.getByRole('button', { name: /C'est parti/ }).click();

    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
    const profil = await page.evaluate(() => JSON.parse(localStorage.getItem('sportapp:profile')!));
    expect(profil).toEqual({
      id: 'melanie',
      dateNaissance: '1987-03-02',
      taille: 165,
      objectif: { type: 'perte' },
      complements: [],
      regime: 'aucun',
    });
  });
});

test.describe('Écran Profil — mobile', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: ORIGIN,
          localStorage: [
            {
              name: 'sportapp:profile',
              value: JSON.stringify({
                id: 'melanie',
                dateNaissance: '1987-03-02',
                taille: 165,
                objectif: { type: 'perte', echeance: '2026-12-15' },
                complements: ['Whey'],
                regime: 'keto',
              }),
            },
          ],
        },
      ],
    },
  });

  test('profil : sections v2 sans débordement horizontal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mon profil' }).click();

    await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
    await expect(page.getByLabel('Date de naissance')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Objectif', level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Compléments', level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Régime', level: 3 })).toBeVisible();
    await assertPasDeDebordement(page);
  });
});
```

- [ ] **Step 3: Nouveau `tests/e2e/suivi-objectif.spec.ts`** :

```ts
import { expect, test } from '@playwright/test';

const ORIGIN = process.env.E2E_PREVIEW ? 'http://localhost:4173' : 'http://localhost:5173';

test.describe('Mon suivi — bloc objectif et carte Poids', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: ORIGIN,
          localStorage: [
            {
              name: 'sportapp:profile',
              value: JSON.stringify({
                id: 'marc',
                dateNaissance: '1985-04-12',
                taille: 178,
                poidsObjectif: 74,
                objectif: { type: 'perte', echeance: '2026-12-15' },
                complements: ['Whey', 'Créatine'],
                regime: 'keto',
              }),
            },
            {
              name: 'sportapp:weights:marc',
              value: JSON.stringify([
                { date: '2026-08-12', kg: 82.8 },
                { date: '2026-09-07', kg: 79.1 },
                { date: '2026-09-09', kg: 78.4 },
              ]),
            },
          ],
        },
      ],
    },
  });

  test('bloc objectif, carte Poids et séances en liste libre', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mon suivi' }).click();

    const obj = page.locator('.obj-bloc');
    await expect(obj).toBeVisible();
    await expect(obj).toContainText('Perte de poids');
    await expect(obj).toContainText('Keto');
    await expect(obj).toContainText('Échéance :');
    await expect(obj).toContainText('restants');

    // carte Poids seule (les autres stat-cards ont disparu)
    await expect(page.locator('.stat-card-hero')).toBeVisible();
    await expect(page.getByText('Kcal du jour')).toHaveCount(0);
    await expect(page.getByText('Courses')).toHaveCount(0);

    // séances : pastilles conseillé, compte dans le titre
    await expect(page.locator('.seance-rec').first()).toContainText(/conseillé/);
    await expect(page.getByText(/Séances de la semaine · \d+\/\d+/)).toBeVisible();
  });

  test('aucun débordement horizontal sur le suivi (320 et 375 gérés par les projets)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mon suivi' }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 4: Vert + commit** — `npm run e2e` vert (serveur dev lancé par la config ; `npx playwright install webkit chromium` si clone neuf), puis :

```bash
git add tests/e2e/
git commit -m "test: e2e profil v2 — storageStates migrés, parcours 4 étapes, migration, bloc objectif"
```

---

### Task 9 : Docs + gates complets

Fichiers : `AGENTS.md`, `README.md`, `CHANGELOG.md`, `ai/context/design-system.md`, `ai/context/ui-guideline.md`.

- [ ] **Step 1: AGENTS.md** —
  - ligne « onboarding en 2 étapes choisit le profil… collecte les bases (poids, âge, taille, objectifs) » → « onboarding en **4 étapes** (profil, infos avec date de naissance, objectif 4 types + échéance, compléments & régime) ; une **migration préremplie** relance l'onboarding quand un profil de l'ancienne forme est détecté » ;
  - section Storage, clé `sportapp:profile` → shape v2 :

```md
- `sportapp:profile` — profil actif, **shape v2** : `{ id: 'marc'|'melanie', dateNaissance: 'AAAA-MM-JJ', taille, poidsObjectif?, objectif: { type: 'perte'|'affiner'|'masse'|'maintien', echeance? }, complements: string[], regime }`. L'ancienne forme `{ id, age, taille }` est lue par `loadProfilLegacy()` (read-only) pour préremplir l'onboarding de migration, puis écrasée au save
```

- [ ] **Step 2: CHANGELOG.md** — compléter la section `[Non publié]` (créée par le plan Herbes) :

```md
### Ajouté
- Profil v2 : date de naissance (l'âge devient calculé), objectif explicite (perte / affiner / masse / maintien) avec échéance, compléments (presets + libre), régime descriptif
- Onboarding en 4 étapes avec migration préremplie (le profil ancien est mis à niveau au premier lancement)
- Bloc « Objectif » en tête de Mon suivi : type, échéance (J-restants / dépassée), progression pesée → cible, compléments
### Modifié
- Stat-cards réduites à la carte Poids (variation en kg vs 7 jours)
- Séances en liste libre : le jour n'est plus qu'une recommandation (« conseillé lun. »)
- Écran Profil réorganisé : Mes infos, Objectif, Compléments, Régime
### Retiré
- Objectif kcal/jour (saisie et affichage), âge saisi à la main, cartes Courses / Kcal / Séances du suivi
```

- [ ] **Step 3: README + ai-context** — `rg -n "âge|age|onboarding" README.md` : mettre à jour si le parcours y est décrit. Dans `ai/context/design-system.md` (table des familles) et `ai/context/ui-guideline.md`, ajouter les familles nouvelles si le format le permet : `.rcards/.rcard` (cartes radio 2 colonnes), `.rline/.rl` (radios en ligne), `.chips/.chip/.addrow` (compléments), `.obj-bloc` (+ pills/échéance/barre), `.onb-btnrow/.onb-next/.onb-back` (boutons d'étapes), `.stat-card-hero`, `.seance-rec`. Règle : tokens = variables CSS de `src/index.css`, aucun hex en dur (sauf texte blanc sur basilic).

- [ ] **Step 4: Gates complets** — `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e` : tout vert, zéro débordement 320/375. Puis `npm run preview` : parcours manuel — onboarding vierge 4 étapes, migration préremplie (poser l'ancienne clé à la main en console), bloc objectif (interrupteurs : 4 types, échéance dépassée, sans compléments), séances cochables, édition Profil par section, données corrompues (`sportapp:profile` invalide) → onboarding propre sans crash.

- [ ] **Step 5: Commits**

```bash
git add -A
git commit -m "docs: profil v2 dans AGENTS/CHANGELOG/ai-context (onboarding 4 étapes, shape sportapp:profile v2)"
```

---

## Vérification finale

- [ ] `npm test && npm run typecheck && npm run lint && npm run build` — vert.
- [ ] `npm run e2e` — vert sur 375 et 320 (débordements inclus).
- [ ] Parcours manuel `npm run preview` : onboarding 4 étapes (retours, valeurs conservées), migration préremplie (poids prérempli, date seule à compléter), bloc objectif (4 types, échéance dans N jours / dépassée / absente, barre perte et masse), carte Poids seule avec variation kg, séances pastilles + compte, Profil 4 sections.
- [ ] Storage : `sportapp:profile` contient la v2 après onboarding ; une clé v1 posée à la main déclenche la migration puis est écrasée ; une clé corrompue → warn + remove + onboarding (jamais de crash).
- [ ] Contrat .md intouché : `npm test` couvre parse v1/v2 inchangé ; les ids de coches `seances:…` n'ont pas bougé (les coches existantes survivent).
- [ ] Le bump de version (`npm version …` + CHANGELOG renommé + tag) reste **volontaire** et séparé, selon le rituel release du repo.


