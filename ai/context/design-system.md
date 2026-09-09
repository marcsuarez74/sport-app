# Design System — Rituel

Source de vérité : `src/index.css` (section `:root`). Toute valeur ici doit y correspondre — si le CSS change, mettre à jour ce fichier.

## Principes

- **Dark mode ONLY** — pas de light theme, pas de `prefers-color-scheme`
- **Ultra visible** : contraste texte ≥ 4,5:1 partout (règle repo — texte principal ≈ 13:1, muted ≥ 4,6:1, texte sombre sur accents clairs ≥ 7:1), hiérarchie typographique forte, cibles tactiles ≥ 48 px
- **Fluide** : transitions douces 0,2 s sur les éléments interactifs uniquement + kill-switch `prefers-reduced-motion`
- Contexte d'usage réel : cuisine (mains mouillées) et salle de sport → gros, lisible, sans ambiguïté

---

## Tokens — Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--bg` | `#1b1d24` | fond de page |
| `--surface` | `#272932` | cartes (`.menu-day`, `.course-group`, `.profile-section`) |
| `--surface-2` | `#31333e` | surfaces secondaires (`.batch-banner`, `.profile-icon-btn`, `.recette-card`, `.micro-jour`) |
| `--border` | `#3f4351` | bordures de cartes, dots inactifs |
| `--text` | `#f9f4f2` | texte principal (≈ 13:1 sur surface) |
| `--muted` | `#9a9ca6` | texte secondaire (≈ 5,3:1 sur surface, ≈ 6,2:1 sur bg — ≥ 4,5:1 sur toutes les surfaces) |
| `--accent` | `#ffa257` | **accent principal** (orange) : actions, onglets, checkboxes, focus, `.today`, tags Marc/Batch, barres séances |
| `--accent-2` | `#c2e66e` | **accent secondaire** (lime) : succès/objectif atteint (`.stat-delta-bon`), tag Mé/keto (`.tag-keto`), encadré keto, barre courses |
| `--danger` | `#ff6b6b` | erreurs (`.error`), `.profil-switch` |

⚠️ Ne jamais coder une couleur en dur dans un composant — utiliser `var(--token)`. **Règle Nutrigo : texte sombre `#272932` sur accents clairs** (boutons, tags, pills, pilule du dock) — ≈ 7,3:1 sur orange, ≈ 10,3:1 sur lime.

---

## Tokens — Formes & Ombres

| Token | Valeur | Usage |
|---|---|---|
| `--radius` | `16px` | cartes |
| `--shadow` | `0 4px 16px rgb(0 0 0 / 0.35)` | élévation |

Rayons dérivés : boutons et pills `12px`, badges/pills `999px` (`.today-badge`, `.menu-pill`, `.menu-tag`, `.past-badge`).

---

## Typographie

**Poppins** auto-hébergée (subset latin, 4 graisses 400/500/600/700, `font-display: swap`, précachée par le service worker) — 16 px base, `line-height: 1.5`.

