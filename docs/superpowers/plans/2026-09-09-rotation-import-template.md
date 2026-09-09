# Rotation menus, convention template & import .md — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'app stocke plusieurs semaines (une par menu du cycle A/B/C/D), ouvre sur celle qui contient aujourd'hui, navigue par chevrons dans la bannière, réaccepte l'import .md groupé (4 fichiers d'un coup) ; la convention template + prompt IA (`docs/templates/`) permet de régénérer un cycle complet sans jamais perdre les données de suivi.

**Architecture:** Le parser et le contrat .md ne changent pas. Nouvelle clé `sportapp:weeks` (Record par id de semaine) avec migration depuis `sportapp:week`. Sélection de la semaine courante = fonction pure (`src/lib/weeks.ts`). Navigation en session via l'état `selection` dans `App.tsx`. Import = `ImportButton` restauré (code retiré en `6e4884e`, ressuscité avec `multiple`).

**Tech Stack:** React 18 + TypeScript strict, vitest + Testing Library (happy-dom), Playwright (WebKit 375/320), CSS sémantique dans `src/index.css` (tokens Nutrigo), zéro nouvelle dépendance.

**Spécification :** `docs/superpowers/specs/2026-09-09-rotation-import-template-design.md`

**Gates** — avant tout commit : `npm test && npm run typecheck && npm run lint && npm run build` doit passer. Chaque tâche se termine par `npm test` ; la Task 9 fait tourner la suite complète (y compris e2e).

---

### Task 1: `src/lib/weeks.ts` — tri + sélection de la semaine courante (TDD)

**Files:**
- Create: `src/lib/weeks.ts`
- Test: `tests/weeks.test.ts` (nouveau fichier)

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/weeks.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { indexSemaineCourante, semaineCourante, semainesTriees } from '../src/lib/weeks';
import type { ImportedWeek } from '../src/lib/model';

const semaine = (semaine: string, du: string, au: string, menu = 'A'): ImportedWeek => ({
  raw: '',
  importedAt: '',
  data: {
    meta: { semaine, menu, du, au },
    courses: [],
    menu: [],
    batch: [],
    profiles: {
      marc: { cibles: [], seances: [], rappels: [] },
      melanie: { cibles: [], seances: [], rappels: [] },
    },
  },
});

describe('weeks: semaineCourante', () => {
  it('retourne null sans semaine', () => {
    expect(semaineCourante([], '2026-09-15')).toBeNull();
  });

  it('retourne la semaine contenant aujourd\u2019hui', () => {
    const s = [semaine('2026-S37', '2026-09-07', '2026-09-13')];
    expect(semaineCourante(s, '2026-09-09')?.data.meta.semaine).toBe('2026-S37');
  });

  it('bordures : du et au comptent comme « contient aujourd\u2019hui »', () => {
    const s = [semaine('2026-S38', '2026-09-14', '2026-09-20')];
    expect(semaineCourante(s, '2026-09-14')?.data.meta.semaine).toBe('2026-S38');
    expect(semaineCourante(s, '2026-09-20')?.data.meta.semaine).toBe('2026-S38');
  });

  it('gap entre deux semaines : la prochaine \u00e0 venir', () => {
    const s = [
      semaine('2026-S37', '2026-09-07', '2026-09-13'),
      semaine('2026-S39', '2026-09-21', '2026-09-27'),
    ];
    expect(semaineCourante(s, '2026-09-16')?.data.meta.semaine).toBe('2026-S39');
  });

  it('apr\u00e8s toutes les semaines : la derni\u00e8re stock\u00e9e', () => {
    const s = [semaine('2026-S38', '2026-09-14', '2026-09-20')];
    expect(semaineCourante(s, '2026-10-05')?.data.meta.semaine).toBe('2026-S38');
  });

  it('l\u2019ordre d\u2019import n\u2019a pas d\u2019importance', () => {
    const s = [
      semaine('2026-S39', '2026-09-21', '2026-09-27', 'C'),
      semaine('2026-S38', '2026-09-14', '2026-09-20', 'B'),
    ];
    expect(semaineCourante(s, '2026-09-22')?.data.meta.semaine).toBe('2026-S39');
    expect(semainesTriees(s).map((w) => w.data.meta.semaine)).toEqual(['2026-S38', '2026-S39']);
  });
});

