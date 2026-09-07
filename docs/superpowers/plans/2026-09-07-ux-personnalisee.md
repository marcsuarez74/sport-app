# Plan — UX personnalisée (branche ux-revamp)

Spec : `docs/superpowers/specs/2026-09-07-ux-personnalisee-design.md` · Maquette validée : A « Grand écart fun » + points de progression (`.superpowers/brainstorm/`)

Gates avant CHAQUE commit : `npm test && npm run typecheck && npm run lint && npm run build`.

## T1 — Store profil (TDD)

1. Rouge : `tests/storage.test.ts` — saveProfile/loadProfile roundtrip, clé absente → null silencieux, JSON corrompu → null + clé supprimée, forme invalide (id inconnu, age string) → null + supprimée
2. Vert : `src/lib/model.ts` type `UserProfile { id: ProfileKey; age: number; taille: number }` ; `src/lib/storage.ts` `PROFILE_KEY`, `saveProfile`, `loadProfile`, `removeProfile` (safeParse + garde)
3. Commit `feat: store profil (sportapp:profile)`

## T2 — Theming --accent (TDD)

1. Rouge : `tests/app.test.tsx` — après profil marc → `document.documentElement.dataset.profile === 'marc'` ; sans profil → absent
2. Vert : `src/index.css` — `--accent: #5c6bc0` sur `:root`, règles `[data-profile="marc"] { --accent: #e07b39 }` / `[data-profile="melanie"] { --accent: #3d9a6c }` ; remplacer tous les `var(--accent-cuisine)` par `var(--accent)` (checkboxes, .btn, focus-visible, .today, barre onglet active, .progress) ; supprimer `--accent-cuisine` ; `App` pose `document.documentElement.dataset.profile` (cleanup au démontage)
3. `ProfileView` : ACCENTS → `var(--accent)` ; `Sparkline` : stroke par défaut `var(--accent)`
4. Commit `feat: theming accent par profil`

## T3 — Onboarding (TDD)

1. Rouge : `tests/onboarding.test.tsx` — étape 1 visible (Marc, Mélanie), clic Mélanie → étape 2 « Salut Mélanie », champs poids/âge/taille, submit incomplet → erreur role=alert, bornes invalides → erreur, submit valide → saveProfile + addWeight(date jour, poids) + onDone appelé, « ← Retour » → étape 1, dots de progression
2. Vert : `src/components/onboarding/Onboarding.tsx` (2 steps, useState, validation, style A : cartes dégradés saturés + émojis géants + CTA plein, dots en haut) ; CSS `.onboarding-*` dans `src/index.css` (transitions interactifs uniquement, focus-visible, ≥ 48px)
3. Commit `feat: onboarding 2 étapes (choix profil + bases)`

## T4 — Shell 2 onglets (TDD)

1. Rouge : `tests/app.test.tsx` — avec profil : 2 onglets (Cuisine, Mon suivi), pas de « Marc »/« Mélanie » en onglet, Mon suivi = ProfileView filtrée sur mon id + « Salut {prénom} », onboarding affiché si pas de profil, import conservé si pas de semaine
2. Vert : `TabBar.tsx` TabId `'cuisine'|'suivi'` (labels 🛒 Cuisine / 🎯 Mon suivi) ; `App.tsx` : profil → shell ; suivi = `<p className="greeting">Salut {prénom} 👋</p>` + ProfileView profileKey={me} ; mise à jour tests existants (marc/melanie tabs → suivi)
3. Commit `feat: navigation 2 onglets + vue Mon suivi personnalisée`

## T5 — Écran Profil (TDD)

1. Rouge : `tests/profil-screen.test.tsx` — icône bannière ouvre l'écran, infos âge/taille éditables + save → storage, bouton import présent, « Changer de profil » (confirm) → removeProfile + onboarding, données poids conservées, retour → shell
2. Vert : `src/components/ProfilScreen.tsx` (édition infos inline, réutilise ImportButton, window.confirm, à propos version) ; `WeekBanner` : icône SVG profil à droite (≥ 48px) ; CSS `.profil-screen*`, `.profile-icon-btn`
3. Commit `feat: écran profil (infos, import, changement de profil)`

## T6 — Docs

- `AGENTS.md` : 2 onglets, onboarding, clé `sportapp:profile` (section Storage), « Ma journée »→« Mon suivi »
- `ai/context/design-system.md` : `--accent` + data-profile (remplace accent-cuisine), styles onboarding ; `ai/context/ui-guideline.md` : règles onboarding + écran poussé
- Commit `docs: sync AGENTS.md + ai/context avec l'UX personnalisée`

## Fin

- Revue finale : suite complète verte, build OK, Lighthouse quick check (`npm run preview`)
- Push `ux-revamp` → proposition merge vers `main` (déploie)
