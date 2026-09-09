# Spec — Redesign « Nutrigo dark » (restyle complet + 4 emprunts produit)

Date : 2026-09-09 · Statut : direction validée par Marc · Source visuelle : maquette Figma « Nutrigo — Health Nutrition & Diet Dashboard » (node 453:11786 pour la carte recette) · Maquettes de validation : `.superpowers/brainstorm/95428-1788937210/content/` (style-tile, ecrans, graphe-v2)

## Objectif

Appliquer le langage visuel de la maquette Nutrigo à toute l'app (PWA dark-only conservée) et intégrer 4 emprunts produit : **stat-cards**, **widget poids**, **macros + health score sur les recettes**, **photos de plats**. Approche **restyle CSS-first** : la structure des composants actuels est conservée, on change la peau puis on ajoute les features. Décisions validées :

- **Thème dark adapté** (pas de light) : les gris Nutrigo deviennent les surfaces
- **Accent unique** : orange `#FFA257` + lime `#C2E66E` pour toute l'app — le theming par profil (`data-profile`) est supprimé ; orange = Marc, lime = Mélanie dans les badges
- **Typo Poppins** auto-hébergée (offline PWA)
- **% vs semaine passée** : impossible avec une seule semaine stockée → progression vs **cible** (kcal vs objectif, séances faites/prévues) ; seul le poids a un % (historique de pesées)

## 1. Design system (src/index.css)

Tokens sur `:root` (dark only, `color-scheme: dark` conservé) :

| Token | Valeur | Usage |
|---|---|---|
| `--bg` | `#1B1D24` | fond page |
| `--surface` | `#272932` | cartes (le gris texte Nutrigo devient la surface) |
| `--surface-2` | `#31333E` | sous-éléments, chips neutres, champs |
| `--border` | `#3F4351` | bordures |
| `--text` | `#F9F4F2` | texte (blanc chaud Nutrigo) |
| `--muted` | `#8A8C90` | texte secondaire |
| `--accent` | `#FFA257` | orange : action, Marc, séances |
| `--accent-2` | `#C2E66E` | lime : Mélanie, keto, validation |

- Suppression : `--accent-marc`, `--accent-melanie`, `--accent-strong`, blocs `[data-profile]` (CSS et `App.tsx`)
- Typo : `@font-face` Poppins 400/500/600/700 (woff2 latin dans `src/assets/fonts/`), fallback `-apple-system…`. h1 22/600, h2 20/600, h3 17/600, corps 16/400, chips 11–12/500
- Rayons : cartes 16, éléments internes 8, chips 6 (ou 999 en pill)
- Éléments restylés : dock d'onglets (verre dépoli, pastille active orange), bannière semaine (pill accent), sous-onglets cuisine, checklists, menu-day (bordure du jour = orange), timeline rituel (points orange), micro-batch, keto-box (teinte lime), boutons, champs, focus-visible
- Barre de score segmentée : 10 segments (remplis orange, vides `--surface-2`), radius 4 — motif réutilisable
- `theme_color`/`background_color` du manifest → `#1B1D24`
- Contraintes inchangées : cibles ≥ 48px, contraste ≥ 4.5:1, transitions 0.2s sur interactifs seulement, zéro débordement horizontal 320/375

## 2. Contrat .md — extensions optionnelles (rétrocompatibles)

Dans `## Recettes`, nouvelles clés par recette (toutes optionnelles, format v1 inchangé et toujours accepté) :

