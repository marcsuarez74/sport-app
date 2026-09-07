# Spec — App ludique (sans import, dock flottant, images rayons)

Date : 2026-09-08 · Branche : `feat/app-ludique` · Statut : validé par Marc (3 questions + maquettes B et photos)

## Décisions validées

1. **Zéro import dans l'app** : `ImportScreen` et `ImportButton` supprimés (composants, CSS, tests UI). Sans semaine stockée → la semaine d'exemple se charge automatiquement en mémoire (`loadWeek() ?? semaineExemple()`, pas d'écriture implicite en localStorage). `parse.ts` et `saveWeek` conservés (future convention template, hors scope ici). Bannière sans « Changer de semaine », profil sans « Importer un .md ».
2. **Onglets « Dock flottant »** (maquette B) : dock fixe détaché du bas (marges latérales 16px + safe-area + 12px), pill, fond `rgb(26 29 39 / .9)` + blur 12px + bordure + ombre. Actif = pilule pleine `--accent-strong` (icône + label blanc 700) ; inactif = icône seule muted, ≥ 48px. `aria-current` conservé.
3. **Images de rayons** : 7 miniatures Unsplash validées en maquette (6 rayons + fallback « rayon inconnu »), 160×120 JPEG ~55 Ko au total, dans `src/assets/rayons/` (hashées par Vite). En-tête de groupe = miniature arrondie + titre. Normalisation des noms (casse + accents) via `src/lib/rayons.ts` (`imagePourRayon`), fallback = `default.jpg`. `loading="lazy"` + runtime caching `CacheFirst` sur `\.(jpg|jpeg|webp|png)$` → précache inchangé (~269 Ko), hors-ligne OK après 1ʳᵉ visite des courses.
4. **Docs** : AGENTS.md, ai/context (design-system, ui-guideline, performance), README (l'import .md n'est plus actif — reviendra avec la convention).

## Hors scope

La convention template .md (tâche future), badge de progression sur l'onglet Cuisine, images sur le menu/batch.
