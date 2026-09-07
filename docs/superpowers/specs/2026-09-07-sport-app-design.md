# Sport App — Design

> Créé le 07/09/2026 · Validé par Marc

## Objectif

App mobile PWA pour un meilleur suivi quotidien : cuisine (courses, menu, batch) + profils Marc (diet/sport) et Mélanie (keto/sport). Contenu fourni par un fichier .md structuré par semaine, importé directement dans l'app depuis le téléphone.

## Décisions clés (dialogue de cadrage)

| Question | Décision |
|---|---|
| Usage | Mobile, PWA installable, contenu mis à jour par import de .md dans l'app |
| Format contenu | Nouveaux .md **structurés** (frontmatter + sections normalisées) |
| Interactivité | Checklists cochables + suivi poids, persistés localement (localStorage) |
| Semaine courante | Définie dans le .md (l'import fait foi) |
| Données sport | Séances dans le .md, cochées dans l'app |
| Fichiers | **1 .md par semaine** contenant Cuisine + Marc + Mélanie |
| Stack | Vite + React + TypeScript, PWA (vite-plugin-pwa) |
| Hébergement | GitHub Pages (repo `sport-app`), workflow GitHub Actions |
| Design | **Dark mode only**, cohérent, fluide (transitions), ultra visible (contraste élevé, gros éléments tactiles) |

## Architecture

100 % front, zéro backend :

- **Parser** : .md → `WeeklyData` typé (frontmatter js-yaml + parseur maison pour sections/checklists). Warnings pour lignes non reconnues. Erreur bloquante si frontmatter invalide → ancienne semaine conservée.
- **Persistance** (localStorage) :
  - `sportapp:week` — semaine courante (raw + parsée + date d'import)
  - `sportapp:checks:{semaine}` — coches (ids stables : `section:slug-label`)
  - `sportapp:weights:{profil}` — historique poids `{date, kg}`
- **UI** : 3 onglets — 🛒 Cuisine (Courses / Menu / Batch) · 💪 Marc · 🥑 Mélanie. Jour courant mis en avant dans le Menu. Suivi poids avec sparkline SVG. Import via `input[type=file]`, fallback écran d'accueil si aucune semaine.
- **PWA** : offline-first (app shell caché + données locales), manifest, icônes générées.
- **Hors périmètre** : archives des semaines, sync multi-appareils, import CSV Garmin, auth.

## Format .md hebdo (contrat)

```markdown
---
semaine: 2026-S39
menu: A
titre: Menu A — Base poulet & bolo
du: 2026-09-21
au: 2026-09-27
---

## Courses        → sous-sections ### Rayon, items `- label`
## Menu           → ### Jour, items `- dejeuner-marc: …` etc.
## Batch          → items `- [ ] label`
## Marc           → ### Cibles / ### Séances / ### Rappels
## Melanie        → idem (slug sans accents)
```

Clés menu valides : `dejeuner-marc`, `dejeuner-melanie`, `diner-famille`, `diner-melanie`, `batch`. Une semaine d'exemple réelle (Menu A, Sem 1) est embarquée dans l'app.

## Tests

vitest : parser (cas valides/erreurs/warnings/ids stables), storage, composants clés (import, coches, jour courant, pesées).