| Niveau | Taille | Graisse | Usage |
|---|---|---|---|
| `h1` | 22 px | 600 | titres de section (24 px/700 dans l'onboarding) |
| `.week-title` | 20 px | 700 | titre de semaine (bannière) |
| `h2` | 20 px | 600 | titre de profil |
| `h3` | 17 px | 600 | titres de cartes (jours, rayons, sections) |
| corps | 16 px | 400 | contenu |
| `.today-badge` | 12 px | 700 | badge « Aujourd'hui » |
| `.dock-tab` | 12 px | 700 | libellés du dock (actif seulement) |

---

## Espacements

Échelle 4 px : 2 · 4 · 8 · 12 · 16 · 24. Padding standard des cartes : 16 px. Gouttières page : 16 px. Espace sous le dock : `calc(88px + safe-area-inset-bottom)` (sur `.main-content`).

---

## Composants (classes sémantiques)

| Classe | Rôle | Points clés |
|---|---|---|
| `.onboarding` | premier lancement (2 étapes) | fond halos radiaux orange/lime, full-dvh, safe-areas |
| `.onboarding-dots` / `.onboarding-dot-active` | progression 2 étapes | pill 12→22px, active = `--accent` |
| `.onboarding-card-marc` / `-melanie` | choix du profil | dégradés saturés 135deg (orange `#ffa257`→`#c96a20`, lime `#c2e66e`→`#8fbf4d`) + glow coloré, émoji 38px, prénom 19px/700, texte sombre `#272932`, active `scale(0.97)` |
| `.onboarding-cta` | validation étape 2 | fond `--accent`, texte sombre `#272932`, 48px, glow |
| `.onboarding-back` / `.profil-back` | navigation retour | ghost, muted, ≥ 48px |
| `.btn` | action principale | fond `--accent`, texte sombre `#272932`, 700, min-height 48 px, active `scale(0.97)` |
| `.stat-cards` / `.stat-card` / `.stat-bar` | cartes résumé Mon suivi (poids, kcal du jour, séances, courses restantes) | grid 2 colonnes ; barres de progression `--accent` (séances) / `--accent-2` (courses) ; delta `stat-delta-bon` (lime) / `stat-delta-alerte` (orange) vs objectif |
| `.weight-chart` + `.weight-*` | courbe de poids SVG (WeightChart) | chips Départ/Actuel/Objectif, aire dégradée `--accent` 22 %→0, ligne lissée Catmull-Rom, ligne objectif, points départ/actuel, mois en axes |
| `.tabbar-dock` / `.dock-tab` / `.dock-tab-active` | **dock flottant compact** de navigation (2 onglets : Cuisine / Mon suivi) | fixed centré `width: min(240px, 100vw-48px)` + `bottom calc(12px + safe-area)` ; `grid` 2 colonnes égales, gap 4px, padding 6px ; pill `999px`, fond `rgb(39 41 50 / 0.9)` + blur 12px + bordure + ombre ; **pilule glissante** = `::before` du dock (`--accent`), `transform: translateX(calc(100% + 4px))` quand `data-active='suivi'`, transition `0.32s cubic-bezier(0.34, 1.56, 0.64, 1)` (rebond élastique) ; **actif** = texte sombre `#272932` + label animé `dock-label-in` + icône `scale(1.18)` ; **inactif** = icône seule muted (`aria-label` porte le nom) ; ≥ 48 px, `aria-current="page"`, appui `scale(0.96)` |
| `.cuisine-tabs .tab` | sous-onglets Cuisine (Courses / Menu / Batch) | pills `12px`, actif = `--surface-2` + barre accent inset |
| `.week-title-row` + `.menu-pill` | bannière semaine : titre + pill du menu courant | row flex wrap (gap 10px) ; pill = fond `--accent`, texte sombre `#272932` 12px/700, radius 999px, glow `color-mix(--accent 35%)` — visible au-dessus des 3 sous-onglets |
| `.course-group-header` + `img` | en-tête de groupe de courses | miniature 72×54 (`object-fit: cover`, radius 10px) via `imagePourRayon` (`src/lib/rayons.ts`), `loading="lazy"`, alt = libellé du rayon |
| `.rayon-cnt` | compteur d'items d'un rayon | muted 13px/700, collé à droite (`margin-left: auto`) |
| `.keto-box` / `.keto-title` | encadré keto de Mélanie (rayon `### Keto`) | fond `--accent-2` 12% + bordure 45% (`color-mix`), titre lime 15px/700 — affiché en dernier |
| `.profile-icon-btn` | accès écran Profil | 48px, surface-2, icône SVG person `currentColor` |
| `.profil-screen` / `.profil-switch` | écran Profil | sections `.profile-section` ; switch = bordure `--danger` (action sensible) |
| `.greeting` | accueil personnalisé Mon suivi | muted, 14px/700 |
| `.checklist` + `.done` | listes cochables | label min-height 48 px, checkbox 22 px `accent-color: --accent` ; done = barré + muted |
| `.menu-day` / `.today` / `.today-badge` | cartes menu | today = bordure 2 px accent + glow `0 0 12px` + badge pill |
| `.menu-day.past` + `.past-badge` | jours passés (regroupés en fin de liste) | titre muted, badge pill `--surface-2`/muted 12px/700 |
| `.menu-tag` (`.tag-marc` `.tag-keto` `.tag-fam` `.tag-bat`) | tags de profil des repas | pills 11px/700 : Marc plein `--accent` (texte sombre), Mé `--accent-2` 22%, Famille `--surface-2`, Batch `--accent` 22% |
| `.menu-row` / `.menu-row-text` | ligne repas (tag + texte) | tag `flex-shrink: 0`, texte `min-width: 0` (anti-débordement mobile) |
| `.menu-recette-link` | lien « 📖 {recette} » d'un repas | inline, `--accent` 700, souligné pointillé muted, `aria-expanded` (accordéon : une seule fiche ouverte) |
| `.recette-card` + `.recette-*` | fiche recette dépliable (RecetteCard) | surface + bordure + radius tokens, `overflow: hidden` ; photo hero 130px ou fallback dégradé orange/lime ; `.recette-stats` chips `--surface-2` (temps, kcal, P/C/F) ; `.recette-score` barre segmentée (`.score-seg.on` = accent) ; `.recette-bchip` cliquable (état `.on` = bordure accent) ; `.recette-mel` / `.recette-bat` pastilles lime/orange via `color-mix` + `::before` émoji |
| `.progress` + `progress` | progression courses | texte bold muted + barre native `accent-color` |
| `.batch-banner` | rappel batch | fond `--surface-2`, bordure gauche 4 px accent |
| `.batch-section` / `.batch-section-head` | cartes du Batch (rituel, micro-batch) | surface + bordure + radius tokens, titre 17px |
| `.rituel-timeline` + `.rituel-etape` | timeline cochable du rituel dimanche | rail vertical 2px `--border` + dots 10px `--accent` (done = `--border`), lignes ≥ 48px, créneau muted à droite, done = barré + muted |
| `.micro-batch` + `.micro-jour` | carrousel micro-batch | flex `overflow-x: auto` (scrollbar masquée), cartes fixes 128px `--surface-2` radius 12px, nom du jour uppercase muted |
| `.error` | message d'erreur | `--danger`, 600, `role="alert"` |
| `.warn-line` | avis lignes ignorées | ambre `#fbbf24` |
| `.muted` | texte secondaire / états vides | `--muted` |
| `.sr-only` | accessible visuellement | pattern standard clip |

---

## Accessibilité

- `:focus-visible` : outline 2 px `--accent`, offset 2 px — toujours visible, jamais supprimé
- Contrastes texte mesurés : texte/surface ≈ 13:1 · muted/surface ≈ 5,3:1 · muted/surface-2 ≈ 4,6:1 · texte sombre `#272932`/`--accent` ≈ 7,3:1 · texte sombre/`--accent-2` ≈ 10,3:1
- `prefers-reduced-motion: reduce` → toutes transitions désactivées (`!important`, seule utilisation autorisée)

---

## Responsive

- Mobile-first, largeur de contenu plafonnée à **560 px** centrée (`.main-content`)
- Safe-areas iOS : top sur `.main-content`, bottom sur `.tabbar-dock`, left/right en paysage via `max(16px, env(safe-area-inset-*))`
- `viewport-fit=cover` + barre de statut translucide (standalone PWA)
