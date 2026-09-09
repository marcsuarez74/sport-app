# Changelog

Toutes les évolutions notables de l'app sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr-FR/1.1.0/) et le versionnement sémantique ([semver](https://semver.org/lang/fr/)) : **majeur** = changement cassant (contrat .md, migration storage), **mineur** = nouvelle fonctionnalité, **correctif** = bugfix. La source de vérité est le champ `version` de `package.json`.

## [Non publié]

## [1.0.0] - 2026-09-09

Première version étiquetée — état de l'app après le redesign Nutrigo et le renommage en Rituel.

### Ajouté

- **Version visible** en bas de l'écran Profil (« Rituel vX.Y.Z ») pour diagnostiquer le cache du service worker
- **Releases GitHub** : le push d'un tag `v*` crée la release avec les notes du CHANGELOG (workflow `release.yml`)
- Rotation de 4 menus hebdomadaires + import d'un cycle complet (.md) avec navigation entre semaines par chevrons
- Stock multi-semaines, coches et pesées persistées en localStorage par semaine et par profil
- Onboarding en 2 étapes (profil Marc / Mélanie, poids, âge, taille, objectifs) et écran Profil éditable
- Suivi du profil actif : cibles, séances, rappels, pesées avec courbe de poids
- Onglet Cuisine partagé : Courses (compteurs par rayon, encadré keto), Menu (jour courant en tête, cartes recettes), Batch (timeline du rituel dimanche, carrousel micro-batch)
- PWA offline-first installable (service worker autoUpdate, icônes maskable)
- Semaine d'exemple auto-chargée au premier lancement, hors-ligne dès l'installation

[1.0.0]: https://github.com/marcsuarez74/rituel-app/releases/tag/v1.0.0
