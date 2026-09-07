# AGENTS.md

Guide pour les agents IA travaillant sur ce repo. Règles courtes, KISS : si une règle bloque plus qu'elle n'aide, elle est probablement fausse — signalez-le plutôt que de la contourner.

## Le projet

**Sport App** — PWA React (dark mode only) de suivi cuisine/diet/sport pour Marc & Mélanie. 100 % front, zéro backend :

- **UX personnalisée** : au premier lancement, un onboarding en 2 étapes choisit le profil (💪 Marc / 🌿 Mélanie) et collecte les bases (poids, âge, taille) — clé `sportapp:profile`. L'app se teinte ensuite de la couleur perso et n'affiche que « ce qui me concerne » + la cuisine
- L'app affiche **2 onglets** : 🛒 Cuisine (Courses / Menu / Batch, partagé) · 🎯 Mon suivi (cibles/séances/rappels/pesées du profil actif) ; écran **Profil** (infos, import, changer de profil) via l'icône en haut à droite
- Le contenu vient d'**un fichier .md structuré par semaine**, importé dans l'app sur le téléphone (bouton « Importer un .md »)
- Coches + pesées persistées en **localStorage** (aucune donnée ne quitte le téléphone)
- Déployée en PWA offline-first sur GitHub Pages : https://marcsuarez74.github.io/sport-app/

## Commandes

```bash
npm install          # après un pull ou un changement de deps
npm run dev          # serveur de dev (hot reload)
npm test             # vitest, une passe
npm run test:watch   # vitest en watch (loop TDD)
npm run e2e          # Playwright (navigateur réel) — projet mobile 375/320 + soumission ; serveur dev auto
npm run e2e:preview  # idem contre le BUILD DE PROD (dist/ via vite preview) — utilisé par le workflow Deploy
npm run e2e:ui       # Playwright en mode UI (debug visuel)
npm run typecheck    # tsc -b (couvre src/ ET tests/)
npm run lint         # eslint
npm run build        # tsc + vite build (génère dist/ + service worker)
npm run preview      # sert dist/ en local (teste le build + la PWA)
npm run icons        # régénère les icônes PWA après modification de public/icon-src.svg
```

Avant tout commit : `npm test && npm run typecheck && npm run lint && npm run build` doit passer.
Un changement d'UI responsive → `npm run e2e` doit passer aussi (zéro débordement horizontal sur 320/375 px).

## Tests e2e (Playwright)

- Les specs vivent dans `tests/e2e/*.spec.ts` — **exclues de vitest** (cf. `exclude` dans `vite.config.ts`) et typecheckées comme le reste
- Règle mobile : la page ne doit **jamais** scroller horizontalement (`scrollWidth <= clientWidth` sur 320 et 375) — les flex rows multi-champs utilisent `flex-wrap` + `flex-basis` plancher + `min-width: 0`
- Deux modes : `npm run e2e` (serveur dev, loop local) et `npm run e2e:preview` (build de prod via preview, `E2E_PREVIEW=1`) — la baseURL/l'origine du `storageState` suivent le mode
- Le serveur est lancé automatiquement par la config (`webServer`) ; simuler un état app (profil, semaine) via `storageState` localStorage — pas d'import de modules app
- Les projets `devices[...]` tournent sur WebKit par défaut : `npx playwright install webkit chromium` après un clone (ou `npx playwright install`)

## Structure

```
src/lib/          # cœur logique, zéro React : model.ts (types), parse.ts (.md → WeeklyData),
                  # storage.ts (localStorage), dates.ts (jours FR, formatage)
src/components/   # composants UI ; cuisine/ pour l'onglet Cuisine ; onboarding/ pour le premier lancement
src/assets/       # semaine-exemple.md — la SEMAINE D'EXEMPLE, sert de référence du format
tests/            # miroir de src/, vitest + Testing Library, environnement happy-dom
tests/e2e/        # specs Playwright (navigateur réel, config playwright.config.ts, projets mobile 375 + 320)
.github/workflows/deploy.yml   # déploie sur GitHub Pages à chaque push sur main
docs/superpowers/ # spec design + plan d'implémentation (contexte historique)
ai/               # configs d'agents IA (cf. section « Dossier ai/ »)
```

Règle de répartition : la logique va dans `src/lib/` (testable sans React), les composants restent présentatifs et minces.

## Style de code

- TypeScript strict. Fonctions nommées, exports nommés (pas de default export).
- React 18 : composants fonctionnels, hooks uniquement. Pas de lib d'état ni de contexte — `useState` + props suffisent.
- Si un composant doit re-synchroniser son état quand une prop change (semaine, profil), utiliser le pattern **render-phase reset** (`syncedSemaine`/`syncedProfile`) déjà en place dans `Checklist.tsx`, `ShoppingList.tsx`, `ProfileView.tsx` — ne pas inventer un 4e pattern.
- CSS : un seul fichier `src/index.css`, classes **sémantiques** (`.menu-day`, `.checklist`, `.done`…), variables du design system sur `:root`. **Dark mode only** — pas de light mode, pas de `prefers-color-scheme`, pas de framework CSS.
- Cibles tactiles ≥ 48 px, contraste ≥ 4.5:1, transitions sur les éléments interactifs seulement. « Ultra visible » est une exigence produit, pas une préférence.
- Textes utilisateur en **français** (accents compris : `Mélanie` == `Melanie` pour le parser).
- YAGNI : pas de nouvelle dépendance sans discussion, pas d'abstraction avant le 2e cas d'usage réel.

