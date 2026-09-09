# Ajustements batch & Mél — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** « Mé » → « Mél » partout affiché, onglet Batch réduit au Rituel + micro-batch (bannière/checklist supprimées), micro-batch en carrousel premium (badge lime + points de pagination).

**Architecture :** 3 scopes dans `BatchView.tsx`/`MenuView.tsx`/`index.css`/semaine d'exemple + tests. Un seul commit à la fin (validé par l'utilisateur). Parser, format .md, clés storage, ids de coches : intacts.

**Tech Stack :** React 18 + TS strict, CSS sémantique `src/index.css`, vitest + Testing Library, Playwright.

**Référence :** spec `docs/superpowers/specs/2026-09-09-ajustements-batch-mel-design.md` (faire foi). Mockup validé : `.superpowers/brainstorm/86196-1788954541/content/micro-batch-options.html` (option B).

---

## Task 1 : « Mé » → « Mél » (TDD)

**Files:**
- Modify: `tests/components.test.tsx:348,350` (tags attendus)
- Modify: `src/components/cuisine/MenuView.tsx:7,9`, `src/index.css:1452`, `src/assets/semaine-exemple.md:49,215,221,223,231`

- [ ] **Step 1.1 : Rouge** — dans `tests/components.test.tsx`, test « renders present fields as profile tags… » (~l.309) : l'assertion `rows.map(… .menu-tag …)` contient `['Marc', 'Mé', 'Famille', 'Mé', 'Batch']` (lignes ~346-350) → remplacer les deux `'Mé'` par `'Mél'`.

Run: `npx vitest run tests/components.test.tsx`
Expected: FAIL (1 échec, tags encore « Mé »).

- [ ] **Step 1.2 : Implémentation**
  - `MenuView.tsx` lignes 7 et 9 : `['dejeunerMelanie', 'Mé', 'tag-keto']` → `'Mél'`, `['dinerMelanie', 'Mé', 'tag-keto']` → `'Mél'`
  - `index.css` ligne ~1452 : `content: '🟢 Mé : '` → `content: '🟢 Mél : '`
  - `semaine-exemple.md` (5 lignes, « Mé » entier seulement — ne JAMAIS toucher « Mélanie ») :
    - l.49 : `- Parmesan (courgettes spaghetti Mé)` → `(courgettes spaghetti Mél)`
    - l.215 : `Chou-fleur (Mé) :` → `Chou-fleur (Mél) :`
    - l.221 : `boxes de la semaine pour Mé` → `pour Mél`
    - l.223 : `+ 1 box keto Mé` → `+ 1 box keto Mél`
    - l.231 : `(boxes keto de Mé)` → `(boxes keto de Mél)`

- [ ] **Step 1.3 : Vert + zéro occurrence**

Run: `npx vitest run tests/components.test.tsx` puis `rg -n "'Mé'|🟢 Mé" src/ tests/`
Expected: PASS + zéro occurrence hors « Mélanie ».

## Task 2 : Batch — suppression bannière/checklist (TDD)

**Files:**
- Modify: `src/components/cuisine/BatchView.tsx` (réécriture), `src/components/cuisine/CuisineView.tsx:37-39` (appel sans `items`)
- Modify: `tests/components.test.tsx` (describe `BatchView` supprimé, `BatchView v2` réécrit), `tests/app.test.tsx:116` (`/Riz/` → `/muffins/i`)

- [ ] **Step 2.1 : Rouge** — dans `tests/components.test.tsx` :
  - Supprimer le describe `BatchView` (~l.658-676 : « renders the banner… » + « renders a muted message… »)
  - Dans `BatchView v2 — rituel et micro-batch`, retirer `items={[]}`/`items={…}` de tous les `render`/`rerender` et réécrire les 2 tests obsolètes :
    - « affiche la timeline au-dessus de la liste batch existante » → nouveau test :

