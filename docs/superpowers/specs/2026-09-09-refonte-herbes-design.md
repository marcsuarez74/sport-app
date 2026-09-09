# Spec — Refonte visuelle « Herbes » (passage au thème clair)

**Date :** 2026-09-09 · **Statut :** validée en brainstorming (companion visuel) · **Chantier 1/5** du découpage de `docs/ameliorations.md` (axe 1) — hors IA, hors restructuration fonctionnelle.

## 1. Contexte

L'axe 1 du fichier d'améliorations (« trop compact, le sombre alourdit, manque d'icônes, viser cuisine/élégance/sobriété ») devient un chantier. Session de brainstorming avec companion visuel : quatre directions rejetées (« Braise » dark affiné, « Céramique » lin/terracotta, « Fiche graduée » basilic/beurre, trois évolutions Nutrigo sombres) avant validation claire de l'utilisateur : *« plus de thème sombre »*.

## 2. Décisions validées

| Élément | Décision |
|---|---|
| Direction | **« Herbes »** — thème clair sauge/basilic/citron (fond `#F0F2EB`, action `#3E7A46`, surbrillance `#F2DC7B`) |
| Adjectifs guides | simple · intuitif · attrayant |
| Typo | **Poppins conservée** (toute proposition de changement a été rejetée) ; titre de jour élargi, chiffres tabulaires (`font-variant-numeric: tabular-nums`) pour poids/kcal |
| Densité | « respiré » : +40 % d'air (padding cartes 16→18, gaps 8→12), cartes repas individuelles |
| Appétence | vignette gourmande par repas (image recette si dispo, sinon gradient sauge/citron + émoji), méta sous le nom (temps, kcal, tag-point) |
| Navigation | **Segmented control compact sous la bannière** (dock flottant supprimé) + **balayage horizontal** pour changer d'onglet principal |
| Icônes | SVG ligne (trait 2 px, bouts arrondis) pour le chrome et les actions ; émojis uniquement pour la nourriture |
| Règle repo | « dark mode only » **abandonnée** — AGENTS.md, `ai/context/*`, `rules.prompt.md` du design-agent réécrits en même temps que le CSS |

## 3. Tokens (`:root` de `src/index.css`)

| Token | Ancien (Nutrigo) | Nouveau (Herbes) | Usage | Contraste |
|---|---|---|---|---|
| `--bg` | `#1b1d24` | `#F0F2EB` | fond de page, fond segmented inactif | — |
| `--surface` | `#272932` | `#FCFDF9` | fiches, cartes | texte ≈ 12,6:1 |
| `--surface-2` | `#31333e` | `#E7EAE0` | pastilles secondaires, thumb fallback, segmented fond | — |
| `--border` | `#3f4351` | `#E1E6DA` | filets, bordures | — |
| `--text` | `#f9f4f2` | `#26312B` | texte principal | ≈ 12,6:1 |
| `--muted` | `#9a9ca6` | `#6E7A6C` | texte secondaire | ≥ 4,6:1 sur surface |
| `--accent` | `#ffa257` | `#3E7A46` | action unique : segmented actif, coches, CTA, focus, barres, tag Marc/Batch, today | blanc dessus ≈ 5,9:1 |
| `--accent-2` | `#c2e66e` | `#F2DC7B` | surbrillance : carte pesée, tag Mé/keto, encadré keto, barre courses, delta bon | encre dessus ≈ 8,9:1 |
| `--danger` | `#ff6b6b` | `#B4452F` | erreurs, switch profil (blanc dessus ≈ 5,4:1) | ✓ |

**Interdits :** texte citron sur fond clair (contraste < 3:1) — le citron n'est jamais une couleur de texte, seulement un fond de badge/carte avec texte encre. Couleurs en dur dans les composants toujours interdites. `prefers-reduced-motion` inchangé.

Dérivés : rayons — cartes 18 px (au lieu de 16 px, respiration), pills 999 px, chips 10 px ; ombre unique réservée au segmented compact + éléments flottants (plus d'ombre par carte — les cartes vivent par leur bordure `--border`) ; `today` = bordure 2 px basilic + filet gauche (plus de glow).

Tags repas : Marc = basilic plein (texte blanc) · Mé/keto = citron (texte encre) · Famille = contour lin · Batch = pointillé lin.

## 4. Navigation — segmented compact + balayage

- **Segmented** sous la bannière (`WeekBanner` reste le seul `h1`) : fond `--surface-2`, bordure `--border`, rayon 999, 2 segments (🛒 Cuisine / 🎯 Mon suivi), cibles ≥ 48 px, `aria-current="page"` sur l'actif. Segment actif : fond `--surface`, texte encre 700, ombre légère. Inactif : `--muted`.
- **Balayage** : horizontal, change l'onglet principal ; seuil ≥ 80 px **ou** vélocité nette ; animation `transform` 0,25 s désactivée par `prefers-reduced-motion`.
- **Conflits** : le balayage ne s'arme pas quand le geste démarre dans une zone à scroll horizontal (carrousel micro-batch, scroll recettes) ; les sous-onglets Cuisine (Courses/Menu/Batch) ne sont pas concernés par le swipe.
- L'espace libéré en bas supprime `padding-bottom: 88px` de `.main-content` (remplacé par le safe-area standard).

## 5. Écrans — mapping

| Écran / composant | Changements |
|---|---|
| Onboarding | halos radiaux sauge/citron ; carte Marc = dégradé basilic (texte blanc), Mélanie = dégradé citron (texte encre) ; CTA basilic ; dots basilic |
| WeekBanner | fond page, titre encre, pill Menu A basilic (texte blanc), icône profil porcelaine + bordure |
| Cuisine · Courses | fiches rayon porcelaine + bordure, compteurs lin, barre progression basilic, encadré keto citron |
| Cuisine · Menu | carte jour = vignette gourmande + nom + méta (⏱/🔥/tag-point) ; titre du jour 19 px/700 (au lieu de 17) ; aujourd'hui = bordure basilic + badge citron ; passés atténués ; recette-card restylée (mêmes états) |
| Cuisine · Batch | timeline basilic, carrousel micro-batch porcelaine/surface-2 |
| Mon suivi | poids en héros (26 px/700 tabulaire + delta basilic + mini-courbe existante restylée), stats 2 colonnes, bloc pesée habillé en carte citron (uniquement l'habillage du bloc existant — aucune mécanique nouvelle, la carte actionnable est une cible du chantier 5) |
| Profil | cohérence tokens ; switch reste `--danger` |
| Dock → segmented | suppression `.tabbar-dock*`, nouvelle `.tabbar-segmented` ; entrée `App.tsx` inchangée dans son principe (même état `activeTab`) |

## 6. PWA

- `vite.config.ts` manifest : `theme_color: '#F0F2EB'`, `background_color: '#F0F2EB'`
- `index.html` : `<meta name="theme-color">` → `#F0F2EB`
- `public/icon-src.svg` : refonte (fond sauge `#F0F2EB`, monogramme « R » basilic, arc citron ~25 %, zone sûre maskable respectée : rayon ≤ 200/512) puis `npm run icons`

## 7. Fichiers touchés

| Fichier | Action |
|---|---|
| `src/index.css` | réécriture tokens + ~toutes les classes (mêmes sélecteurs sémantiques, nouvelles valeurs ; `.tabbar-dock*` → `.tabbar-segmented`) |
| `src/App.tsx` | navigation : suppression du dock, ajout segmented + swipe (logique mince, UI restituée par composants) |
| `src/components/WeekBanner.tsx`, cuisine/*, suivi/*, onboarding/*, `ProfilScreen.tsx` | ajustements markup minces (vignettes, méta, icônes SVG) — aucune logique |
| `src/lib/rayons.ts` | inchangé (images réutilisées) |
| `vite.config.ts`, `index.html`, `public/icon-src.svg` (+ PNG régénérés) | cf. § 6 |
| `AGENTS.md`, `ai/context/design-system.md`, `ai/context/ui-guideline.md`, `ai/agent/design-agent/rules.prompt.md` | retrait « dark mode only », palette Herbes, nav segmented |
| `CHANGELOG.md` | section `[Non publié]` → « Modifié : thème clair Herbes, navigation segmented + swipe » |

## 8. Hors périmètre

Restructuration des vues (semaine/jour, séances hebdo, calories réelles… : chantiers 2-5) · import/export · IA · toute nouvelle fonctionnalité. Les tests comportementaux ne changent pas (aucune assertion couleur) ; e2e mobile 320/375 doivent rester verts.

## 9. Vérifications

- `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e` — tout vert (zéro débordement horizontal 320/375)
- `npm run build && npm run preview` : manifest + sw à jour, icônes régénérées, thème visible, statut PWA clair (barre iOS sauge)
- Contrastes ≥ 4,5:1 mesurés (cf. § 3) · cibles ≥ 48 px · `prefers-reduced-motion` vérifié
- Lighthouse mobile > 95 sur le preview

## 10. Risques

- **Swipe vs carrousel** : conflit de geste — mitigé par l'armement conditionnel (§ 4) + e2e dédié au carrousel
- **Régression visuelle large** : beaucoup de classes touchées — mitigé par la revue écran par écran sur preview (320/375/560) avant commit
- **Citron** : seulement fond de badge/carte — règle explicitée pour éviter les régressions de contraste
- **Icônes maskable** : même contrainte de zone sûre que le monogramme actuel (vérification visuelle du crop)