## Le contrat .md (ne pas casser)

Le format des fichiers hebdo est un **contrat** : parser (`src/lib/parse.ts`), exemple (`src/assets/semaine-exemple.md`) et README doivent rester cohérents.

- Frontmatter requis : `semaine`, `menu`, `du`, `au` (dates ISO `AAAA-MM-JJ`), `titre` optionnel
- Sections : `## Courses` (### rayons + items), `## Menu` (### jours + `- clé: texte` avec les 5 clés valides), `## Batch`, `## Marc`, `## Melanie` (### Cibles / Séances / Rappels)
- Les ids de coches (`courses:…`, `batch:…`, `seances:marc:…`, `seances:melanie:…`) sont **stables entre imports** : ne jamais les modifier, sinon les états cochés se perdent
- Contenu non reconnu → warnings (affichés à l'import), jamais une exception silencieuse ni un crash

## Tests (TDD)

- Nouvelle fonctionnalité ou bugfix = **test d'abord** (rouge), puis implémentation (vert). `npm run test:watch` pour boucler.
- Tests dans `tests/`, nommés en miroir : `parse.test.ts`, `storage.test.ts`, `components.test.tsx`, `app.test.tsx`.
- Tester le **comportement visible** (rôles, textes, storage) — pas les détails d'implémentation. Utiliser `userEvent` (pas `fireEvent` sauf cas documenté : `fireEvent.submit` pour les formulaires sous happy-dom).
- Mocks d'horloge : `vi.setSystemTime(new Date('…T10:00:00'))` — toujours la forme avec heure (parse en heure locale), jamais la forme date seule (parse en UTC). Restaurer avec `vi.useRealTimers()`.
- `localStorage.clear()` en `beforeEach` pour l'isolation.

## Storage (localStorage)

Clés existantes — ne pas renommer (données réelles des téléphones) :

- `sportapp:week` — semaine courante (raw + parsée + date d'import)
- `sportapp:profile` — profil actif (`{ id: 'marc'|'melanie', age, taille }`, posé par l'onboarding)
- `sportapp:checks:{semaine}` — coches par semaine
- `sportapp:weights:{marc|melanie}` — pesées par profil

Toute lecture passe par `safeParse` + garde de forme : une donnée corrompue se répare silencieusement (warn + remove + fallback), elle ne fait **jamais** crasher l'app. Une clé absente est silencieuse (pas de warning).

## PWA & déploiement

- `base: '/sport-app/'` dans `vite.config.ts` = nom du repo GitHub. Si le repo est renommé, mettre à jour `base` ET l'URL dans le README.
- **CI sur les PR** (`.github/workflows/ci.yml`) : Prepare → Lint → Typecheck → Test → Build — elle doit être verte avant tout merge ; ne pas y ajouter de step lent sans discussion.
- **Deploy sur main** (`.github/workflows/deploy.yml`) : Test unitaire → Build → **Test e2e sur le build de prod** (`npm run e2e:preview`, nécessite `npx playwright install --with-deps chromium webkit`) → Pages. Si un e2e casse le déploiement, corriger et re-pousser (pas de contournement).
- Le déploiement se fait tout seul (push sur `main` → Actions → Pages). Ne pas ajouter de build step qui ne serait pas aussi rapide en CI (le workflow lance déjà `npm ci && npm test && build`).
- Après un changement PWA (manifest, service worker, icônes) : vérifier avec `npm run build && npm run preview` que `dist/` contient `sw.js` + `manifest.webmanifest`.

## Git

- Commits courts en français, préfixe conventionnel : `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `ci:`
- Un commit = un changement cohérent. Pousser sur `main` déclenche le déploiement — ne jamais pousser un état qui ne build pas.
- Pas de rebase/force-push sur `main`.

## Dossier ai/

`ai/` contient des **configs d'agents IA** à parcourir AVANT tout travail dans leur domaine :

- `ai/agent/<nom>/` — un agent par dossier : `agent.config.json` (rôle, skills, settings) + prompts (`system.prompt.md`, `rules.prompt.md`, `output-format.prompt.md`)
- `ai/context/` — le contexte projet à lire avec l'agent : `project-architecture.md` (stack, patterns, build), `design-system.md` (tokens, source = `src/index.css`), `ui-guideline.md` (règles UI), `performance.md` (budgets, anti-patterns)
- Un travail de design/UI doit suivre `ai/agent/design-agent/` : lire ses prompts et le contexte, adopter son rôle et ses règles

Ces fichiers sont **adaptés à CE projet** (React + Vite + CSS sémantique, dark only) — s'ils contiennent du générique non applicable (ex. Tailwind), la contrainte du repo gagne : tokens = variables CSS de `src/index.css`, pas de framework CSS. Si `src/index.css` et `ai/context/design-system.md` divergent, corriger les deux.

## Si quelque chose est ambigu

Demander avant d'implémenter. Mieux : proposer 2 options avec le compromis. Le pire : deviner et construire 200 lignes dans la mauvaise direction.