- `glucides: 30` et `lipides: 12` (g, par personne comme kcal/protéines)
- `score: 9` (health score, entier 0–10)
- `image: <URL https>` (photo du plat — Unsplash dans la semaine d'exemple)

Parser (`parse.ts`) : clé absente = champ absent = élément non affiché dans l'UI. Valeur invalide (score hors 0–10 / non entier, `image:` non https) → **warning**, jamais de crash. `semaine-exemple.md` enrichie (macros + scores + images Unsplash réelles), README synchronisé. **Aucun id de coche ni clé de menu modifié.**

## 3. Données dérivées — nouveau `src/lib/stats.ts`

Fonctions pures (zéro React, testées) :

- `poidsActuel(weights)` → dernière pesée (ou `null`)
- `variationPoids7j(weights)` → % vs la pesée la plus proche d'il y a ~7 j (ou `null` si aucune)
- `kcalDuJour(menuJour, recettes, profil)` → somme des `kcal` des recettes référencées par les repas **qui concernent le profil actif** : Marc → `dejeunerMarc` + `dinerFamille` ; Mélanie → `dejeunerMelanie` + (`dinerMelanie` sinon `dinerFamille`). `batch` exclu. Retourne `null` si aucun repas référencé
- `compteChecklist(checks, items)` → `{ faites, total }` (séances, courses)

## 4. Data model & storage (additif, rétrocompatible)

- `UserProfile` : + `poidsObjectif?: number`, `kcalObjectif?: number` — validation étendue dans `loadProfile`, les profils existants sans ces champs continuent de charger
- `Recette` : + `glucides?`, `lipides?`, `score?`, `image?: string`
- Aucune nouvelle clé localStorage, aucun id de coche modifié, `safeParse` + gardes de forme partout

## 5. Écran « Mon suivi »

- **Stat-cards** en tête (grille 2×2, cartes radius 16, chiffre Poppins 600 20px, label muted 11px) :
  1. **Poids** : actuel + badge variation vs 7 j — la couleur suit la direction vers l'objectif (perte vers objectif ≤ actuel = lime, sinon orange ; neutre sans objectif)
  2. **Kcal du jour** : total du menu prévu du jour (+ ligne « objectif N » si `kcalObjectif` existe, sinon total seul)
  3. **Séances** : faites/total + barre de progression orange
  4. **Courses** : restantes + barre lime
- **Widget poids** (remplace la sparkline, `Sparkline.tsx` supprimé) : carte « Suivi poids » avec 3 chips (Départ = première pesée, Actuel, Objectif = `poidsObjectif` ou « — ») + **`WeightChart.tsx`** (SVG pur, sans lib) : courbe lissée catmull-rom → bézier, grille kg discrète, ligne d'objectif en pointillés lime, points départ/actuel étiquetés, mois sur l'axe, responsive 320→560px. Formulaire de pesée intégré sous le graphe ; liste des pesées conservée telle quelle (restyle seulement)
- Sections Cibles / Rappels / Séances : restylées (mêmes contenus, cartes et chips Nutrigo)

## 6. Cuisine (Courses / Menu / Batch)

- **Restyle CSS-first** des composants existants (rayons, compteur, encadré keto lime, menu-day, tags : Marc = orange, Mé = lime, Famille = neutre, Batch = orange atténué, timeline, carrousel)
- **Fiche recette enrichie** : photo hero (16:9 arrondi) si `image:` — fallback dégradé orange/lime + emoji ; chips macros 🔥 kcal · 🌾 C · 💪 P · 💧 F (seulement les champs présents) ; health score segmenté si `score:` ; le reste (pour 4, bases, étapes, mel, batch) inchangé
- **Menu rows** : pas d'image (la photo vit dans la fiche dépliée) — évite de surcharger les lignes

## 7. Onboarding & Profil

- Cards de choix de profil : Marc = dégradé orange, Mélanie = dégradé lime (plus de teinte globale à la sortie de l'onboarding)
- Étape 2 (bases) + ProfilScreen : + 2 champs optionnels « Poids objectif (kg) » et « Objectif kcal/jour » (persistés dans `sportapp:profile`)

## 8. Theming & PWA

- `App.tsx` : plus de `document.documentElement.dataset.profile` ; `ProfileView` : constante `ACCENTS` supprimée
- Poppins : 4 woff2 (~15 Ko chacun) précahées automatiquement (`globPatterns` inclut déjà `woff2`)
- `runtimeCaching` étendu : pattern `images.unsplash.com` en CacheFirst (cache `images`, ~50 entrées) — les photos sont offline après 1ʳᵉ vue ; fallback dégradé/emoji si jamais vues ou `image:` absente

## 9. Tests (TDD) & vérifications

- `parse.test.ts` : nouvelles clés recettes, warnings invalides (score >10, image non https), rétro-compat v1
- `storage.test.ts` : profil avec/sans champs objectifs (anciennes données chargent)
- Nouveau `stats.test.ts` : poidsActuel, variationPoids7j (bordures : 1 seule pesée, pesée >7 j), kcalDuJour (refs manquantes, recette sans kcal), compteChecklist
- Composants : StatCards (avec/sans objectifs), WeightChart (rendu avec 0/1/N pesées), fiche recette (chips conditionnelles, fallback image)
- e2e : existants passent (textes et rôles stables) + zéro débordement horizontal 320/375 avec les nouvelles cartes
- Gates avant chaque commit : `npm test && npm run typecheck && npm run lint && npm run build`

## 10. Livraison en 4 phases (commits séparés)

1. **Design system** : tokens + Poppins + restyle CSS global + manifest (aucun changement DOM attendu, tests passent)
2. **Mon suivi** : `stats.ts` + `StatCards` + `WeightChart` (Sparkline supprimée) + champs objectifs (model/storage/ProfilScreen/onboarding)
3. **Recettes** : parser + contrat .md + semaine-exemple + README + fiche recette (image/macros/score) + runtimeCaching Unsplash
4. **Nettoyage theming + sync docs** : suppression `data-profile`/`ACCENTS`, mise à jour AGENTS.md + `ai/context/design-system.md` (les tokens y sont décrits — si divergence avec index.css, corriger les deux)

## Hors scope

- Stat-cards « % vs semaine passée » pour kcal/séances (nécessiterait un historique de semaines — pas de nouvelle clé storage)
- Restructuration des écrans façon Nutrigo (hero menu, diary en tableau, filtres/chips de catégories)
- Mensurations (poitrine/taille/hanches), photos de progression, « thoughts » par repas
- Import .md dans l'UI (reviendra avec la convention template)
