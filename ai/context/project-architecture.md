# Architecture Technique — Rituel

## Vue d'ensemble

**Rituel** est une PWA 100 % frontend (zéro backend) de suivi cuisine / diet / sport pour Marc & Mélanie. Le contenu provient d'un fichier `.md` structuré par semaine — la semaine d'exemple est auto-chargée (l'import UI reviendra plus tard). Toutes les données utilisateur vivent en `localStorage` — rien ne quitte l'appareil.

Déployée sur GitHub Pages : https://marcsuarez74.github.io/rituel-app/

---

## Stack Technique

| Élément | Choix | Version |
|---|---|---|
| UI | React (composants fonctionnels, hooks uniquement) | 18.3 |
| Build | Vite + @vitejs/plugin-react | 7.x |
| Langage | TypeScript strict (mode strict complet) | 5.9 |
| Tests | Vitest + Testing Library (happy-dom) | 5.x |
| PWA | vite-plugin-pwa (Workbox, autoUpdate) | 1.x |
| Styling | CSS pur, un seul fichier `src/index.css`, **thème clair Herbes** | — |
| Frontmatter .md | js-yaml | 5.x |
| Lint | ESLint 9 (flat config) + typescript-eslint + react-hooks | 9.x |

**Volontairement absent** : routeur, lib d'état (Redux/Zustand/NGXS), framework CSS (Tailwind/MUI), i18n, Sentry. `useState` + props suffisent — ne rien ajouter sans discussion.

---

## Structure du Projet

```
src/
├── App.tsx               # Shell : onboarding → 2 onglets ou ProfilScreen ; fallback semaineExemple()
├── lib/                  # Cœur logique, ZÉRO React (testable isolément)
│   ├── model.ts          # Types du domaine (WeeklyData, ChecklistItem, ProfileData…)
│   ├── parse.ts          # Parser .md hebdo → WeeklyData (+ warnings) — sert à la semaine d'exemple
│   ├── storage.ts        # Persistance localStorage (semaine, coches, pesées)
│   ├── rayons.ts         # imagePourRayon : slug → miniature (normalisation casse/accents, fallback)
│   ├── text.ts           # capitalize mutualisé (rayons, micro-batch)
│   └── dates.ts          # Jours FR, todayKey, todayISO, formatage DD/MM
├── components/
│   ├── WeekBanner.tsx    # Bannière semaine (h1, pill Menu, dates FR) + icône profil
│   ├── TabBar.tsx        # Nav segmented 2 onglets (Cuisine / Mon suivi), export type TabId
│   ├── ProfilScreen.tsx  # Écran poussé : infos perso + objectifs + changer de profil
│   ├── Checklist.tsx     # Checklists persistées par semaine (pattern réutilisable)
│   ├── StatCards.tsx     # 4 cartes résumé Mon suivi (poids, kcal du jour, séances, courses)
│   ├── WeightChart.tsx   # Courbe de poids SVG maison (lissée Catmull-Rom, ligne objectif)
│   ├── ProfileView.tsx   # Vue générique Marc/Mélanie (cibles, séances, poids, rappels)
│   └── cuisine/          # Onglet Cuisine
│       ├── CuisineView.tsx   # Sous-onglets Courses / Menu / Batch
│       ├── ShoppingList.tsx  # Courses par rayon (miniature, compteurs, mode magasin) + encadré keto en dernier
│       ├── MenuView.tsx      # Menu v2 : réserve de recettes en cartes (coche, portions, fraîcheur)
│       │                     # + détail recette dépliable
│       └── BatchView.tsx     # Checklist batch + rituel dimanche (timeline) + micro-batch (carrousel)
├── assets/
│   ├── semaine-exemple.md    # SEMAINE D'EXEMPLE auto-chargée = référence du contrat de format
│   └── rayons/               # Miniatures 160×120 des rayons (~5-10 Ko, runtime cache SW)
└── index.css             # Design system complet (tokens + composants)

tests/                    # Miroir de src/ : parse, storage, rayons, text, components, app
public/                   # Icônes PWA (générées via npm run icons)
.github/workflows/deploy.yml  # CI : npm ci → test → build → e2e preview → Pages
docs/superpowers/         # Spec + plan historiques
ai/                       # Contexte et configs pour agents IA
```

**Règle de répartition** : la logique va dans `src/lib/` (pure, testable sans React) ; les composants restent minces et présentatifs.

---

## Patterns Architecturaux

### 1. Flux de données unidirectionnel

```
.md (semaine-exemple, import à venir) → parseWeeklyFile → WeeklyData (blocs v2 optionnels :
                                               recettes, bases, rituel, microBatch, recetteRefs)
                                               → saveWeek() → localStorage
                                   ↓
App (loadWeek) → props descendantes → vues (CuisineView → MenuView/ShoppingList/BatchView,
                                            Checklist/ProfileView…)
                                   ↓
interactions → storage.ts → état local du composant
```

### 2. Render-phase reset (resynchronisation)

Un composant dont l'état dépend d'une prop qui peut changer (semaine, profil) se resynchronise **pendant le rendu** via un garde `syncedX` — voir `Checklist.tsx`, `ShoppingList.tsx`, `ProfileView.tsx`. C'est LE pattern du repo : ne pas en inventer un autre (pas de `useEffect` de sync, pas de `key` imposé aux consommateurs).

**Exception explicite et documentée** : `key={weightsBump}` sur `StatCards` dans `App.tsx`. `StatCards` lit le storage **au montage** (`useState` initial) et n'a pas de prop de semaine à resynchroniser ; quand une pesée est ajoutée, `onWeightsChanged` incrémente `weightsBump` pour forcer un remount et relire les pesées. C'est un remount ciblé sur un lecteur de storage, pas un nouveau pattern de sync — ne pas l'imiter ailleurs.

### 3. IDs stables de coche

Les items cochables ont des ids dérivés du contenu : `courses:{rayon}:{slug}`, `batch:{slug}`, `batch:rituel:{slug-étape}`, `seances:{profil}:{slug}` (slug sans accents). Ces ids sont **la clé de persistance** : les modifier = perdre les états cochés des téléphones.

### 4. Tolérance aux données corrompues

Toute lecture localStorage passe par `safeParse` + garde de forme : donnée illisible → warn + suppression + fallback. Une clé absente est silencieuse. L'app ne crash **jamais** sur une donnée locale abîmée.

### 5. Parsing tolérant, format strict

Le parser accepte les variantes bénignes (accents, CRLF, BOM, indentation, `*`, `[X]`) et **signale** tout ce qu'il ignore (warnings en mémoire, disponibles pour la future UI d'import). Le format contractuel est documenté dans `src/assets/semaine-exemple.md`.

---

## Configuration Build

- `base: '/rituel-app/'` — doit rester égal au nom du repo GitHub (sinon Pages casse)
- `npm run build` = `tsc -b && vite build` → `dist/` avec `sw.js` + `manifest.webmanifest`
- Icônes : `npm run icons` (régénère les PNG depuis `public/icon-src.svg`)
- Preview locale du build : `npm run preview` (vérifier `/rituel-app/`, manifest, sw)

---

## Déploiement

- GitHub Actions (`.github/workflows/deploy.yml`) à chaque push sur `main`
- Pipeline : `npm ci` → `npm test` → `npm run build` → `configure-pages` → upload/deploy-pages v5
- Prérequis repo : **public** + Settings → Pages → Source « GitHub Actions » (le token du workflow ne peut pas créer le site lui-même)

---

## Tests

- Vitest, environnement `happy-dom`, globals activés, `@testing-library/jest-dom/vitest`
- `tests/` inclus dans `tsconfig.app.json` (le typecheck couvre les tests)
- TDD : test d'abord (rouge), implémentation ensuite (vert)
- Tester le comportement visible (rôles ARIA, textes, localStorage), jamais les détails internes
