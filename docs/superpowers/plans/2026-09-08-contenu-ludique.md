# Plan — App ludique

Spec : `docs/superpowers/specs/2026-09-08-contenu-ludique-design.md` · Gates avant chaque commit : `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e`

## T1 — Suppression import + auto-chargement (TDD)
1. Rouge : app.test — sans semaine ET avec profil → shell « Semaine 2026-S39 » direct (pas d'écran import)
2. Vert : App.tsx `loadWeek() ?? exempleSemaine()` (lib/parse + assets/semaine-exemple.md, en mémoire) ; suppression ImportScreen/ImportButton, props onImported (WeekBanner, ProfilScreen, App)
3. Nettoyage : tests import (app.test, components.test, profil-screen), CSS `.import*`, e2e (soumission onboarding → shell direct)
4. Commit `feat: suppression de l'import .md, semaine d'exemple auto-chargée`

## T2 — Dock flottant (TDD)
1. Rouge : aria-current + classes `.tabbar-dock`/`.dock-tab-active`
2. Vert : TabBar.tsx nouveau markup (actif = icône+label en pilule, inactif = icône seule + aria-label), CSS dock (fixed, blur, pilule --accent-strong), padding-bottom main ajusté, suppression ancien CSS .tabbar/.tab
3. Commit `feat: barre d'onglets en dock flottant`

## T3 — Images rayons (TDD)
1. Rouge : tests/lib rayons.ts — `imagePourRayon('legumes')` → jpg correspondant, `'LÉGUMES'` (casse+accents) → idem, rayon inconnu → default.jpg ; composant : img avec alt = libellé rayon
2. Vert : src/lib/rayons.ts + assets (7 jpg validés) + CourseGroup (img lazy) + vite.config runtimeCaching CacheFirst images
3. Commit `feat: miniatures photo pour les rayons de courses`

## T4 — Docs + revue
AGENTS.md, ai/context (×3), README, Lighthouse quick check, push.
