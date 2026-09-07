# Design System — sport-app

Source de vérité : `src/index.css` (section `:root`). Toute valeur ici doit y correspondre — si le CSS change, mettre à jour ce fichier.

## Principes

- **Dark mode ONLY** — pas de light theme, pas de `prefers-color-scheme`
- **Ultra visible** : contraste élevé (≥ 4.5:1 partout), hiérarchie typographique forte, cibles tactiles ≥ 48 px
- **Fluide** : transitions douces 0,2 s sur les éléments interactifs uniquement + kill-switch `prefers-reduced-motion`
- Contexte d'usage réel : cuisine (mains mouillées) et salle de sport → gros, lisible, sans ambiguïté

---

## Tokens — Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--bg` | `#0f1115` | fond de page |
| `--surface` | `#1a1d27` | cartes (`.menu-day`, `.course-group`, `.profile-section`) |
| `--surface-2` | `#232735` | surfaces secondaires (`.batch-banner`, onglet actif) |
| `--tabbar-bg` | `rgb(20 22 31 / 0.88)` | barre d'onglets fixe (backdrop-blur 12px) |
| `--border` | `#2e3345` | bordures de cartes |
| `--text` | `#f2f4f8` | texte principal (15,3:1 sur surface) |
| `--muted` | `#9aa3b5` | texte secondaire (6,6:1 sur surface) |
| `--accent-cuisine` | `#5c6bc0` | onglet/tab Cuisine, checkboxes, focus, `.today`, `.btn` |
| `--accent-marc` | `#e07b39` | profil Marc (sparkline, barre d'onglet active) — aligné sur `ACCENTS` dans ProfileView |
| `--accent-melanie` | `#3d9a6c` | profil Mélanie (idem) |
| `--danger` | `#ff6b6b` | erreurs (`.error`) |

⚠️ Ne jamais coder une couleur en dur dans un composant — utiliser `var(--token)`. Exception synchronisée : `ACCENTS` (ProfileView) et la couleur par défaut de `Sparkline` (`#5c6bc0`).

---

## Tokens — Formes & Ombres

| Token | Valeur | Usage |
|---|---|---|
| `--radius` | `16px` | cartes |
| `--shadow` | `0 4px 16px rgb(0 0 0 / 0.4)` | élévation |

Rayons dérivés : boutons et pills `12px`, badge `.today-badge` `999px`.

---

## Typographie

Pile système : `-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` — 16 px base, `line-height: 1.5`.

| Niveau | Taille | Graisse | Usage |
|---|---|---|---|
| `h1` | 20 px | 800 | titre de semaine (`.week-title`) |
| `h2` | 20 px | 700 | titre de profil |
| `h3` | 17 px | 700 | titres de cartes (jours, rayons, sections) |
| corps | 16 px | 400 | contenu |
| `.today-badge` | 12 px | 700 | badge « Aujourd'hui » |
| `.tab` | 12 px | 400/700 (actif) | libellés d'onglets |

---

## Espacements

Échelle 4 px : 2 · 4 · 8 · 12 · 16 · 24. Padding standard des cartes : 16 px. Gouttières page : 16 px. Espace sous la tabbar : `calc(76px + safe-area-inset-bottom)`.

---

## Composants (classes sémantiques)

| Classe | Rôle | Points clés |
|---|---|---|
| `.btn` | action principale | fond accent-cuisine, blanc, 700, min-height 48 px, active `scale(0.97)` |
| `.tabbar` / `.tab` / `.tab.active` | navigation fixe bas | fixed + safe-area + blur ; actif = pill `--surface-2` + blanc + 700 + barre accent colorée par onglet (`data-tab`) |
| `.checklist` + `.done` | listes cochables | label min-height 48 px, checkbox 22 px `accent-color: --accent-cuisine` ; done = barré + muted |
| `.menu-day` / `.today` / `.today-badge` | cartes menu | today = bordure 2 px accent + glow `0 0 12px` + badge pill |
| `.progress` + `progress` | progression courses | texte bold muted + barre native `accent-color` |
| `.batch-banner` | rappel batch | fond `--surface-2`, bordure gauche 4 px accent |
| `.course-group` / `h3` | groupe par rayon | carte + titre 17 px |
| `.error` | message d'erreur | `--danger`, 600, `role="alert"` |
| `.warn-line` | avis lignes ignorées | ambre `#fbbf24` |
| `.muted` | texte secondaire / états vides | `--muted` |
| `.sr-only` | accessible visuellement | pattern standard clip |

---

## Accessibilité

- `:focus-visible` : outline 2 px `--accent-cuisine`, offset 2 px — toujours visible, jamais supprimé
- `.btn:focus-within` : le bouton d'import s'illumine quand l'input fichier caché (`sr-only`) reçoit le focus
- Contrastes vérifiés : texte/surface 15,3:1 · muted/surface 6,6:1 · blanc/accent-cuisine 4,9:1
- `prefers-reduced-motion: reduce` → toutes transitions désactivées (`!important`, seule utilisation autorisée)

---

## Responsive

- Mobile-first, largeur de contenu plafonnée à **560 px** centrée (`.main-content`)
- Safe-areas iOS : top sur `.main-content`, bottom sur `.tabbar`, left/right en paysage via `max(16px, env(safe-area-inset-*))`
- `viewport-fit=cover` + barre de statut translucide (standalone PWA)
