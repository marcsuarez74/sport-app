# App sport — Architecture Technique

## Vue d'ensemble

**Sport App** est une PWA 100 % frontend (zéro backend) de suivi cuisine / diet / sport pour Marc & Mélanie. Le contenu provient d'un fichier `.md` structuré par semaine, importé dans l'app depuis le téléphone. Toutes les données utilisateur vivent en `localStorage` — rien ne quitte l'appareil.

Déployée sur GitHub Pages : https://marcsuarez74.github.io/sport-app/

---

## Stack Technique

| Élément | Choix | Version |
|---|---|---|
| UI | React (composants fonctionnels, hooks uniquement) | 18.3 |
| Build | Vite + @vitejs/plugin-react | 7.x |
| Langage | TypeScript strict (mode strict complet) | 5.9 |
| Tests | Vitest + Testing Library (happy-dom) | 5.x |
| PWA | vite-plugin-pwa (Workbox, autoUpdate) | 1.x |
| Styling | CSS pur, un seul fichier `src/index.css`, **dark mode only** | — |
| Frontmatter .md | js-yaml | 5.x |
| Lint | ESLint 9 (flat config) + typescript-eslint + react-hooks | 9.x |

**Volontairement absent** : routeur, lib d'état (Redux/Zustand/NGXS), framework CSS (Tailwind/MUI), i18n, Sentry. `useState` + props suffisent — ne rien ajouter sans discussion.

---

## Structure du Projet

```
src/
├── lib/                  # Cœur logique, ZÉRO React (testable isolément)
│   ├── model.ts          # Types du domaine (WeeklyData, ChecklistItem, ProfileData…)
│   ├── parse.ts          # Parser .md hebdo → WeeklyData (+ warnings)
│   ├── storage.ts        # Persistance localStorage (semaine, coches, pesées)
│   └── dates.ts          # Jours FR, todayKey, todayISO, formatage DD/MM
├── components/
│   ├── App.tsx           # Shell : semaine courante + onglets + fallback ImportScreen
│   ├── ImportButton.tsx  # Import .md (file input, confirmation, erreurs)
│   ├── ImportScreen.tsx  # Écran d'accueil si aucune semaine + exemple embarqué
│   ├── WeekBanner.tsx    # Bannière semaine (h1, menu, dates FR) + import
│   ├── TabBar.tsx        # 3 onglets (Cuisine / Marc / Mélanie), export type TabId
│   ├── Checklist.tsx     # Checklists persistées par semaine (pattern réutilisable)
│   ├── Sparkline.tsx     # Graphe SVG pur, zéro dépendance
│   ├── ProfileView.tsx   # Vue générique Marc/Mélanie (cibles, séances, poids, rappels)
│   └── cuisine/          # Onglet Cuisine
│       ├── CuisineView.tsx   # Sous-onglets Courses / Menu / Batch
│       ├── ShoppingList.tsx  # Courses groupées par rayon + progression
│       ├── MenuView.tsx      # Menu de la semaine, jour courant en évidence
│       └── BatchView.tsx     # Tâches batch cochables
├── assets/
│   └── semaine-exemple.md    # SEMAINE D'EXEMPLE = référence du contrat de format
└── index.css             # Design system complet (tokens + composants)

tests/                    # Miroir de src/ : parse, storage, components, app
public/                   # Icônes PWA (générées via npm run icons)
.github/workflows/deploy.yml  # CI : npm ci → test → build → Pages
docs/superpowers/         # Spec + plan historiques
ai/                       # Contexte et configs pour agents IA
```

**Règle de répartition** : la logique va dans `src/lib/` (pure, testable sans React) ; les composants restent minces et présentatifs.

---

## Patterns Architecturaux

### 1. Flux de données unidirectionnel

```
.md importé → parse.ts → saveWeek() → localStorage
                                   ↓
App (loadWeek) → props descendantes → vues (Checklist/ProfileView…)
                                   ↓
interactions → storage.ts → état local du composant
```

### 2. Render-phase reset (resynchronisation)

Un composant dont l'état dépend d'une prop qui peut changer (semaine, profil) se resynchronise **pendant le rendu** via un garde `syncedX` — voir `Checklist.tsx`, `ShoppingList.tsx`, `ProfileView.tsx`. C'est LE pattern du repo : ne pas en inventer un autre (pas de `useEffect` de sync, pas de `key` imposé aux consommateurs).

### 3. IDs stables de coche

Les items cochables ont des ids dérivés du contenu : `courses:{rayon}:{slug}`, `batch:{slug}`, `seances:{profil}:{slug}` (slug sans accents). Ces ids sont **la clé de persistance** : les modifier = perdre les états cochés des téléphones.

### 4. Tolérance aux données corrompues

Toute lecture localStorage passe par `safeParse` + garde de forme : donnée illisible → warn + suppression + fallback. Une clé absente est silencieuse. L'app ne crash **jamais** sur une donnée locale abîmée.

### 5. Parsing tolérant, format strict

Le parser accepte les variantes bénignes (accents, CRLF, BOM, indentation, `*`, `[X]`) et **signale** tout ce qu'il ignore (warnings remontés à l'UI d'import). Le format contractuel est documenté dans `src/assets/semaine-exemple.md`.

---

## Configuration Build

- `base: '/sport-app/'` — doit rester égal au nom du repo GitHub (sinon Pages casse)
- `npm run build` = `tsc -b && vite build` → `dist/` avec `sw.js` + `manifest.webmanifest`
- Icônes : `npm run icons` (régénère les PNG depuis `public/icon-src.svg`)
- Preview locale du build : `npm run preview` (vérifier `/sport-app/`, manifest, sw)

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
