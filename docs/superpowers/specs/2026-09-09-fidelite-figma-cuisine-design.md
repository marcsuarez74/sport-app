# Fidélité Figma — Cuisine (segmented control + carte recette)

**Date :** 2026-09-09 · **Statut :** validé en brainstorming (mockup apprové par l'utilisateur : « je veux strictement ça pas autre chose »)

## Contexte

La refonte Nutrigo a été jugée « très approximative » sur deux points précis. On isole les scopes et on corrige la fidélité strictement :

- **Réf 1** : node 2:4220 (`Header-Section`) + frame « 03. Healthy Menu (Mobile) » (445:10499) — le **segmented control** des sous-onglets
- **Réf 2** : node 453:11786 (`Card List All Menu`, Device=Mobile) — la **carte recette compacte**

Décisions utilisateur : **Option A** (les cartes vivent dans le planning par jour, sous la ligne du repas qui a une ref) ; onglets **sans emoji** ; badge catégorie = **à qui est le repas** ; « strictement ça, pas autre chose » — le mockup validé fait foi, pas de fiche recette « à la maquette » séparée, pas de filtres/search/tri, pas de section Popular/Featured.

## Scope 1 — Sous-onglets : segmented control

`CuisineView.tsx` + `src/index.css` (`.cuisine-tabs`).

- Labels sans emoji : `Courses`, `Menu`, `Batch` (suppression 🛒 📅 📦)
- Structure DOM inchangée : `nav.cuisine-tabs > button.tab` ×3 (+ `aria-current` conservé)
- CSS conteneur : `display:flex; background:var(--surface-2); border-radius:10px; padding:3px; gap:3px; margin-bottom:12px;`
- CSS bouton : `flex:1; min-height:48px` (tactile conservé) `; border-radius:8px; background:none; color:var(--muted); font-size:12px; font-weight:600;` (suppression `padding 10px 0` → géré par min-height)
- CSS actif : `background:var(--accent-2); color:#272932; font-weight:700;` — **suppression** de la barre orange `box-shadow inset` et du fond `--surface-2`

## Scope 2 — Carte recette compacte + détail déplié

`MenuView.tsx` + `src/index.css` (section recette) + tests.

### Dans le planning (MenuView)

- La ligne repas reste : `menu-row` (tag + texte) — **le lien « 📖 nom » est supprimé**
- Chaque repas **avec ref résolue** affiche `RecetteCard` **immédiatement sous sa ligne**, avec `mealLabel` = libellé du repas (`Marc`, `Mé`, `Famille`, `Batch`)
- `openRec` (state global unique) est supprimé : chaque carte gère son propre état ouvert/replié (multi-ouvertes possibles, comportement naturel par carte)

### Carte repliée (= maquette 453:11786, proportions Figma)

```
article.recette-card                    fond --surface, border --border, radius 16, padding 10
  div.recette-top
    img.recette-thumb | .recette-fallback   ~110×76, radius 12 (fallback gradient + emoji, existant)
    div.recette-main
      div.recette-nom                    13px, --text, 600, line-clamp:3
      button.recette-toggle              lime --accent-2, texte #272932, r8, « Voir la recette ⌄ » / « Réduire ⌃ »,
                                         min-height:48px (tactile AGENTS.md), pleine largeur de .recette-main
  div.recette-badges                     rangée flex-wrap:wrap, gap 6-8px ; score en bout de rangée
    span.recette-badge-cat               lime, texte sombre — mealLabel (Marc/Mé/Famille/Batch)
    span.recette-badge-info              --surface-2, --muted — « ⏱ {temps} » si temps,
                                         temps = partie avant « · » (ex. « 45 min », pas « 45 min · four 200° »)
    div.recette-score                    margin-left:auto — si la ligne déborde (320/375), le wrap
                                         le fait passer sur sa propre ligne, aligné à droite
      « Health score : » (10-11px muted) + « N » (600) + « /10 » (muted small)
      .score-bar                         segments flexibles (existant .score-seg flex:1, height ~5px),
                                         remplis --accent — la barre épouse la place restante
  div.recette-nutri                      fond --surface-2, r8, font-size 11px, cellules une ligne (nowrap),
                                         séparées par traits verticaux (1px, ~14px haut)
    🔥 N kcal | 🌾 Ng C | 💪 Ng P | 💧 Ng F   (cellules conditionnelles — la barre n'existe que si ≥ 1 donnée)
```

### Carte dépliée (tap sur le toggle)

- Séparateur pointillé haut, puis les sections existantes **inchangées dans le contenu** : `pour`, `bases` (chips → description), `étapes` (ol), `mel`, `batch`
- Re-tap sur le bouton = repli. **Le bouton × disparaît** (le toggle le remplace)
- `RecetteCard` : `useState<boolean>` interne, props `{ recette, bases?, mealLabel }` — `onClose` supprimé

### Règles données

- Sans `temps` → pas de badge info ; sans macros/score → pas de footer/score ; sans `image` → fallback
- Le badge catégorie reflète le repas du planning (pas la catégorie Figma Breakfast/Lunch — nos données n'ont pas cette info)

## Hors périmètre (réclamé « strictement ça »)

- Navbar Figma (avatar + titre + bouton), recherche, tri, CTA, filtres All/Breakfast/…, widget Featured/Popular/Recommended
- La section étapes de la maquette (elle n'existe pas dans la carte mobile Figma ; chez nous le détail déplié reste)
- Toute autre partie de l'app (Mon suivi, onboarding, dock, encadré keto, shopping list, batch view)
- Parser, données, clés storage

## Tests (TDD)

- `tests/components.test.tsx` — describe renommé `MenuView — carte recette` :
  1. carte compacte rendue sous la ligne du repas avec ref : nom + bouton « Voir la recette » + badge catégorie (= label repas) + footer nutrition (valeurs présentes seulement, format « 🔥 620 kcal » — les « ~ » et « /pers » disparaissent)
  2. score inline : « Health score : » + `N/10` + barre 10 segments (N remplis) ; absent sans score
  3. badge ⏱ présent si `temps` (tronqué avant « · »), absent sinon
  4. dépliage : clic bouton → étapes visibles + label « Réduire » ; re-clic → replié
  5. deux repas avec refs → deux cartes, ouverture indépendante
  6. fallback image (pas d'`img`, `data-testid="recette-fallback"`)
  7. tabs : libellés sans emoji (`Courses`), classe active
- Tests existants à trier explicitement :
  - `components.test.tsx:480` (« referme la fiche via le bouton × ») → **supprimé** (le × n'existe plus)
  - `components.test.tsx:464` (« n'ouvre qu'une seule fiche à la fois ») → **réécrit** en multi-ouvertes (item 5)
  - `components.test.tsx:504` (ligne méta « ⏱ temps · pour 4 ») → **réécrit** : le `.recette-meta` disparaît de la carte ; le « pour 4 » décoratif disparaît avec lui, la section `pour` (ingrédients) reste en déplié
  - `components.test.tsx:500` (chips stats) → **réécrit** au nouveau format du footer nutrition
- `tests/app.test.tsx` : lignes 112/115, les clics `getByRole('button', { name: '📅 Menu' })` / `'📦 Batch'` → `'Menu'` / `'Batch'`
- `tests/e2e/cuisine.spec.ts` : test « fiche recette » réécrit (dépliage via le bouton « Voir la recette », repli par re-clic — plus de ×) ; tabs sans emoji ajustés partout

## Vérifications

- `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e` (320/375 zéro débordement)
- Companion visuel : comparaison carte maquette vs carte implémentée (rendus Figma + capture réelle par l'utilisateur)
- `npm run build && npm run preview` : rendu réel avant commit

## Risques

- Densité visuelle du menu : 1-3 cartes repliées par jour (chacune ~140-190px selon wrap de la rangée badges) — la hiérarchie jour > repas > carte doit rester lisible ; mitigé par la carte repliée compacte et le `--surface` vs `--bg`
- Le libellé recette répète parfois le texte du repas (ex. « Pâtes bolognaise ») — acceptable : la carte apporte image/macros/étapes, la ligne le contexte horaire
- e2e WebKit flakiness déjà observé — pas de lien avec ce scope, mais à surveiller au push