```tsx
  it('affiche la timeline au-dessus du micro-batch, sans bannière ni checklist', () => {
    const { container } = render(
      <BatchView rituel={RITUEL} microBatch={MICRO} semaine="2026-S39" />,
    );
    const timeline = container.querySelector('.rituel-timeline');
    const micro = container.querySelector('.micro-batch');
    expect(timeline).not.toBeNull();
    expect(micro).not.toBeNull();
    expect(container.querySelector('.batch-banner')).toBeNull();
    expect(container.querySelector('ul.checklist')).toBeNull();
    expect(timeline!.compareDocumentPosition(micro!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
```

    - « garde l'ancien rendu (bannière + checklist) sans rituel ni micro-batch » → « sans rituel ni micro-batch : message muted seul » :

```tsx
  it('sans rituel ni micro-batch : message muted seul', () => {
    const { container } = render(<BatchView semaine="2026-S39" />);
    expect(screen.getByText('Aucun batch prévu cette semaine.')).toBeInTheDocument();
    expect(container.querySelector('.batch-banner')).toBeNull();
    expect(container.querySelector('.rituel-timeline')).toBeNull();
    expect(container.querySelector('.micro-batch')).toBeNull();
  });
```

  - `tests/app.test.tsx` l.116 : `expect(screen.getByText(/Riz/)).toBeInTheDocument();` → `expect(screen.getByText(/muffins/i)).toBeInTheDocument();`

Run: `npx vitest run tests/components.test.tsx tests/app.test.tsx`
Expected: FAIL (props `items` encore exigées par BatchView, TypeScript ; assertions bannière encore vraies).

