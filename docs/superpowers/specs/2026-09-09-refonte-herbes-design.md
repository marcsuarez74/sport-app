# Spec — Refonte visuelle « Herbes » (passage au thème clair)

**Date :** 2026-09-09 · **Statut :** validée en brainstorming + **maquette interactive approuvée** (dont menu v2) · **Chantier 1/5** du découpage de `docs/ameliorations.md` (axe 1) — hors IA, hors chantiers 2-5. Maquette de référence : `docs/superpowers/mockups/herbes-maquette-interactive.html`.

## 1. Contexte

L'axe 1 du fichier d'améliorations (« trop compact, le sombre alourdit, manque d'icônes, viser cuisine/élégance/sobriété ») devient un chantier. Session de brainstorming avec companion visuel : quatre directions rejetées (« Braise » dark affiné, « Céramique » lin/terracotta, « Fiche graduée » basilic/beurre, trois évolutions Nutrigo sombres) avant validation claire de l'utilisateur : *« plus de thème sombre »*. La maquette interactive a ensuite fait **évoluer le périmètre** : trois fonctionnalités validées en maquette entrent dans ce chantier (menu v2 « réserve de recettes », mode magasin courses, mode guidé batch — cf. § 7).

## 2. Décisions validées

| Élément | Décision |
|---|---|
| Direction | **« Herbes »** — thème clair sauge/basilic/citron (fond `#F0F2EB`, action `#3E7A46`, surbrillance `#F2DC7B`) |
| Adjectifs guides | simple · intuitif · attrayant |
| Typo | **Poppins conservée** (toute proposition de changement a été rejetée) ; chiffres tabulaires (`font-variant-numeric: tabular-nums`) pour poids/kcal |
| Densité | « respiré » : +40 % d'air (padding cartes 16→18, gaps 8→12), cartes repas individuelles |
| Appétence | vignette gourmande par repas (image recette si dispo, sinon gradient sauge/citron + icône), méta sous le nom (temps, kcal, tag-point) |
| Icônes | **Jeu SVG maison** (trait 2 px, bouts arrondis, `currentColor`, viewBox 24) injecté via un composant `Icon` — cf. § 7.1 ; émojis uniquement pour l'**onboarding** (💪 🌿 🚀, style « grand écart fun » validé) et les **salutations** (« Salut Marc 👋 ») |
| Surnom | **« Mél »** partout (tags repas, encadré keto, réserve, portions) — jamais « Mé » (déjà appliqué en production, la maquette a hérité de l'ancien) |
| Navigation | **Segmented control compact sous la bannière** (dock flottant supprimé) + **balayage horizontal** pour changer d'onglet principal ; sous-onglets Cuisine (Courses/Menu/Batch) = **filets discrets** (texte + soulignement), plus de pilules |
| Menu | **v2 « réserve de recettes »** : plus de jour imposé, 1 carte = 1 repas avec coche « c'est fait », portions réelles par profil — cf. § 7.3 |
| Batch | **Mode guidé** « Lancer le batch » étape par étape + textes de **conservation** — cf. § 7.4-7.5 |
| Courses | Bannière « Pensées pour le rituel », quantités, marqueur casserole, **Mode magasin** — cf. § 7.2 |
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
| `--accent-2` | `#c2e66e` | `#F2DC7B` | surbrillance : carte pesée, tag Mél/keto, encadré keto, barre courses, delta bon | encre dessus ≈ 8,9:1 |
| `--danger` | `#ff6b6b` | `#B4452F` | erreurs, switch profil (blanc dessus ≈ 5,4:1) | ✓ |

**Interdits :** texte citron sur fond clair (contraste < 3:1) — le citron n'est jamais une couleur de texte, seulement un fond de badge/carte avec texte encre. Couleurs en dur dans les composants toujours interdites. `prefers-reduced-motion` inchangé.

Dérivés : rayons — cartes 18 px (au lieu de 16 px, respiration), pills 999 px, chips 10 px ; ombre unique réservée au segmented compact + éléments flottants (plus d'ombre par carte — les cartes vivent par leur bordure `--border`) ; `today` = bordure 2 px basilic + filet gauche (plus de glow). **Marges 20 px** sur tous les panneaux (le maillage `.pad` doit viser les divs comme les sections). **Médaillon rituel** : rond 30 px fond `color-mix(in srgb, var(--accent) 18%, var(--surface))`, icône casserole basilic (bannières Courses/Batch) ; marqueur casserole inline des items batch : basilic, 12 px. **Encadré portions** (cartes menu) : fond `--surface-2`, rayon 9 px, label « PORTIONS » 8,5 px/700 espacé.

Tags repas : Marc = basilic plein (texte blanc) · Mél/keto = citron (texte encre) · Famille = contour lin · Batch = pointillé lin.

## 4. Navigation — segmented compact + balayage

- **Segmented** sous la bannière (`WeekBanner` reste le seul `h1`) : fond `--surface-2`, bordure `--border`, rayon 999, 2 segments (icônes panier / cible + libellés « Cuisine » / « Mon suivi »), cibles ≥ 48 px, `aria-current="page"` sur l'actif. Segment actif : fond `--surface`, texte encre 700, ombre légère. Inactif : `--muted`.
- **Sous-onglets Cuisine (Courses/Menu/Batch)** : filets discrets — texte 12 px, actif = encre 700 + soulignement 2 px accent ; inactif = `--muted` ; plus de pilules.
- **Balayage** : horizontal, change l'onglet principal ; seuil ≥ 80 px **ou** vélocité nette ; animation `transform` 0,25 s désactivée par `prefers-reduced-motion`.
- **Conflits** : le balayage ne s'arme pas quand le geste démarre dans une zone à scroll horizontal (carrousel micro-batch, recette dépliée) ; les sous-onglets Cuisine (Courses/Menu/Batch) ne sont pas concernés par le swipe.
- L'espace libéré en bas supprime `padding-bottom: 88px` de `.main-content` (remplacé par le safe-area standard).

## 5. Écrans — mapping

| Écran / composant | Changements |
|---|---|
| Onboarding | émojis géants **conservés** (validés) ; halos radiaux sauge/citron ; carte Marc = dégradé basilic (texte blanc), Mélanie = dégradé citron (texte encre) ; CTA basilic ; dots basilic |
| WeekBanner | fond page, titre encre, pill Menu A basilic (texte blanc), icône profil porcelaine + bordure |
| Cuisine · Courses | fiches rayon porcelaine + bordure (icône de rayon SVG 17 px sur tuile dégradée), compteurs lin, barre progression **citron**, encadré keto citron + **bannière « Pensées pour le rituel » + quantités + marqueur casserole + Mode magasin** (détail § 7.2) |
| Cuisine · Menu | **réécriture : réserve de recettes** — compteur « N/M faits » + barre basilic, 1 carte repas (surface, filet, 18 px) avec coche en tête, vignette, chips batch, encadré portions par profil, indice fraîcheur, recette dépliable pleine largeur (détail § 7.3) |
| Cuisine · Batch | timeline basilic conservée, carrousel micro-batch porcelaine/surface-2, réserve des boîtes avec icônes SVG, **bannière « Ce soir » + mode guidé « Lancer le batch »** (détail § 7.4) |
| Mon suivi | poids en héros (26 px/700 tabulaire + delta basilic + mini-courbe existante restylée), stats 2 colonnes, bloc pesée habillé en carte citron (uniquement l'habillage du bloc existant — aucune mécanique nouvelle, la carte actionnable est une cible du chantier 5) |
| Profil | cohérence tokens ; switch reste `--danger` ; mentions éventuelles « Mél » |
| Dock → segmented | suppression `.tabbar-dock*`, nouvelle `.tabbar-segmented` ; entrée `App.tsx` inchangée dans son principe (même état `activeTab`) |

## 6. PWA

- `vite.config.ts` manifest : `theme_color: '#F0F2EB'`, `background_color: '#F0F2EB'`
- `index.html` : `<meta name="theme-color">` → `#F0F2EB`
- `public/icon-src.svg` : refonte (fond sauge `#F0F2EB`, monogramme « R » basilic, arc citron ~25 %, zone sûre maskable respectée : rayon ≤ 200/512) puis `npm run icons`

## 7. Fonctionnalités validées en maquette

### 7.1 Icônes SVG maison (`Icon`)

- Nouveau composant `src/components/Icon.tsx` : map nom → chemins SVG, `<Icon name size strokeWidth?>` — trait 2 px (2,5 pour le check géant), `currentColor`, viewBox 24, bouts arrondis. Export nommé, zéro dépendance (pas de font d'icônes).
- Jeu dessiné dans la maquette (les chemins servent de référence) : `cart, target, chev, pot, scale, moon, box, snow, fish, leaf, wheat, cheese, bowl, pasta, meat, plus, check, eye, clock, flame, drop, play`.
- Usage : chrome et actions (segmented, bannières, compteurs, chips, réserve, vignettes sans image). Les émojis restent uniquement pour l'**onboarding** (💪 🌿 🚀 👋) et les salutations (« Salut {prénom} 👋 »). Tout nouvel émoji UI est interdit — la maquette fait foi.

### 7.2 Courses enrichies

- **Bannière « Pensées pour le rituel »** en tête de Courses : médaillon casserole (cf. § 3) + « les items marqués [casserole] alimentent le batch de dimanche » + budget estimé. Fond `--surface-2`, rayon 12, **sans bordure**. La bannière « Ce soir » du Batch reçoit le même traitement (icône lune).
- **Quantités** dans les libellés d'items (« Carottes — 1 kg », « Œufs — 12 ») : texte du .md, aucun nouveau champ.
- **Marqueur casserole** inline sur les items qui alimentent le batch : `--accent`, 12 px, suivi du mot « rituel ».
- **Note de fraîcheur inline** sous un item (saumon : « poisson frais : à acheter vendredi, pas avant ») — source de données cf. § 7.6.
- **Mode magasin** : bouton pill dans la barre de progression. Actif : les items cochés sont masqués (pur filtre d'affichage, `.done` → display none), libellé « Tout revoir » (icône œil) ; inactif : « Mode magasin » (icône panier). Le compteur et les coches ne bougent pas, **non persisté**.

### 7.3 Menu v2 — « réserve de recettes »

- **Fin du menu par jour affiché** : 1 occurrence de repas = 1 carte indépendante (les doublons restent des cartes séparées), ordonnée par fraîcheur. Les jours restent dans les **données** (ordre initial + calcul kcal du jour) mais ne sont plus rendus comme des sections. « Aujourd'hui » disparaît du Menu — la bannière « Ce soir » du Batch reprend ce rôle.
- **En-tête** : compteur « N/M faits » + barre basilic (la barre citron reste exclusive aux courses).
- **Carte repas** (surface, filet `--border`, rayon 18 px) :
  - tête : **coche « c'est fait »** — seule zone cliquable de la carte (les clics sur boutons ne cochent pas) — + vignette (image recette si dispo, sinon gradient + icône SVG) + tag profil + titre + temps ≈ + kcal ;
  - **chips « batch associé »** : refs des `bases:` existantes (« B4 · Riz », « B6 · Poulet grillé »), ou « Cuisson du jour » / « Poisson frais » à défaut ;
  - **encadré « PORTIONS »** : quantités réelles **par profil**, adaptées aux objectifs — « Marc · riz 150 g · poulet 120 g · légumes 200 g » / « Mél (keto) · poulet 150 g · asperges 250 g · sans riz ». **Exigence forte de l'utilisateur** : c'est là que les objectifs vivent dans le menu ;
  - **indice de fraîcheur** (icône + texte : « boîte frigo · sous 2 jours », « sortir la veille au soir », « poisson frais · à acheter vendredi ») ;
  - **« Voir la recette » pleine largeur sur chaque carte avec une recette rattachée** : étapes courtes de réchauffage/décongélation pour les repas batch, étapes complètes + macros + adaptation keto pour les cuissons du jour. Chevron SVG rotatif, libellé « Réduire » à l'ouverture. Les cartes sans recette (boîtes, restes) restent simples, sans bouton — le « cook libre » sans recette reste un chantier ultérieur (docs/ameliorations.md § 4).
- **Ordre = conseil, pas règle** : batch/frigo d'abord, poisson frais en dernier + note explicative sous la liste.
- **Coche repas persistée** : nouveaux ids `menu:{jour}:{clé}` dérivés des données, stockés dans `sportapp:checks:{semaine}` — **aucun id de coche existant modifié**.
- Tests : les tests unitaires/e2e jour-based du Menu sont réécrits (TDD, d'abord en rouge).

### 7.4 Batch — mode guidé

- Bouton primaire **« Lancer le batch »** (icône play) → vue étape par étape : « Étape n/N · horaire », titre, détail, barre de progression, « Étape terminée → » (dernière : « Terminer le batch ✓ »), ghost « Revenir à l'aperçu ».
- Fin : « **Batch terminé !** » — check SVG basilic 38 px, « 4 boîtes prêtes — la semaine est servie. Prochain rituel : dimanche prochain, 13h45. », « Revoir l'aperçu ».
- Les étapes viennent de `### Rituel dimanche` (parse existant). État **en session uniquement**, non persisté.

### 7.5 Conservation (textes validés)

Portés par les indices de fraîcheur, la réserve du batch et les étapes guidées — **jamais déduits par l'app** :
- riz cuit : **2 jours max au frigo**, surplus congelé dimanche, boîte congélateur **sortie la veille au soir** ;
- pâtes : **cuites le soir même**, sauce du batch réchauffée ;
- poisson : **frais du jour, acheté vendredi** (pas avant) ;
- réchauffages « bien chaud à cœur ».

### 7.6 Contrat .md — évolutions v2 rétrocompatibles

- Le **format v1 reste parsé tel quel** (aucun id de coche, aucune clé modifiée) ; champs optionnels ignorés par l'ancienne app.
- Nouveaux champs optionnels (garde de forme : mal formé → warning, jamais crash) :
  - `## Courses` : ligne `- budget: ≈ 35 €` → affichée dans la bannière rituel ;
  - items Courses : suffixe ` · rituel` en fin de ligne (alimente le batch — id calculé sur le libellé nettoyé, donc stable) et suffixe ` | <note>` (note de fraîcheur, sous-ligne muted) ;
  - `## Recettes` : lignes `- portions marc: riz 150 g · poulet 120 g · légumes 200 g` et `- portions melanie: …` → encadré PORTIONS ; champ `fraicheur: <texte court>` → indice de fraîcheur ;
  - les chips « batch associé » sont dérivées des `bases:` **existants** ; « Cuisson du jour » s'affiche à défaut pour une recette sans bases (dérivé, pas de champ).
- `src/assets/semaine-exemple.md` enrichie en conséquence + `README.md` et `docs/templates/template-semaine.md` synchronisés (le parser reste la référence du format).

## 8. Fichiers touchés

| Fichier | Action |
|---|---|
| `src/index.css` | réécriture tokens + toutes les classes (mêmes sélecteurs sémantiques ; `.tabbar-dock*` → `.tabbar-segmented` ; bannières, médaillon, cartes menu, portions, sous-onglets filets, marges 20 px) |
| `src/components/Icon.tsx` | **nouveau** — jeu SVG maison (§ 7.1) |
| `src/App.tsx` | navigation : suppression du dock, ajout segmented + swipe (logique mince, UI restituée par composants) |
| `src/components/WeekBanner.tsx`, `ProfilScreen.tsx`, `onboarding/*`, `suivi/*` | ajustements markup minces (icônes SVG, tokens) — aucune logique |
| `src/components/cuisine/ShoppingList.tsx` | bannière rituel, quantités/marqueur, note fraîcheur, **Mode magasin** (§ 7.2) |
| `src/components/cuisine/MenuView.tsx` | **réécriture** — réserve de recettes, coche repas, portions (§ 7.3) |
| `src/components/cuisine/BatchView.tsx` | **mode guidé**, bannière « Ce soir », réserve icônée (§ 7.4) |
| `src/lib/parse.ts`, `src/lib/model.ts` | champs optionnels v2 + warnings (§ 7.6) |
| `src/assets/semaine-exemple.md`, `README.md`, `docs/templates/template-semaine.md` | exemple enrichi + contrat documenté |
| `src/lib/rayons.ts` | inchangé (images réutilisées) |
| `vite.config.ts`, `index.html`, `public/icon-src.svg` (+ PNG régénérés) | cf. § 6 |
| `tests/` | `components.test.tsx` (menu réserve, mode magasin, mode guidé, Icon), `app.test.tsx`, `parse.test.ts` (champs v2), e2e `cuisine.spec.ts` + `dock.spec.ts` adaptés |
| `AGENTS.md`, `ai/context/design-system.md`, `ai/context/ui-guideline.md`, `ai/agent/design-agent/rules.prompt.md` | retrait « dark mode only », palette Herbes, nav segmented, règle icônes SVG |
| `CHANGELOG.md` | section `[Non publié]` → « Modifié : thème clair Herbes, nav segmented + swipe, menu v2 réserve de recettes, mode magasin, mode guidé batch, icônes SVG » |

## 9. Hors périmètre

Restent hors périmètre : import/export .md dans l'UI (revient avec la convention template), IA (axe 6), navigation multi-semaines, chantiers 2-5 (Objectifs + date de naissance, onboarding enrichi, scoring cuisine, suivi v2 séances/rappels actionnables). **Aucune déduction de dates de péremption par l'app** (les textes viennent du contenu) ; le calcul kcal du jour continue de s'appuyer sur le jour courant des données. Les tests comportementaux qui ne concernent pas le Menu ne changent pas ; e2e mobile 320/375 doivent rester verts.

## 10. Vérifications

- `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e` — tout vert (zéro débordement horizontal 320/375)
- Compteurs exacts : courses (total + par rayon), menu (N/M faits) ; Mode magasin masque puis réaffiche sans perte de coche
- Recette dépliable sur les 6 cartes de l'exemple ; mode guidé déroulé jusqu'à « Batch terminé ! » ; retour à l'aperçu possible à chaque étape
- `npm run build && npm run preview` : manifest + sw à jour, icônes régénérées, thème visible, statut PWA clair (barre iOS sauge)
- Contrastes ≥ 4,5:1 mesurés (cf. § 3) · cibles ≥ 48 px · `prefers-reduced-motion` vérifié
- Lighthouse mobile > 95 sur le preview

## 11. Risques

- **Menu v2 = plus grosse réécriture du chantier** : découper en scopes dans le plan (données → cartes → coche → portions) ; les tests jour-based cassent par design — les adapter en premier (TDD), sans jamais toucher aux ids de coches existants
- **Swipe vs carrousel** : conflit de geste — mitigé par l'armement conditionnel (§ 4) + e2e dédié au carrousel
- **Nouveaux champs .md optionnels** : donnée mal formée → warning + affichage dégradé, jamais crash (garde de forme `safeParse`) ; la semaine d'exemple doit porter toutes les nouveautés pour éviter l'état « carte sans portions »
- **Régression visuelle large** : beaucoup de classes touchées — mitigé par la revue écran par écran sur preview (320/375/560) avant commit
- **Citron** : seulement fond de badge/carte — règle explicitée pour éviter les régressions de contraste
- **Icônes maskable** : même contrainte de zone sûre que le monogramme actuel (vérification visuelle du crop)
