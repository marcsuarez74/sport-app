# Ajustements batch & Mé — design

**Date :** 2026-09-09 · **Statut :** validé en brainstorming (utilisateur : confirmation « OUI » pour le batch, « option B » pour le micro-batch)

## Contexte

Trois retours utilisateur après l'itération fidélité Figma :

1. Le diminutif affiché de Mélanie doit être **« Mél »** (aujourd'hui « Mé »)
2. L'onglet Batch affiche la cuisine **deux fois** (timeline rituel en haut + bannière/checklist en bas) → garder uniquement le bloc du haut
3. Le micro-batch est intéressant, à garder mais **redesigner** (option B validée : carrousel premium)

## Scope 1 — « Mé » → « Mél »

Toutes les occurrences **affichées** :

- `src/components/cuisine/MenuView.tsx` — tableau `MEALS` : `['dejeunerMelanie', 'Mé', 'tag-keto']` et `['dinerMelanie', 'Mé', 'tag-keto']` → `'Mél'`
- `src/index.css` — `.recette-mel::before` : `content: '🟢 Mé : '` → `'🟢 Mél : '`
- `src/assets/semaine-exemple.md` — mentions en clair : « Parmesan (courgettes spaghetti Mé) » (courses), « Chou-fleur (Mé) » (bases B7), « boxes de la semaine pour Mé » + « 1 box keto Mé » (rituel), « boxes keto de Mé » (tâche batch). Le titre « Les extras keto de Mélanie » reste complet.
- Tests : `tests/components.test.tsx:348,350` (tags attendus `'Mé'` → `'Mél'`)

Interdits : aucun id, aucune clé storage, aucun libellé de profil (« Mélanie » complet inchangé — onboarding, profil, keto box).

## Scope 2 — Batch : un seul bloc de cuisine

`src/components/cuisine/BatchView.tsx` :

- **Supprimé** : le bloc bas `batch-banner` (« Gros batch : dimanche, 45-60 min ») + `<Checklist items={items} …>`
- **Conservé dans l'ordre** : `RituelTimeline` (1er) → section micro-batch (2ᵉ, cf. scope 3)
- État vide : ni rituel ni micro-batch → `« Aucun batch prévu cette semaine. »` (conservé, simplifié)
- Signature : prop `items` retirée ; import `Checklist` retiré ; appel dans `CuisineView.tsx` mis à jour (plus de `items={data.batch}`)
- Le **contrat .md est intact** : la section `## Batch` reste parsée (tâches + ids stables), simplement non affichée. Aucun id de coche modifié — les coches persistées (`batch:…`) ne sont plus visibles mais jamais supprimées.

Tests impactés (`tests/components.test.tsx`, describe `BatchView` + `BatchView v2`) :

- « renders the banner and the checklist items » et « renders a muted message and no banner » → **supprimés** (bloc disparu)
- « affiche la timeline au-dessus de la liste batch existante » → réécrit : timeline **au-dessus du micro-batch**, plus aucune `.batch-banner`/`ul.checklist` même avec items fournis (prop supprimée)
- « garde l'ancien rendu (bannière + checklist) sans rituel ni micro-batch » → réécrit : sans rituel ni micro → message muted seul
- les autres tests du rituel (coche persistante, resync semaine) restent, signature nettoyée
- `tests/app.test.tsx` (~ligne 116) : l'assertion `getByText(/Riz/)` sur l'onglet Batch ne passe plus (le riz n'y est plus affiché) → remplacée par une info toujours visible (rituel : `/muffins/i`)

## Scope 3 — Micro-batch : carrousel premium (option B)

`BatchView.tsx` + `src/index.css` (`.micro-*`) :

- Cartes : largeur 128px → **150px**, radius 12 → 14, padding 12, fond `--surface` (au lieu de `--surface-2`), bordure `--border` ; hauteur unifiée (les flex items s'étirent)
- Nom du jour : devient un **badge lime** — `bg var(--accent-2)`, texte `#272932`, 10.5px, 700, uppercase, letter-spacing 0.04em, padding 3px 9px, radius 7 (classe `.micro-jour-nom` conservée, styles changés)
- **Points de pagination** : nouveau bloc `.micro-dots` sous le carrousel — 1 point par jour (`.micro-dots i`), point actif = largeur 14px + `bg var(--accent)` ; inactifs 4px, `bg var(--border)` ; `aria-hidden="true"` (décoratif)
- Activation du point actif : `onScroll` sur `.micro-batch` → index actif = `Math.round(scrollLeft / (150 + 8))` borné au nombre de jours ; état local `useState` + `useRef` dans `BatchView` (pas de dépendance nouvelle)
- Titre inchangé : « ⚡ Micro-batch de la semaine » ; position 2ᵉ bloc sous le rituel (inchangée)
- Le carrousel reste le seul scroll horizontal (cartes 150px × 3 ≈ 474px > conteneur, sans débordement de page — `overflow-x: auto` sur le carrousel seulement)

## Hors périmètre

- Le reste de l'onglet (timeline rituel visuellement), le menu, les cartes recette, Mon suivi
- Parser, format .md, clés storage, ids de coches
- La bannière « Gros batch » ne revient pas ; les tâches `## Batch` ne sont plus affichées (décision utilisateur)

## Tests (TDD)

- `tests/components.test.tsx` :
  1. tags repas : `'Mé'` → `'Mél'` (×2, ligne 348/350)
  2. BatchView sans banner/checklist : rituel visible, micro visible, `container.querySelector('.batch-banner')` nul, `ul.checklist` nul
  3. micro-batch : badge jour (« Lundi ») dans `.micro-jour-nom`, 1 point par jour dans `.micro-dots` (2 avec le fixture MICRO), 1er point `.on`
  4. ordre DOM : `.rituel-timeline` avant `.micro-batch`
  5. coche rituel + resync semaine : inchangés (signature sans `items`)
  6. état vide : sans rituel ni micro → « Aucun batch prévu cette semaine. »
- `tests/app.test.tsx` : assertion Batch `/Riz/` → `/muffins/i`
- `tests/e2e/cuisine.spec.ts` : test batch — ajouter `expect(page.locator('.batch-banner')).toHaveCount(0)`, `.micro-jour` count 3, `.micro-dots i` count 3 ; aucune assertion e2e ne référence « Mé » (vérifié)
- Parcours `rg -n "'Mé'|🟢 Mé" src/ tests/` à zéro occurrence (hors « Mélanie »)

## Vérifications

- `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e` (320/375 zéro débordement — le carrousel premium doit rester contained)
- Companion : comparaison avant/après micro-batch (mockup option B = référence)

## Risques

- Dots de pagination : le calcul au swipe doit rester trivial et ne jamais casser au resize (recalcul à chaque scroll, pas de listener resize — accepté, décoratif)
- La disparition de la checklist retire une info (courses?) du batch — les tâches restent dans le .md si besoin de les réafficher plus tard