- [ ] **Step 2.2 : Implémentation `BatchView.tsx`** — réécrire le fichier (l'ancien micro-batch inline devient un composant, cf. Task 3 pour son JSX final ; ici garder le JSX micro-batch actuel tel quel mais sans `items`) :

```tsx
import { useState } from 'react';
import type { MicroBatchJour, RituelEtape } from '../../lib/model';
import { getChecks, setCheck } from '../../lib/storage';
import { capitalize } from '../../lib/text';

export function BatchView({
  rituel,
  microBatch,
  semaine,
}: {
  rituel?: RituelEtape[];
  microBatch?: MicroBatchJour[];
  semaine: string;
}) {
  const hasRituel = !!rituel?.length;
  const hasMicro = !!microBatch?.length;
  return (
    <>
      {hasRituel && rituel && <RituelTimeline etapes={rituel} semaine={semaine} />}
      {hasMicro && microBatch && (
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
      {!hasRituel && !hasMicro && <p className="muted">Aucun batch prévu cette semaine.</p>}
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
                <span className="rituel-label">
                  {e.label}
                  <span className="rituel-creneau">{e.creneau}</span>
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

(`import { Checklist }` supprimé.) — `CuisineView.tsx` : `<BatchView items={data.batch} rituel=… microBatch=…>` → retirer l'attribut `items`. — `getByText(/Riz/)` : vérifier au vert que `/muffins/i` matche bien le détail rituel « egg muffins ×10 lancés » de la semaine d'exemple.

Run: `npx vitest run tests/components.test.tsx tests/app.test.tsx`
Expected: PASS.

## Task 3 : Micro-batch premium (TDD)

**Files:**
- Modify: `src/components/cuisine/BatchView.tsx` (composant `MicroBatch` + dots), `src/index.css:701-731` (`.micro-*`)

- [ ] **Step 3.1 : Rouge** — remplacer le test « affiche le micro-batch en carrousel (non cochable) » par :

```tsx
  it('affiche le micro-batch en carrousel premium : badge jour + points de pagination', () => {
    const { container } = render(
      <BatchView rituel={RITUEL} microBatch={MICRO} semaine="2026-S39" />,
    );
    expect(screen.getByText(/Micro-batch de la semaine/)).toBeInTheDocument();
    const badge = screen.getByText('Lundi');
    expect(badge).toHaveClass('micro-jour-nom');
    expect(screen.getByText('doubler la sauce')).toBeInTheDocument();
    // seuls les étapes du rituel sont cochables
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    const dots = container.querySelectorAll('.micro-dots i');
    expect(dots).toHaveLength(2);
    expect(dots[0]).toHaveClass('on');
    expect(dots[1]).not.toHaveClass('on');
  });
```

Run: `npx vitest run tests/components.test.tsx`
Expected: FAIL (pas de `.micro-dots`).

- [ ] **Step 3.2 : Implémentation** — dans `BatchView.tsx`, extraire le JSX micro-batch en composant avec dots :

```tsx
import { useRef, useState } from 'react';
```

```tsx
function MicroBatch({ jours }: { jours: MicroBatchJour[] }) {
  const [actif, setActif] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const auScroll = () => {
    const el = ref.current;
    if (!el) return;
    setActif(Math.min(jours.length - 1, Math.max(0, Math.round(el.scrollLeft / 158))));
  };
  return (
    <section className="batch-section">
      <h3>⚡ Micro-batch de la semaine</h3>
      <div className="micro-batch" ref={ref} onScroll={auScroll}>
        {jours.map((m) => (
          <div className="micro-jour" key={m.jour}>
            <div className="micro-jour-nom">{capitalize(m.jour)}</div>
            <div className="micro-jour-quoi">{m.quoi}</div>
          </div>
        ))}
      </div>
      <div className="micro-dots" aria-hidden="true">
        {jours.map((_, i) => (
          <i key={i} className={i === actif ? 'on' : ''} />
        ))}
      </div>
    </section>
  );
}
```

(`158` = 150 carte + 8 gap — constante magique volontairement simple, commentaire interdit par style repo.) Appel : `{hasMicro && microBatch && <MicroBatch jours={microBatch} />}`.

- [ ] **Step 3.3 : CSS** — remplacer `.micro-batch` / `.micro-jour` / `.micro-jour-nom` / `.micro-jour-quoi` (lignes ~701-731) et ajouter :

```css
.micro-batch {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.micro-batch::-webkit-scrollbar {
  display: none;
}

.micro-jour {
  flex-shrink: 0;
  width: 150px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
}

.micro-jour-nom {
  display: inline-block;
  padding: 3px 9px;
  background: var(--accent-2);
  color: #272932;
  border-radius: 7px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.micro-jour-quoi {
  font-size: 13px;
  line-height: 1.45;
  margin-top: 8px;
}

.micro-dots {
  display: flex;
  gap: 4px;
  margin-top: 10px;
}

.micro-dots i {
  width: 4px;
  height: 4px;
  border-radius: 4px;
  background: var(--border);
  transition: width 0.2s ease, background-color 0.2s ease;
}

.micro-dots i.on {
  width: 14px;
  background: var(--accent);
}
```

- [ ] **Step 3.4 : e2e** — dans `tests/e2e/cuisine.spec.ts`, test batch (~l.99-110) : après `.rituel-creneau`, ajouter :

```ts
    await expect(page.locator('.batch-banner')).toHaveCount(0);

    await expect(page.locator('.micro-batch')).toBeVisible();
    await expect(page.locator('.micro-jour')).toHaveCount(3);
    await expect(page.locator('.micro-dots i')).toHaveCount(3);
```

Run: `npm run e2e` → 22 PASS (zéro débordement : le carrousel scrolle à l'intérieur).

## Task 4 : Gates + commit + revues

- [ ] **Step 4.1** : `npm test && npm run typecheck && npm run lint && npm run build` → tout PASS (224 tests : 225 − 2 supprimés + 2 nouveaux ≈ 225, vérifier le chiffre réel)
- [ ] **Step 4.2** : commit unique :

```bash
git add src/components/cuisine/BatchView.tsx src/components/cuisine/CuisineView.tsx src/components/cuisine/MenuView.tsx src/index.css src/assets/semaine-exemple.md tests/components.test.tsx tests/app.test.tsx tests/e2e/cuisine.spec.ts
git commit -m "feat: Mél partout, batch réduit au rituel + micro-batch premium"
```

- [ ] **Step 4.3** : revues subagent (spec + qualité) puis revue finale, PR, merge, deploy.