describe('weeks: indexSemaineCourante', () => {
  it('donne l\u2019index de la semaine courante dans la liste pass\u00e9e', () => {
    const s = [
      semaine('2026-S39', '2026-09-21', '2026-09-27', 'C'),
      semaine('2026-S38', '2026-09-14', '2026-09-20', 'B'),
    ];
    // 2026-09-16 est dans S38 -> index 1 dans [S39, S38]
    expect(indexSemaineCourante(s, '2026-09-16')).toBe(1);
    // 2026-09-22 est dans S39 -> index 0
    expect(indexSemaineCourante(s, '2026-09-22')).toBe(0);
  });

  it('liste vide -> 0', () => {
    expect(indexSemaineCourante([], '2026-09-22')).toBe(0);
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run tests/weeks.test.ts`
Expected: FAIL — « Failed to resolve import "../src/lib/weeks" »

- [ ] **Step 3: Implémenter `src/lib/weeks.ts`**

```ts
import type { ImportedWeek } from './model';

const triParDu = (a: ImportedWeek, b: ImportedWeek): number =>
  a.data.meta.du.localeCompare(b.data.meta.du);

export const semainesTriees = (semaines: ImportedWeek[]): ImportedWeek[] =>
  [...semaines].sort(triParDu);

// 1) la semaine contenant today (du <= today <= au) · 2) la prochaine à venir ·
// 3) sinon la dernière stockée (cycle expiré — l'app ne se vide jamais).
export const semaineCourante = (semaines: ImportedWeek[], today: string): ImportedWeek | null => {
  if (!semaines.length) return null;
  const tri = semainesTriees(semaines);
  return (
    tri.find((w) => w.data.meta.du <= today && today <= w.data.meta.au) ??
    tri.find((w) => w.data.meta.du > today) ??
    tri[tri.length - 1]
  );
};

export const indexSemaineCourante = (semaines: ImportedWeek[], today: string): number => {
  if (!semaines.length) return 0;
  const courante = semaineCourante(semaines, today);
  const idx = semaines.findIndex((w) => w.data.meta.semaine === courante?.data.meta.semaine);
  return idx >= 0 ? idx : 0;
};
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run tests/weeks.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/weeks.ts tests/weeks.test.ts
git commit -m "feat: sélection de la semaine courante (lib weeks)"
```

---

### Task 2: Storage multi-semaines — `sportapp:weeks` + migration (TDD)

**Files:**
- Modify: `src/lib/storage.ts`
- Test: `tests/storage.test.ts` (ajout d'un describe + imports)

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/storage.test.ts`, compléter la ligne d'imports (ligne 2) :

```ts
import { addWeight, getChecks, getWeights, loadProfile, loadWeek, loadWeeks, removeProfile, saveProfile, saveWeek, setCheck, upsertWeek, type WeightEntry } from '../src/lib/storage';
```

Puis ajouter en fin de fichier (après le describe `dates: todayKey`) :

```ts
describe('storage: multi-semaines', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadWeeks retourne {} silencieusement sans aucune clé', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadWeeks()).toEqual({});
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('upsertWeek puis loadWeeks font l\u2019aller-retour', () => {
    const raw = '---\nsemaine: 2026-S38\n---\n';
    upsertWeek(raw, week());
    expect(loadWeeks()).toEqual({
      '2026-S38': { raw, data: week(), importedAt: expect.any(String) },
    });
  });

  it('upsertWeek remplace la m\u00eame semaine et pr\u00e9serve les autres', () => {
    const s38 = { ...week(), meta: { ...week().meta, semaine: '2026-S38' } };
    const s39 = { ...week(), meta: { ...week().meta, semaine: '2026-S39' } };
    upsertWeek('raw-a', s38);
    upsertWeek('raw-b', s39);
    upsertWeek('raw-a2', s38);
    const semaines = loadWeeks();
    expect(Object.keys(semaines).sort()).toEqual(['2026-S38', '2026-S39']);
    expect(semaines['2026-S38'].raw).toBe('raw-a2');
    expect(semaines['2026-S39'].raw).toBe('raw-b');
  });

  it('migration : sportapp:week pr\u00e9sent \u2192 recopi\u00e9 dans sportapp:weeks, ancienne cl\u00e9 intacte', () => {
    const raw = '---\nsemaine: 2026-S37\n---\n';
    saveWeek(raw, { ...week(), meta: { ...week().meta, semaine: '2026-S37' } });
    const semaines = loadWeeks();
    expect(semaines['2026-S37']).toBeDefined();
    expect(localStorage.getItem('sportapp:weeks')).not.toBeNull();
    expect(localStorage.getItem('sportapp:week')).not.toBeNull();
  });

  it('JSON invalide \u2192 {} + cl\u00e9 retir\u00e9e + warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('sportapp:weeks', '{oops');
    expect(loadWeeks()).toEqual({});
    expect(localStorage.getItem('sportapp:weeks')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Clé corrompue ignorée : sportapp:weeks');
    warnSpy.mockRestore();
  });

  it('entr\u00e9e corrompue retir\u00e9e silencieusement, les autres gard\u00e9es', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bonne = {
      raw: 'raw',
      data: { meta: { semaine: '2026-S40', menu: 'D', du: '2026-09-28', au: '2026-10-04' } },
      importedAt: '2026-09-09T10:00:00.000Z',
    };
    localStorage.setItem(
      'sportapp:weeks',
      JSON.stringify({ semaines: { '2026-S38': { raw: 'x' }, '2026-S40': bonne } }),
    );
    const semaines = loadWeeks();
    expect(Object.keys(semaines)).toEqual(['2026-S40']);
    expect(warnSpy).toHaveBeenCalledWith('Semaine corrompue ignorée : 2026-S38');
    warnSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL — « loadWeeks is not exported » / « upsertWeek is not exported »

- [ ] **Step 3: Implémenter dans `src/lib/storage.ts`**

Ajouter la constante près des autres (ligne 3-6) :

```ts
const WEEKS_KEY = 'sportapp:weeks';
```

Ajouter après `loadWeek` (après la ligne 40) :

```ts
const estSemaineValide = (v: unknown): v is ImportedWeek =>
  isPlainObject(v) &&
  typeof v.raw === 'string' &&
  typeof v.importedAt === 'string' &&
  isPlainObject(v.data) &&
  isPlainObject(v.data.meta) &&
  typeof v.data.meta.semaine === 'string';

// Lecture du stock multi-semaines. Garde de forme PAR ENTRÉE : une semaine
// corrompue est retirée de la mémoire (warn), les autres sont gardées.
// Si le stock est absent/vide, l'ancienne clé sportapp:week est migrée dedans
// (l'ancienne clé reste en place, non écrite).
export const loadWeeks = (): Record<string, ImportedWeek> => {
  const raw = localStorage.getItem(WEEKS_KEY);
  if (raw === null) return migrerAncienneSemaine();
  const parsed = safeParse<unknown>(WEEKS_KEY, raw, null);
  if (!isPlainObject(parsed) || !isPlainObject(parsed.semaines)) {
    console.warn(`Semaines corrompues ignorées : ${WEEKS_KEY}`);
    localStorage.removeItem(WEEKS_KEY);
    return migrerAncienneSemaine();
  }
  const semaines: Record<string, ImportedWeek> = {};
  for (const [id, entry] of Object.entries(parsed.semaines)) {
    if (estSemaineValide(entry)) semaines[id] = entry;
    else console.warn(`Semaine corrompue ignorée : ${id}`);
  }
  return semaines;
};

const migrerAncienneSemaine = (): Record<string, ImportedWeek> => {
  const ancienne = loadWeek();
  if (!ancienne) return {};
  const semaines = { [ancienne.data.meta.semaine]: ancienne };
  localStorage.setItem(WEEKS_KEY, JSON.stringify({ semaines }));
  return semaines;
};

// Même meta.semaine -> remplace ; les autres semaines restent.
export const upsertWeek = (raw: string, data: WeeklyData): void => {
  const semaines = loadWeeks();
  semaines[data.meta.semaine] = {
    raw,
    data,
    importedAt: new Date().toISOString(),
  } satisfies ImportedWeek;
  localStorage.setItem(WEEKS_KEY, JSON.stringify({ semaines }));
};
```

Note : `isPlainObject` est déclaré plus bas dans le fichier (ligne 42) — les fonctions fléchées sont évaluées à l'appel, l'ordre de déclaration est sans effet ici.

- [ ] **Step 4: Vérifier que tous les tests storage passent**

Run: `npx vitest run tests/storage.test.ts`
Expected: PASS (tous, y compris les 6 nouveaux)

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts tests/storage.test.ts
git commit -m "feat: storage multi-semaines (sportapp:weeks + migration)"
```

---

### Task 3: ImportButton restauré — import groupé multiple (TDD)

**Files:**
- Create: `src/components/ImportButton.tsx`
- Modify: `src/index.css` (bloc `.import`)
- Test: `tests/components.test.tsx` (ajout d'un describe + imports)

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/components.test.tsx`, compléter les imports en tête :

```ts
import { ImportButton } from '../src/components/ImportButton';
import { loadWeeks, upsertWeek } from '../src/lib/storage';
import { parseWeeklyFile } from '../src/lib/parse';
```

Ajouter la fixture (au niveau module, après la fixture `items`) :

```ts
// Mini-semaine valide : doit parser avec 0 warning (toutes les sections, aucune
// ligne hors format).
const mdSemaine = (semaine: string, du: string, au: string, menu = 'A', plat = 'Poulet rôti') =>
  `---
semaine: ${semaine}
menu: ${menu}
du: ${du}
au: ${au}
---

## Courses

### Proteines
- [ ] ${plat} 600 g

### Keto
- [ ] Avocats ×3-4

## Menu

### Lundi
- dejeuner-marc: ${plat}
- dejeuner-melanie: ${plat} version keto
- diner-famille: ${plat} au four
- diner-melanie: ${plat} version keto
- batch: Doubler ${plat}

### Mardi
- dejeuner-marc: Restes de ${plat}
- dejeuner-melanie: Box ${plat}
- diner-famille: ${plat} pâtes
- diner-melanie: ${plat} sans pâtes

## Batch

### Rituel dimanche
- 0-5 min · Four à 180° — egg muffins ×10

### Micro-batch
- lundi: doubler le plat

- [ ] Egg muffins ×10

## Marc

### Cibles
- 2 450 kcal

### Seances
- [ ] Lundi — Muscu

### Rappels
- Pesée lun/mer/ven

## Melanie

### Cibles
- 1 450 kcal

### Seances
- [ ] Mardi — Pilates

### Rappels
- Jeûne 16:8
`;
```

Ajouter le describe (en fin de fichier) :

```tsx
describe('ImportButton', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const fichier = (nom: string, contenu: string) =>
    new File([contenu], nom, { type: 'text/markdown' });

  it('importe plusieurs fichiers en une fois et résume', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();
    const { container } = render(<ImportButton onImported={onImported} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input,
      fichier('2026-S38-menu-b.md', mdSemaine('2026-S38', '2026-09-14', '2026-09-20', 'B', 'Chili')),
      fichier('2026-S39-menu-c.md', mdSemaine('2026-S39', '2026-09-21', '2026-09-27', 'C', 'Basquaise')),
    );
    expect(Object.keys(loadWeeks()).sort()).toEqual(['2026-S38', '2026-S39']);
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/2 semaine\(s\) importée\(s\)/);
  });

  it('un fichier invalide n\u2019empêche pas les autres (erreur nominative)', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImportButton onImported={() => {}} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input,
      fichier('casse.md', 'pas de frontmatter'),
      fichier('ok.md', mdSemaine('2026-S38', '2026-09-14', '2026-09-20')),
    );
    expect(Object.keys(loadWeeks())).toEqual(['2026-S38']);
    expect(screen.getByRole('alert')).toHaveTextContent(/casse\.md/);
  });

  it('demande confirmation avant de remplacer une semaine existante', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { data } = parseWeeklyFile(mdSemaine('2026-S38', '2026-09-14', '2026-09-20'));
    upsertWeek('ancien', data);
    const { container } = render(<ImportButton onImported={() => {}} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(
      input,
      fichier('2026-S38-menu-b.md', mdSemaine('2026-S38', '2026-09-14', '2026-09-20')),
    );
    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(loadWeeks()['2026-S38'].raw).toBe('ancien');
    confirmSpy.mockReturnValue(true);
    await user.upload(
      input,
      fichier('2026-S38-menu-b.md', mdSemaine('2026-S38', '2026-09-14', '2026-09-20')),
    );
    expect(loadWeeks()['2026-S38'].raw).not.toBe('ancien');
    confirmSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run tests/components.test.tsx`
Expected: FAIL — « Failed to resolve import "../src/components/ImportButton" »

- [ ] **Step 3: Créer `src/components/ImportButton.tsx`**

```tsx
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { WeeklyData } from '../lib/model';
import { parseWeeklyFile } from '../lib/parse';
import { loadWeeks, upsertWeek } from '../lib/storage';

export function ImportButton({
  onImported,
  label = 'Importer un .md',
}: {
  onImported: () => void;
  label?: string;
}) {
  const [erreur, setErreur] = useState('');
  const [resume, setResume] = useState('');

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!fichiers.length) return;
    const valides: { raw: string; data: WeeklyData }[] = [];
    const invalides: string[] = [];
    let warningsTotal = 0;
    for (const fichier of fichiers) {
      try {
        const raw = await fichier.text();
        const { data, warnings } = parseWeeklyFile(raw);
        warningsTotal += warnings.length;
        valides.push({ raw, data });
      } catch {
        invalides.push(fichier.name);
      }
    }
    const presentes = loadWeeks();
    const aRemplacer = valides
      .map((v) => v.data.meta.semaine)
      .filter((s) => !!presentes[s]);
    if (aRemplacer.length && !window.confirm(`Remplacer : ${aRemplacer.join(', ')} ?`)) return;
    for (const v of valides) upsertWeek(v.raw, v.data);
    setErreur(invalides.length ? `Fichier(s) invalide(s) : ${invalides.join(', ')}` : '');
    setResume(
      valides.length
        ? `${valides.length} semaine(s) importée(s)${warningsTotal ? ` · ⚠ ${warningsTotal} ligne(s) ignorée(s)` : ''}`
        : '',
    );
    if (valides.length) onImported();
  };

  return (
    <div className="import">
      <label className="btn">
        {label}
        <input
          type="file"
          accept=".md,text/markdown"
          multiple
          className="sr-only"
          onChange={onChange}
        />
      </label>
      {erreur && (
        <p className="error" role="alert">
          {erreur}
        </p>
      )}
      {resume && (
        <p className="muted warn-line" role="status">
          ✓ {resume}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Ajouter le CSS `.import` dans `src/index.css`**

À la suite du bloc `.error` (vers la ligne 751, dans la section des formulaires/profil) :

```css
.import {
  display: grid;
  gap: 8px;
  justify-items: start;
}
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npx vitest run tests/components.test.tsx`
Expected: PASS (tous, y compris les 3 nouveaux)

- [ ] **Step 6: Commit**

```bash
git add src/components/ImportButton.tsx src/index.css tests/components.test.tsx
git commit -m "feat: import .md groupé restauré dans le profil"
```

---

### Task 4: WeekBanner — chevrons de navigation (TDD)

**Files:**
- Modify: `src/components/WeekBanner.tsx`
- Modify: `src/index.css` (`.banner-nav`, `.week-banner-main`)
- Test: `tests/components.test.tsx` (describe `WeekBanner` existant, ligne ~992)

- [ ] **Step 1: Écrire les tests qui échouent**

Remplacer le describe `WeekBanner` existant dans `tests/components.test.tsx` par :

```tsx
describe('WeekBanner', () => {
  const meta = { semaine: '2026-S39', menu: 'A', du: '2026-09-21', au: '2026-09-27' };

  it('affiche le menu courant en pill à côté du titre', () => {
    render(<WeekBanner meta={meta} />);
    const pill = screen.getByText('Menu A');
    expect(pill).toHaveClass('menu-pill');
    expect(pill.parentElement).toHaveClass('week-title-row');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semaine 2026-S39');
  });

  it('chevrons absents sans callbacks (une seule semaine)', () => {
    render(<WeekBanner meta={meta} />);
    expect(screen.queryByRole('button', { name: 'Semaine précédente' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Semaine suivante' })).toBeNull();
  });

  it('navigue par chevrons et désactive aux bornes', async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<WeekBanner meta={meta} onPrev={onPrev} onNext={onNext} hasPrev={false} hasNext />);
    const prev = screen.getByRole('button', { name: 'Semaine précédente' });
    const next = screen.getByRole('button', { name: 'Semaine suivante' });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();
    await user.click(next);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run tests/components.test.tsx`
Expected: FAIL — « chevrons absents » (le test `chevrons absents sans callbacks` passe déjà, mais `navigue par chevrons` échoue : boutons introuvables)

- [ ] **Step 3: Réécrire `src/components/WeekBanner.tsx`**

```tsx
import type { WeekMeta } from '../lib/model';
import { formatDayMonth } from '../lib/dates';

export function WeekBanner({
  meta,
  onOpenProfile,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: {
  meta: WeekMeta;
  onOpenProfile?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  const nav = !!(onPrev || onNext);
  return (
    <header className="week-banner">
      {nav && (
        <button
          type="button"
          className="banner-nav"
          aria-label="Semaine précédente"
          onClick={onPrev}
          disabled={!hasPrev}
        >
          ‹
        </button>
      )}
      <div className="week-banner-main">
        <div className="week-title-row">
          <h1 className="week-title">Semaine {meta.semaine}</h1>
          <span className="menu-pill">Menu {meta.menu}</span>
        </div>
        {meta.titre && <p className="muted">{meta.titre}</p>}
        <p>
          {formatDayMonth(meta.du)} → {formatDayMonth(meta.au)}
        </p>
      </div>
      {nav && (
        <button
          type="button"
          className="banner-nav"
          aria-label="Semaine suivante"
          onClick={onNext}
          disabled={!hasNext}
        >
          ›
        </button>
      )}
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

- [ ] **Step 4: Ajouter le CSS dans `src/index.css`**

Après le bloc `.week-banner p` (vers la ligne 188) :

```css
.week-banner-main {
  flex: 1;
  min-width: 0;
}

.banner-nav {
  flex-shrink: 0;
  min-width: 48px;
  min-height: 48px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-size: 22px;
  line-height: 1;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.banner-nav:disabled {
  opacity: 0.35;
}

.banner-nav:not(:disabled):active {
  background: var(--accent);
  border-color: var(--accent);
  color: #272932;
}
```

Et dans `.week-title` (ligne 190), ajouter la troncature :

```css
.week-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.01em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npx vitest run tests/components.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/WeekBanner.tsx src/index.css tests/components.test.tsx
git commit -m "feat: navigation semaines par chevrons dans la bannière"
```

---

### Task 4.5: Vérification intermédiaire

- [ ] **Step 1: Gates rapides**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tout PASS (223 tests actuels + 9 weeks + 6 storage + 3 import + 2 banner ≈ 243 — vérifier le chiffre réel)

---

### Task 5: App multi-semaines + ProfilScreen section Semaine (TDD)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ProfilScreen.tsx`
- Test: `tests/app.test.tsx` (ajout d'un describe + helper + imports)

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/app.test.tsx`, compléter les imports :

```ts
import { upsertWeek } from '../src/lib/storage';
```

Ajouter le helper (après la fixture `fixture`) — mini-semaine paramétrable, dates quelconques :

```ts
const fixtureSemaine = (
  semaine: string,
  du: string,
  au: string,
  menu = 'A',
  plat = 'Poulet rôti',
) => `---
semaine: ${semaine}
menu: ${menu}
du: ${du}
au: ${au}
---

## Courses

### Proteines
- [ ] ${plat} 600 g

## Menu

### Lundi
- dejeuner-marc: ${plat}
- dejeuner-melanie: ${plat} keto
- diner-famille: ${plat} au four
- diner-melanie: ${plat} keto
- batch: Doubler ${plat}

### Mardi
- dejeuner-marc: Restes
- dejeuner-melanie: Box
- diner-famille: ${plat} pâtes
- diner-melanie: ${plat} sans pâtes

### Mercredi
- diner-famille: ${plat} wok

### Jeudi
- diner-famille: ${plat} gratin

### Vendredi
- diner-famille: ${plat} tacos

### Samedi
- diner-famille: ${plat} soupe

### Dimanche
- diner-famille: ${plat} rôti

## Batch

### Rituel dimanche
- 0-5 min · Four à 180° — egg muffins ×10

### Micro-batch
- lundi: doubler le plat

- [ ] Egg muffins ×10

## Marc

### Cibles
- 2 450 kcal

### Seances
- [ ] Lundi — Muscu

### Rappels
- Pesée lun/mer/ven

## Melanie

### Cibles
- 1 450 kcal

### Seances
- [ ] Mardi — Pilates

### Rappels
- Jeûne 16:8
`;
```

Ajouter le describe (en fin de fichier) :

```tsx
describe('App — multi-semaines', () => {
  beforeEach(() => {
    localStorage.clear();
    saveProfile({ id: 'marc', age: 41, taille: 178 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ouvre sur la semaine contenant aujourd\u2019hui et navigue par chevrons', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T10:00:00')); // mardi, dans S38
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const s38 = parseWeeklyFile(fixtureSemaine('2026-S38', '2026-09-14', '2026-09-20', 'B', 'Chili con carne'));
    const s39 = parseWeeklyFile(fixtureSemaine('2026-S39', '2026-09-21', '2026-09-27', 'C', 'Quiche lorraine'));
    upsertWeek(s38.raw, s38.data);
    upsertWeek(s39.raw, s39.data);
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semaine 2026-S38');
    expect(screen.getByText('Menu B')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Semaine suivante' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semaine 2026-S39');
    expect(screen.getByText('Menu C')).toBeVisible();
    // Dernière semaine : chevron suivant désactivé
    expect(screen.getByRole('button', { name: 'Semaine suivante' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semaine 2026-S38');
    expect(screen.getByRole('button', { name: 'Semaine suivante' })).toBeEnabled();
  });

  it('l\u2019import depuis le profil recharge les semaines, affiche la semaine du jour et ferme le profil', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T10:00:00')); // mercredi, entre S38 et S40
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Mon profil' }));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const contenu = fixtureSemaine('2026-S40', '2026-09-28', '2026-10-04', 'D', 'Boulettes');
    await user.upload(input, new File([contenu], '2026-S40-menu-d.md', { type: 'text/markdown' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Semaine 2026-S40');
    expect(screen.getByText('Menu D')).toBeVisible();
  });
});
```

Note : dans le 2ᵉ test, la semaine S40 est la **prochaine à venir** au 16/09 (règle 2 de `semaineCourante`).

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run tests/app.test.tsx`
Expected: FAIL — pas d'input file dans le profil (bouton « Semaine précédente » introuvable / « Mon profil » sans import)

- [ ] **Step 3: Réécrire `src/App.tsx`**

```tsx
import { useState } from 'react';
import { ProfilScreen } from './components/ProfilScreen';
import { ProfileView } from './components/ProfileView';
import { StatCards } from './components/StatCards';
import { TabBar } from './components/TabBar';
import type { TabId } from './components/TabBar';
import { Onboarding } from './components/onboarding/Onboarding';
import { WeekBanner } from './components/WeekBanner';
import { CuisineView } from './components/cuisine/CuisineView';
import { PRENOMS } from './lib/model';
import type { ImportedWeek, UserProfile } from './lib/model';
import { parseWeeklyFile } from './lib/parse';
import { loadProfile, loadWeeks, removeProfile } from './lib/storage';
import { indexSemaineCourante, semainesTriees } from './lib/weeks';
import { todayISO } from './lib/dates';
import sampleRaw from './assets/semaine-exemple.md?raw';

// Fallback en mémoire : tant qu'aucune semaine n'a été importée, on affiche
// la semaine d'exemple (les semaines réelles arrivent par l'import du cycle).
const semaineExemple = (): ImportedWeek => {
  const { data } = parseWeeklyFile(sampleRaw);
  return { raw: sampleRaw, data, importedAt: '' };
};

const semainesInitiales = (): ImportedWeek[] => {
  const stockees = semainesTriees(Object.values(loadWeeks()));
  return stockees.length ? stockees : [semaineExemple()];
};

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [semaines, setSemaines] = useState<ImportedWeek[]>(semainesInitiales);
  // Navigation en session : null = auto (semaine du jour) ; sinon l'id de la
  // semaine consultée via les chevrons. Rien n'est persisté.
  const [selection, setSelection] = useState<string | null>(null);
  const [profilOuvert, setProfilOuvert] = useState(false);
  // StatCards lit le storage au montage : onWeightsChanged (pesée ajoutée) incrémente
  // weightsBump pour remonter StatCards et relire les pesées.
  const [weightsBump, setWeightsBump] = useState(0);
  const [tab, setTab] = useState<TabId>('cuisine');

  if (!profile) return <Onboarding onDone={setProfile} />;

  if (profilOuvert) {
    return (
      <div className="main-content">
        <ProfilScreen
          profile={profile}
          onBack={() => setProfilOuvert(false)}
          onChangeProfile={() => {
            removeProfile();
            setProfile(null);
            setProfilOuvert(false);
          }}
          onProfileSaved={setProfile}
          onImported={() => {
            setSemaines(semainesInitiales());
            setSelection(null);
            setProfilOuvert(false);
          }}
        />
      </div>
    );
  }

  const idx = indexSemaineCourante(semaines, todayISO());
  const navigable = semaines.length > 1;
  const selectionIdx =
    selection != null
      ? Math.max(0, semaines.findIndex((w) => w.data.meta.semaine === selection))
      : idx;
  const idxAffiche = Math.min(Math.max(selectionIdx, 0), semaines.length - 1);
  const affichee = semaines[idxAffiche];
  if (!affichee) return null;

  return (
    <div className="main-content">
      <WeekBanner
        meta={affichee.data.meta}
        onOpenProfile={() => setProfilOuvert(true)}
        onPrev={
          navigable
            ? () => setSelection(semaines[Math.max(0, idxAffiche - 1)].data.meta.semaine)
            : undefined
        }
        onNext={
          navigable
            ? () =>
                setSelection(
                  semaines[Math.min(semaines.length - 1, idxAffiche + 1)].data.meta.semaine,
                )
            : undefined
        }
        hasPrev={navigable && idxAffiche > 0}
        hasNext={navigable && idxAffiche < semaines.length - 1}
      />
      <TabBar active={tab} onSelect={setTab} />
      <main>
        {tab === 'cuisine' && <CuisineView data={affichee.data} />}
        {tab === 'suivi' && (
          <>
            <p className="greeting">Salut {PRENOMS[profile.id]} 👋</p>
            <StatCards key={weightsBump} data={affichee.data} profile={profile} />
            <ProfileView
              profile={profile}
              data={affichee.data.profiles[profile.id]}
              semaine={affichee.data.meta.semaine}
              onWeightsChanged={() => setWeightsBump((b) => b + 1)}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Modifier `src/components/ProfilScreen.tsx`**

Ajouter la prop `onImported` et la section « Semaine » (entre « Mes infos » et « Compte ») :

```tsx
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
```

Et dans le JSX, après le `</section>` de « Mes infos » (ligne 157) :

```tsx
      <section className="profile-section">
        <h3>Semaine</h3>
        <ImportButton onImported={onImported} label="Importer un cycle (.md)" />
      </section>
```

Avec l'import en tête de fichier :

```tsx
import { ImportButton } from './ImportButton';
```

- [ ] **Step 5: Vérifier que tous les tests passent**

Run: `npx vitest run tests/app.test.tsx tests/components.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/ProfilScreen.tsx tests/app.test.tsx
git commit -m "feat: app multi-semaines — semaine du jour, chevrons, import cycle"
```

---

### Task 6: e2e — import groupé + navigation + zéro débordement

**Files:**
- Create: `tests/e2e/fixtures/2026-S38-menu-b.md` (fixture)
- Create: `tests/e2e/fixtures/2026-S39-menu-c.md` (fixture)
- Create: `tests/e2e/import-navigation.spec.ts`

Les fixtures ont des bornes volontairement **très larges** : la « semaine contenant aujourd'hui » est déterministe quelle que soit la date d'exécution (les deux contiennent toujours aujourd'hui, la plus ancienne gagne). Données 100 % fictives.

- [ ] **Step 1: Créer `tests/e2e/fixtures/2026-S38-menu-b.md`**

```markdown
---
semaine: E2E-S1
menu: A
du: 2000-01-03
au: 2099-12-26
---

## Courses

### Proteines
- [ ] Poulet test 600 g

### Keto
- [ ] Avocats test

## Menu

### Lundi
- dejeuner-marc: Plat test A
- dejeuner-melanie: Plat test A keto
- diner-famille: Dîner famille A
- diner-melanie: Dîner keto A
- batch: Doubler le plat A

### Mardi
- dejeuner-marc: Restes A
- dejeuner-melanie: Box A
- diner-famille: Dîner famille A2
- diner-melanie: Dîner keto A2

### Mercredi
- diner-famille: Dîner famille A3

### Jeudi
- diner-famille: Dîner famille A4

### Vendredi
- diner-famille: Dîner famille A5

### Samedi
- diner-famille: Dîner famille A6

### Dimanche
- diner-famille: Dîner famille A7

## Batch

### Rituel dimanche
- 0-5 min · Four à 180° — egg muffins test ×10

### Micro-batch
- lundi: doubler le plat test

- [ ] Egg muffins test ×10

## Marc

### Cibles
- 2 450 kcal

### Seances
- [ ] Lundi — Muscu test

### Rappels
- Pesée test

## Melanie

### Cibles
- Keto test

### Seances
- [ ] Mardi — Pilates test

### Rappels
- Jeûne test
```

- [ ] **Step 2: Créer `tests/e2e/fixtures/2026-S39-menu-c.md`**

```markdown
---
semaine: E2E-S2
menu: Z
du: 2000-01-10
au: 2099-12-27
---

## Courses

### Proteines
- [ ] Saumon test 600 g

### Keto
- [ ] Olives test

## Menu

### Lundi
- dejeuner-marc: Plat test B
- dejeuner-melanie: Plat test B keto
- diner-famille: Dîner famille B
- diner-melanie: Dîner keto B
- batch: Doubler le plat B

### Mardi
- dejeuner-marc: Restes B
- dejeuner-melanie: Box B
- diner-famille: Dîner famille B2
- diner-melanie: Dîner keto B2

### Mercredi
- diner-famille: Dîner famille B3

### Jeudi
- diner-famille: Dîner famille B4

### Vendredi
- diner-famille: Dîner famille B5

### Samedi
- diner-famille: Dîner famille B6

### Dimanche
- diner-famille: Dîner famille B7

## Batch

### Rituel dimanche
- 0-5 min · Four à 180° — egg muffins test ×10

### Micro-batch
- lundi: doubler le plat test B

- [ ] Egg muffins test ×10

## Marc

### Cibles
- 2 450 kcal

### Seances
- [ ] Lundi — Muscu test

### Rappels
- Pesée test

## Melanie

### Cibles
- Keto test

### Seances
- [ ] Mardi — Pilates test

### Rappels
- Jeûne test
```

- [ ] **Step 3: Créer `tests/e2e/import-navigation.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

const ORIGIN = process.env.E2E_PREVIEW ? 'http://localhost:4173' : 'http://localhost:5173';
const OVERFLOW_TOLERANCE = 1; // arrondis de sous-pixel

async function assertPasDeDebordement(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'la page ne doit pas scroller horizontalement').toBeLessThanOrEqual(OVERFLOW_TOLERANCE);
}

test.describe('Import du cycle & navigation semaines', () => {
  // Profil seul : la semaine d'exemple se charge en fallback, sans chevrons.
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

  test('une seule semaine : pas de chevrons', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page.getByText('Semaine 2026-S37')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Semaine précédente' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Semaine suivante' })).toHaveCount(0);
    await assertPasDeDebordement(page);
  });

  test('import groupé des 2 fixtures puis navigation chevrons', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.getByRole('button', { name: 'Mon profil' }).click();

    await page.setInputFiles('input[type="file"]', [
      'tests/e2e/fixtures/2026-S38-menu-b.md',
      'tests/e2e/fixtures/2026-S39-menu-c.md',
    ]);

    // Le profil se referme, la semaine affichée est celle contenant aujourd'hui
    // (E2E-S1 : du plus ancien, contient toujours aujourd'hui).
    await expect(page.getByText('Semaine E2E-S1')).toBeVisible();
    await expect(page.locator('.menu-pill')).toHaveText('Menu A');

    // Les 2 semaines sont stockées
    const ids = await page.evaluate(
      () => Object.keys(JSON.parse(localStorage.getItem('sportapp:weeks') ?? '{}').semaines ?? {}),
    );
    expect(ids.sort()).toEqual(['E2E-S1', 'E2E-S2']);

    // Navigation : suivante -> E2E-S2 (Menu Z), précédente -> retour, bornes
    await page.getByRole('button', { name: 'Semaine suivante' }).click();
    await expect(page.getByText('Semaine E2E-S2')).toBeVisible();
    await expect(page.locator('.menu-pill')).toHaveText('Menu Z');
    await expect(page.getByRole('button', { name: 'Semaine suivante' })).toBeDisabled();
    await page.getByRole('button', { name: 'Semaine précédente' }).click();
    await expect(page.getByText('Semaine E2E-S1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Semaine précédente' })).toBeDisabled();

    // La navigation est en session : rechargement -> retour à l'auto (E2E-S1)
    await page.getByRole('button', { name: 'Semaine suivante' }).click();
    await expect(page.getByText('Semaine E2E-S2')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Semaine E2E-S1')).toBeVisible();

    await assertPasDeDebordement(page);
  });
});
```

- [ ] **Step 4: Lancer l'e2e**

Run: `npm run e2e`
Expected: PASS (tous les projets 375/320, WebKit inclus). Si flaky WebKit → relancer une fois avant d'investiguer.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/fixtures/ tests/e2e/import-navigation.spec.ts
git commit -m "test: e2e import cycle + navigation semaines"
```

---

### Task 7: Convention — `template-semaine.md` + `prompt-semaine-ia.md`

**Files:**
- Create: `docs/templates/template-semaine.md`
- Create: `docs/templates/prompt-semaine-ia.md`

- [ ] **Step 1: Créer `docs/templates/template-semaine.md`**

````markdown
<!--
TEMPLATE SEMAINE — Rituel
Squelette d'UNE semaine. Remplacer tous les {{placeholders}} ; supprimer les
commentaires HTML. Le format fait foi : README.md (section « Le format .md »)
et src/lib/parse.ts. Règles absolues :
- Zéro ligne hors format : l'app doit importer ce fichier avec 0 warning.
- Pas de « # » dans les valeurs du frontmatter (YAML le lirait comme un commentaire).
- Les jours du menu s'écrivent Lundi → Dimanche (l'app réordonne d'elle-même).
- Titre de recette = EXACTEMENT celui du carnet (le slug du titre = l'id : il
  doit rester identique d'une semaine à l'autre, surtout pour les recettes
  partagées entre menus comme les tacos R5).
- Ne JAMAIS modifier le libellé d'une coche (courses, rituel, tâches batch,
  séances) d'une semaine déjà cochée sur un téléphone : le slug dérive du
  libellé, le renommer perd l'état.
- Refs recette : « → slug » = slugify du titre exact (ex. « R8 · Chili con
  carne + riz » → r8-chili-con-carne-riz).
- Le rayon « ### Keto » (extras de Mélanie) est toujours le DERNIER rayon.
- Le placard permanent (réassort mensuel) ne va JAMAIS dans un fichier hebdo.
-->

---
semaine: {{AAAA-Sxx}}
menu: {{A|B|C|D}}
titre: {{Menu X — nom du menu, sans #}}
du: {{AAAA-MM-JJ, lundi}}
au: {{AAAA-MM-JJ, dimanche}}
---

# Semaine {{xx}}

## Courses

### Proteines & Laitiers
- {{provenance listes-courses du menu, mentions (Mélanie) si spécifique keto}}

### Frais, sec & surgelés
- {{item}}

### Keto
- Avocats ×3-4
- Beurre 250 g · crème fraîche 20 cl
- Fromages variés : emmental, chèvre, mozzarella
- Olives 1 bocal
- Salade ×2 · épinards · courgettes ×4 · brocoli · chou-fleur · concombre · poivrons · champignons
- Amandes 200 g · noix de Grenoble 200 g
- Chocolat noir ≥ 85 %
- Baies surgelées 300 g
- Eau pétillante · citron
- Sardines/maquereau à l'huile

## Menu

### Lundi
- dejeuner-marc: {{boîte ou repas}} → {{slug-recette si ref}}
- dejeuner-melanie: {{assiette keto}}
- diner-famille: {{dîner}} → {{slug-recette}}
- diner-melanie: {{dîner version keto}}
- batch: {{prep du jour ou « Zéro prep — ... »}}

### Mardi
<!-- Répéter × 7 jours, mêmes 5 clés (un jour sans batch : la clé `batch:` est simplement absente) -->

## Recettes

### {{R# · Nom EXACT du carnet}}
temps: {{X min · matériel}}
kcal: {{par personne, estimation réaliste}}
proteines: {{g par personne}}
glucides: {{g par personne}}
lipides: {{g par personne}}
score: {{entier 0-10}}
image: {{URL https://images.unsplash.com/... vérifiée}}
bases: {{B#, B#}}
- pour 4: {{ingrédients quantifiés, séparés par ·}}
1. {{étape}}
2. {{étape}}
- mel: {{assiette keto de Mélanie}}
- batch: {{consigne batch du carnet}}

## Bases

### {{B# · Nom}}
{{préparation en une ou deux phrases}}

## Batch

### Rituel dimanche
- 0-5 min · Four à 180° — egg muffins ×10 lancés, on fait le reste
- 5-30 min · Cuissons en double — {{dîner du soir ×2 + féculent ×2 → boîte lundi}}
- 30-35 min · Œufs durs ×6-8 — boxes de la semaine pour Mél
- 35-50 min · Légumes + vinaigrette — laver, couper, ranger
- 50-60 min · Montage des boxes — boîte lundi Marc + 1 box keto Mél

### Micro-batch
- lundi: {{...}}
- mardi: {{...}}
<!-- Uniquement les jours du menu ; samedi = œufs durs ; un seul item par jour -->

- [ ] Egg muffins ×10
- [ ] {{tâches du gros batch (3-5)}}

## Marc

### Cibles
- 2 450 kcal std · 2 750 sortie · 2 300 repos
- Protéines 160 g/j (constante) · glucides autour des séances
- Créatine 5 g/j tous les jours · clear whey post-séance
- Eau 2,5 L · coucher 22h (bureau) / 22h30 (maison)
### Séances
- [ ] Lundi — Muscu libre 10h30 (rameur + poids) + navette vélo Z1
- [ ] Mardi — Course 5 km / VMA (maison)
- [ ] Mercredi — Coach 9h + navette vélo
- [ ] Jeudi — Muscu libre 9h/10h30 + navette vélo
- [ ] Vendredi — Course ou repos
- [ ] Samedi — Sortie longue (alternance sam/dim, 7h)
### Rappels
- Pesée lun/mer/ven à jeun → moyenne hebdo
- 10 km < 50 min : test à S12 · 5 km < 23:00 à S10

## Melanie

### Cibles
- 1 450-1 500 kcal · protéines 110 g · ≤ 25-30 g glucides nets
- Fenêtre 12h→20h (mardi : 21h après pilates)
- Sel généreux (adaptation keto) · eau 2-2,5 L
- Pré-menstruelle : fenêtre 12h-21h + 100-200 kcal keto
### Séances
- [ ] Lundi — Danse 21h
- [ ] Mardi — Pilates 19h45 (snack 18h30 : 2 œufs + ½ avocat)
- [ ] Vendredi — Marche à jeun 6h30-7h30
### Rappels
- Jeûne matin : eau · café noir · thé uniquement
- Snack keto si creux : amandes · olives · fromage · œuf dur
````

- [ ] **Step 2: Créer `docs/templates/prompt-semaine-ia.md`**

````markdown
# Prompt IA — Générer un cycle de semaines .md (Rituel)

À coller dans un chat IA (Claude, ChatGPT…) avec en pièces jointes :

1. `diet/carnet-recettes-batch-AAAA-MM-JJ.html` — le carnet (24 recettes, 4 menus, rituel, micro-batches)
2. `diet/listes-courses-AAAA-MM-JJ.html` — les listes Lidl par menu + encadré keto
3. `diet/plan-diet-AAAA-MM-JJ.html` — le plan diet de Marc (cibles, séances, rappels)
4. `diet/melanie/plan-keto-if-melanie-AAAA-MM-JJ.html` — le plan keto+IF de Mélanie
5. `docs/templates/template-semaine.md` — le squelette à remplir

## Paramètres (remplir avant d'envoyer)

- **Semaine de départ** : {{AAAA-Sxx}}, lundi {{AAAA-MM-JJ}}
- **Menus à générer, dans l'ordre du roulement** : {{ex. B, C, D, A}}
- **Événements de la période** : {{ex. mercredi : soirée danse Maëlle 16h ; vendredi 15 : soirée à deux (babysitter) ; vacances scolaires du...}}

## Ta mission

Génère un fichier .md par semaine demandée, conformes au template et au format
« Rituel » (fichier hebdo de l'app). Nommage : `AAAA-Sxx-menu-{lettre}.md`.
Suis EXACTEMENT le process et les règles dures ci-dessous, puis l'auto-contrôle.

## Process (dans l'ordre)

1. **Dates** : pour chaque semaine, lundi (`du`) → dimanche (`au`) en ISO
   AAAA-MM-JJ, sans erreur de calendrier. Le code semaine ISO (ex. 2026-S38)
   correspond à la semaine de la date du lundi.
2. **Courses** : les rayons de la liste du menu (source listes-courses) + le
   rayon `### Keto` EN DERNIER (encadré permanent de Mélanie, identique chaque
   semaine). Items au format `- label`, mentions « (Mélanie) » si spécifique.
3. **Menu** : 7 jours Lundi→Dimanche, les 5 clés par jour
   (`dejeuner-marc`, `dejeuner-melanie`, `diner-famille`, `diner-melanie`,
   `batch`). Les dîners = les recettes du menu du carnet ; les déjeuners
   suivent la logique boxes (boîte du batch pour Marc, restes/box keto pour
   Mélanie). Ajoute `→ slug` quand le plat correspond à une recette du fichier.
   Intègre les événements fournis en paramètres (ils PRIMENT sur le carnet).
4. **Batch** : le rituel générique du carnet (5-6 étapes horodatées, détail
   ajusté au dîner du dimanche du menu) + le micro-batch du menu (du tableau
   micro-batches) + 3-5 tâches `- [ ]` du gros batch.
5. **Recettes** : uniquement celles du menu, titres EXACTS du carnet,
   enrichies : `temps`, `kcal`, `proteines`, `glucides`, `lipides` (estimations
   réalistes par personne), `score` (0-10), `image` (URL Unsplash https),
   `bases`, `- pour 4:`, étapes numérotées, `- mel:`, `- batch:`. Une même
   recette garde les MÊMES valeurs dans tous les fichiers du cycle.
6. **Bases** : uniquement celles citées par les recettes du fichier.
7. **Marc / Melanie** : copie CONFORME des blocs du template (cibles, séances,
   rappels). Ne réinvente rien ; n'adapte que ce qu'un événement impose.

## Règles dures (contrat — toute violation casse l'app)

- Zéro ligne hors format : chaque fichier doit être importé avec **0 warning**.
- Frontmatter : `semaine`, `menu`, `du`, `au` requis (ISO AAAA-MM-JJ), pas de
  « # » dans les valeurs.
- Ne modifie JAMAIS le libellé d'une coche existante (courses, rituel, tâches
  batch, séances) : le slug dérive du libellé.
- Les refs `→ slug` doivent viser des recettes présentes dans le même fichier.
- Un item de courses = une ligne ; pas de sous-puces, pas de gras, pas de table.
- Pas de section en plus ni de section renommée (## exactement : Courses, Menu,
  Batch, Recettes, Bases, Marc, Melanie).

## Auto-contrôle (à faire AVANT de répondre)

- [ ] Les 4 frontmatters : lundi→dimanche consécutifs, code semaine ISO correct
- [ ] Chaque fichier : les 7 jours, 5 clés, aucune clé inconnue
- [ ] Chaque `→ slug` correspond à une recette du fichier (slug = slugify du
      titre, sans accents ni majuscules)
- [ ] Recettes partagées entre menus : valeurs identiques
- [ ] Aucune ligne hors format (pas de gras, pas de tables, pas de sous-listes)
- [ ] Les blocs Marc/Melanie sont identiques d'une semaine à l'autre

## Sortie attendue

4 blocs de code markdown, un par fichier, précédés chacun d'une ligne
`### Fichier : AAAA-Sxx-menu-x.md` — rien d'autre.
````

- [ ] **Step 3: Vérifier le contenu**

Run: `rg -c "{{" docs/templates/template-semaine.md docs/templates/prompt-semaine-ia.md`
Expected: les placeholders ne subsistent QUE dans le template et les paramètres du prompt (c'est voulu — ce sont des fichiers à remplir).

- [ ] **Step 4: Commit**

```bash
git add docs/templates/
git commit -m "docs: convention template semaine + prompt IA de génération"
```

---

### Task 8: Dogfooding — générer le cycle S38→S41 (hors repo)

**Files:**
- Create: `/Users/marcsuarez/Documents/PERSO/sport/diet/rotations/2026-S38-menu-b.md`
- Create: `/Users/marcsuarez/Documents/PERSO/sport/diet/rotations/2026-S39-menu-c.md`
- Create: `/Users/marcsuarez/Documents/PERSO/sport/diet/rotations/2026-S40-menu-d.md`
- Create: `/Users/marcsuarez/Documents/PERSO/sport/diet/rotations/2026-S41-menu-a.md`
- Temporaire (supprimé après): `tests/tmp-cycle.test.ts`

**Aucun commit** — les fichiers de rotation restent hors repo (données perso). Le temporaire est supprimé avant tout commit.

- [ ] **Step 1: Créer le dossier**

```bash
mkdir -p /Users/marcsuarez/Documents/PERSO/sport/diet/rotations
```

- [ ] **Step 2: Générer les 4 fichiers en appliquant le prompt**

Paramètres : départ `2026-S38`, lundi `2026-09-14`, menus dans l'ordre **B, C, D, A** (S37 actuelle = Menu A déjà consommé ; le cycle recommence à S41). Événements : semaine type (mercredi : soirée danse Maëlle 16h ; mardi : pilates Mélanie 19h45) ; pas de soirée à deux sur la période (2×/mois, hors ces 4 semaines) ; vacances Toussaint non concernées.

Sources (lire intégralement avant de générer) :
- `/Users/marcsuarez/Documents/PERSO/sport/diet/carnet-recettes-batch-2026-09-02.html` (recettes R8-R14 pour B, R15-R20 pour C, R21-R24+tacos+soupe pour D, R1-R7 pour A ; rituel ; micro-batches ; bases B1-B8)
- `/Users/marcsuarez/Documents/PERSO/sport/diet/listes-courses-2026-09-02.html` (listes par menu + encadré keto)
- `/Users/marcsuarez/Documents/PERSO/sport/diet/plan-diet-2026-09-01.html` (bloc Marc)
- `/Users/marcsuarez/Documents/PERSO/sport/diet/melanie/plan-keto-if-melanie-2026-09-02.html` (bloc Mélanie)

Le contenu des recettes vient du carnet (pour 4, étapes, mel, batch) ; les macros `kcal/proteines/glucides/lipides` et `score` sont estimées de façon réaliste (cohérence : mêmes valeurs pour une même recette) ; `image` = URLs Unsplash de plats correspondants.

- [ ] **Step 3: Valider avec un test temporaire (0 warning exigé)**

Créer `tests/tmp-cycle.test.ts` :

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { parseWeeklyFile } from '../src/lib/parse';

const DIR = '/Users/marcsuarez/Documents/PERSO/sport/diet/rotations';
const FICHIERS = [
  '2026-S38-menu-b.md',
  '2026-S39-menu-c.md',
  '2026-S40-menu-d.md',
  '2026-S41-menu-a.md',
];

describe('cycle S38-S41 généré (validation locale, non commité)', () => {
  it.each(FICHIERS)('%s parse avec 0 warning', (fichier) => {
    const raw = readFileSync(`${DIR}/${fichier}`, 'utf8');
    const { warnings } = parseWeeklyFile(raw);
    expect(warnings).toEqual([]);
  });

  it('chaque fichier référence des recettes présentes dans le même fichier', () => {
    for (const fichier of FICHIERS) {
      const { data } = parseWeeklyFile(readFileSync(`${DIR}/${fichier}`, 'utf8'));
      const ids = new Set((data.recettes ?? []).map((r) => r.id));
      const refs = data.menu.flatMap((j) => Object.values(j.recetteRefs ?? {}));
      for (const ref of refs) expect(ids.has(ref), `${ref} absente de ${fichier}`).toBe(true);
    }
  });
});
```

Run: `npx vitest run tests/tmp-cycle.test.ts`
Expected: PASS (4 fichiers × 0 warning + refs résolues). Si un warning apparaît, corriger le fichier .md généré (pas le parser).

- [ ] **Step 4: Supprimer le test temporaire**

```bash
rm tests/tmp-cycle.test.ts
```

---

### Task 9: Docs (README + AGENTS.md) + gates complets

**Files:**
- Modify: `README.md` (section format .md)
- Modify: `AGENTS.md` (storage, structure, tests)

- [ ] **Step 1: README — ajouter la section « Générer un cycle de semaines »**

Après la section documentant le format .md, ajouter :

```markdown
## Générer un cycle de semaines (rotation A/B/C/D)

Le contenu vient d'une rotation de 4 menus avec batch commun. Une session de
prompt IA génère le cycle complet (4 fichiers .md, un par semaine) :

1. Ouvrir `docs/templates/prompt-semaine-ia.md`, remplir les paramètres
   (semaine de départ, menus, événements) et le coller dans un chat IA avec
   les 4 documents du dossier `diet/` en pièces jointes
2. Sauvegarder les 4 fichiers générés dans `diet/rotations/`
3. Dans l'app : Profil → Semaine → « Importer un cycle (.md) » → sélectionner
   les 4 fichiers d'un coup

L'app garde toutes les semaines importées, ouvre sur celle qui contient
aujourd'hui (le roulement est automatique) et permet de naviguer avec les
chevrons ‹ › de la bannière. Les coches et pesées ne sont jamais perdues :
elles vivent par semaine (`sportapp:checks:{semaine}`).

Règle d'or : ne jamais modifier le libellé d'une coche d'une semaine déjà
utilisée — le slug dérive du libellé, le renommer perd l'état cochée.
```

- [ ] **Step 2: AGENTS.md — mises à jour**

Dans la section **Storage**, après la ligne `sportapp:week`, ajouter :

```markdown
- `sportapp:weeks` — stock multi-semaines (`{ semaines: { [id]: { raw, data, importedAt } } }`) ; l'ancienne clé `sportapp:week` est migrée à la première lecture puis laissée en place
```

Dans la section **Structure**, à la ligne `docs/superpowers/`, ajouter au-dessus :

```markdown
docs/templates/   # convention template semaine + prompt IA de génération d'un cycle
```

Dans la liste des tests (miroir de src/), ajouter `weeks.test.ts` :

```markdown
tests/            # miroir de src/, vitest + Testing Library, environnement happy-dom
                  # parse.test.ts, storage.test.ts, weeks.test.ts, lib/rayons.test.ts,
```

- [ ] **Step 3: Gates complets**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tout PASS

Run: `npm run build && npm run preview` puis vérifier `dist/` contient `sw.js` + `manifest.webmanifest` (aucun changement PWA attendu).

- [ ] **Step 4: e2e complet**

Run: `npm run e2e`
Expected: PASS (320/375, zéro débordement — les chevrons de la bannière sont le point de vigilance)

- [ ] **Step 5: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: rotation & import — convention template, prompt IA, storage weeks"
```

---

## Rappel de fin

- Les 4 fichiers du cycle vivent dans `diet/rotations/` (hors repo) — l'utilisateur les importe sur son téléphone
- La semaine d'exemple (`src/assets/semaine-exemple.md`) reste le fallback hors-ligne, inchangée
- Le parser et le contrat .md n'ont pas bougé
