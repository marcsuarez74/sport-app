# Renommage « Sport App » → « Rituel »

**Date :** 2026-09-09 · **Statut :** validé en brainstorming · **Prérequis :** merger `feat/nutrigo-redesign` d'abord (verdict revue finale : READY TO MERGE)

## Contexte

L'app s'appelle encore « Sport App » — nom périmé depuis qu'elle couvre cuisine, menu, batch, diet et suivi poids. Le redesign Nutrigo (accent orange/lime, dark) a donné une identité visuelle complète sans nom. Direction retenue en brainstorming : nom français court, « Rituel » choisi — le mot est déjà dans l'app (« Rituel dimanche » du batch, rituel de pesée) et couvre cuisine, sport et pesées d'un seul mot.

## Décisions validées

| Élément | Valeur |
|---|---|
| Nom d'app (manifest `name`, prompt d'installation) | **Rituel — cuisine & sport** |
| `short_name` (label sous l'icône) | **Rituel** |
| `<title>` onglet | **Rituel — cuisine & sport** |
| `package.json` `name` | **rituel** |
| Icône PWA | Monogramme **« R » disque de fonte** (voir ci-dessous) |
| Périmètre | **Nom affiché seul** — repo, URL Pages et `base` Vite inchangés |
| Clés `sportapp:*` | **Intactes** (données réelles des téléphones — jamais renommer) |

### L'icône (choix utilisateur parmi 9 candidats)

Fond `#1b1d24` arrondi, anneau orange `#ffa257` plein (façon disque de fonte), arc lime `#c2e66e` partiel (~25 % du cercle, évoque la progression : courbe de poids, barres de l'app), monogramme **R** blanc `#f9f4f2` Poppins 800 au centre.

Contrainte technique : tout le tracé doit rester dans la zone sûre **maskable** (rayon ≤ 200/512 depuis le centre) — anneau à r 180, trait 40, donc bord externe à 200 max. L'icône actuelle (« S » sur dégradé indigo d'avant le restyle) est entièrement remplacée ; `npm run icons` régénère pwa-\*/maskable/apple-touch (le manifest référence déjà ces fichiers générés, rien à changer côté config).

## Fichiers modifiés (1 commit)

- `vite.config.ts` — `manifest.name` + `short_name` (2 lignes)
- `index.html` — `<title>`
- `package.json` — `name: "rituel"`
- `public/icon-src.svg` — nouvelle icône + `npm run icons`
- `README.md` — titre et mentions du nom d'app ; les références au repo `/sport-app/` restent exactes (repo inchangé)
- `AGENTS.md` — première ligne « Sport App » → « Rituel »
- Tout fichier de `ai/` mentionnant le nom d'app (`rg "Sport App" ai/` au moment du chantier — `ai/context/*.md`, prompts design-agent) ; les chemins repo (`base: '/sport-app/'`, URL Pages) restent vrais

## Hors périmètre

- Renommage du repo GitHub, de l'URL Pages ou de `base` (décision : nom affiché seul — possible plus tard, mais c'est un autre chantier avec re-install des PWA)
- Clés `sportapp:*` dans storage.ts
- Les tests (unit + e2e) : `rg "Sport App" tests/` = 0 vérifié — aucune assertion à toucher

## Effet sur les téléphones

La PWA déjà installée garde l'ancien nom/icône jusqu'à une **réinstallation** (10 s par téléphone) ; l'app elle-même affiche le nouveau nom dès le premier lancement. À noter dans le README.

## Vérifications

- `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e` — tout vert
- `rg -i "sport app" index.html vite.config.ts package.json src/ tests/ README.md AGENTS.md ai/` → 0 occurrence (hors `sportapp:*` et `docs/superpowers/` historiques)
- `npm run build && npm run preview` — `dist/` contient les icônes régénérées ; manifest avec le nouveau `name` ; rendu visuel de `pwa-512x512.png` et `apple-touch-icon-180x180.png` conforme au monogramme
- Crop maskable Android simulé (overlay cercle) : anneau complet visible

## Risques

- **Maskable** : anneau hors zone sûre → mitigé par la géométrie ci-dessus + vérif visuelle
- **SVG `<text>`** : le rendu du « R » dépend de la police disponible à la génération — même situation que l'icône actuelle (stack Poppins-first + fallback système), acceptable
- **iOS** : nom sous l'icône figé jusqu'à réinstallation — documenté, pas un bug

## Séquençage

1. Merger `feat/nutrigo-redesign` sur main (le déploiement Pages livrera le redesign)
2. Renommage : commit `feat: renommage Rituel — nom PWA, titre, icône monogramme disque de fonte`
