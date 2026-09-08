# Spec — Redesign des 3 onglets Cuisine (direction A « Carnet », contenu enrichi)

Date : 2026-09-08 · Branche : `feat/cuisine-redesign` (empilée sur `feat/app-ludique`) · Statut : direction A validée par Marc (maquette `cuisine-vision.html`)

## Objectif

Redessiner Courses / Menu / Batch pour coller au carnet de recettes papier (source : `diet/carnet-recettes-batch-2026-09-02.html`, `diet/listes-courses-2026-09-02.html`) : recettes avec étapes / ingrédients / ⏱ / adaptation keto, rituel batch chronologique, encadré keto de Mélanie. Choix validés : **direction A « Carnet »** (tout déplié, recette dépliable sous le jour — pas de bottom-sheet) + **contenu enrichi** (le format .md évolue).

## 1. Format .md v2 (contrat étendu, rétrocompatible en lecture)

Principe : **additif** — tout ce qui existait reste valable ; les nouveaux blocs sont optionnels. Le parser (`parse.ts`) accepte les deux générations : une semaine ancienne s'affiche sans recettes/rituel, une semaine v2 affiche tout. Les ids de coches existants ne changent **jamais**.

- `## Recettes` (nouveau, optionnel) : une `### <slug recette>` par recette, avec :
  - `temps: 25 min` (optionnel, affiché ⏱)
  - `- pour 4: <ingrédients>` (ligne unique, optionnelle)
  - étapes = liste numérotée `1.` `2.` `3.` (optionnelle)
  - `- mel: <adaptation keto>` et `- batch: <consigne>` (lignes colorées dans l'UI)
- `## Menu` : les lignes repas peuvent référencer une recette par `→ <slug>` en fin de texte → le titre devient cliquable (recette dépliée sous le jour). Sans référence, affichage actuel.
- `## Batch` : inchangé (`- [ ]` tâches) **+** deux sous-sections optionnelles :
  - `### Rituel dimanche` : étapes `- 0-5 min · Four à 180° — egg muffins ×10` (créneau + tâche) → cochables (id `batch:rituel:{slug-étape}`)
  - `### Micro-batch` : `- lundi: doubler le plat` … → carrousel par jour (non cochable)
- `## Courses` : un `### Keto Mélanie` (rayon classique côté parser) devient l'**encadré vert** dans l'UI (style dédié, compteur propre). Ids stables : `courses:keto:{slug}`.

`src/assets/semaine-exemple.md` migre vers v2 (avec 2-3 recettes réelles du carnet, le rituel, le micro-batch, l'encadré keto) et reste l'exemple canonique du README.

## 2. Onglet Courses (maquette A)

- Compteur de progression **par rayon** (`2/8`) à droite du titre, en plus du total global (barre existante conservée)
- En-tête de groupe : miniature photo (existant) + titre + compteur
- Rayon `Keto Mélanie` rendu en **encadré vert dédié** (bordure/fond verts, titre « 🟢 Les extras keto de Mélanie »), toujours en fin de liste
- Checklist inchangée sinon (cibles 48px, persistance par ids)

## 3. Onglet Menu (maquette A)

- **Le jour courant est toujours le premier** de la liste : les jours sont réordonnés à partir d'aujourd'hui (mercredi → Mercredi, Jeudi… Mardi), l'ordre du fichier .md n'a plus d'importance pour l'affichage
- Chaque repas = ligne avec **tag de profil** : `Marc` (orange), `Mé` (vert), `Famille` (neutre), `Batch` (ambre) — remplace les labels texte « Déjeuner Marc » etc. (les 5 clés du parser restent les mêmes, seul l'affichage change)
- Si le repas référence une recette → titre souligné pointillé, cliquable : la **recette se déplie sous le jour** (accordéon, un seul déplié à la fois) : titre + ⏱, ingrédients « pour 4 », étapes numérotées, ligne 🟢 Mé, ligne 📦 Batch
- Carte « aujourd'hui » inchangée (bordure accent + badge)

## 4. Onglet Batch (maquette A)

- Section « 🕐 Rituel du dimanche » : **timeline verticale** (point + trait) cochable, créneau horaire à droite (`0-5 min`), progression `2/6`
- Section « ⚡ Micro-batch de la semaine » : carrousel horizontal de cartes jour (non cochable)
- Tâches batch existantes cochables en dessous (inchangées)
- État vide : si la semaine n'a ni rituel ni micro-batch → affichage actuel (bannière + checklist)

## 5. Data model (additif)

`WeeklyData` : `recettes?: Recette[]`, `batch.rituel?: RituelEtape[]`, `batch.microBatch?: { jour, quoi }[]`. `CourseItem` : inchangé (le rayon `keto` suffit). `MenuDay` : chaque repas gagne `recette?: string` (slug). `safeParse`/gardes : champs optionnels tolérés, anciennes données acceptées telles quelles.

## 6. Tests & vérifications

- TDD : parser v2 (recettes, rituel, micro-batch, keto, refs `→ slug`), rétro-compat (semaine v1 sans nouveaux blocs), ids stables
- Composants : compteurs par rayon, encadré keto, accordéon recette (un seul ouvert), timeline, carrousel, tags de profil
- e2e : zéro débordement horizontal sur les 3 onglets à 320/375 ; dépliage recette sur mobile
- Gates complets avant chaque commit

## Hors scope

- Import .md UI (reviendra plus tard avec la convention template)
- Minuteries/notifications, photos de recettes, édition dans l'app
