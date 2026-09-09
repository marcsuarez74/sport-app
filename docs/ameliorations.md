# Axes d'amélioration — Rituel

Mémoire des idées et pistes d'évolution, notées le 2026-09-09. Ce fichier n'est
**pas une spec** : quand un axe devient une vraie feature, faire le cycle
habituel (brainstorming → spec → plan → TDD) et créer un dossier dans
`docs/superpowers/`. L'ordre des sections n'est pas une priorité — à arbitrer
au moment de choisir la prochaine itération.

## Contraintes non négociables

- **Zéro backend** : toutes les données vivent dans le téléphone (localStorage),
  PWA offline-first. Toute idée qui suppose un serveur est à re-formuler.
- **Public actuel** : Marc & Mélanie uniquement — mais garder la porte ouverte à
  une évolution multiprofile (ne pas graver « 2 profils » dans le code).
- **La rotation de 4 menus (A/B/C/D) est la clé** pour installer la routine
  (« Rituel ») : toute évolution du process doit préserver ce principe.

## Déjà en place (ne pas reconcevoir)

- Rotation 4 menus, cycle généré par prompt IA (`docs/templates/`), import
  groupé de 4 semaines .md via le profil, stock multi-semaines
  (`sportapp:weeks`), ouverture sur la semaine du jour, chevrons ‹ ›
- Onglets Cuisine (Courses · Menu · Batch) et Mon suivi (cibles, séances,
  rappels, pesées), coches par semaine, semaine d'exemple en fallback

## 1. Design & identité visuelle

À revoir — ressenti actuel :

- Trop compact ; le thème sombre alourdit l'app
- Manque d'icônes
- Viser un thème **cuisine / élégance / sobriété** (réfléchir au dark mode
  actuel vs une palette plus lumineuse — à challenger sans casser le design
  system existant : tokens sur `:root`, un seul `index.css`)

## 2. Onboarding enrichi (process au chargement de l'app)

Étendre l'onboarding actuel (profil, poids, âge, taille, objectifs) avec :

- **Magasin** où on fait ses courses (adapter les listes / la disposition)
- **Matériel** disponible chez soi (four, multi-cuiseur, blender… → filtre les
  recettes et le batch)
- **Type de plats** souhaité : healthy / végé / vegan / petit budget / etc.
- **Budget max par semaine** (course + par repas ?)
- **Nombre de repas** par jour et **nombre de personnes** à table

## 3. Profil & objectifs

- **Objectif explicite** : perte de poids / affiner musculature / prise de
  masse (aujourd'hui implicite via les cibles kcal)
- **Compléments** : whey, créatine, oméga-3, collagène… (affichés dans le suivi
  ? intégrés aux cibles ?)
- **Régime** : keto par exemple — paramètre du profil plutôt qu'un fait acquis
  (Mélanie = keto aujourd'hui)

## 4. Onglet Cuisine

- **Liste de courses** : revoir l'affichage
- **Menus** : vue globale de la semaine + vue jour détaillée (aujourd'hui la
  semaine est une liste de jours)
- **Batch** : plus précis, avec le détail des recettes (cards expandables)
- **Flexibilité des recettes** : ne pas imposer une recette par jour — pouvoir
  marquer « ça c'est fait » sans recette rattachée

## 5. Onglet Suivi

- **Design** à améliorer (cf. axe 1)
- **Poids** : graphique plus lisible
- **Calories du jour** calculées en fonction des repas réellement cochés
- **Séances/rituels** : plutôt qu'une liste par jour, une **liste à faire pour
  la semaine** (selon le profil), cochée quand c'est fait
- **Rappel de pesée** (lun/mer/ven) — à rendre plus visible/actionnable

## 6. Rotation & génération (simplification)

- Simplifier le process de rotation : aujourd'hui prompt IA hors app → 4
  fichiers .md → import manuel. Piste : appeler directement une **API IA
  depuis l'app** (à réconcilier avec « zéro backend » : appel client direct,
  clé à l'utilisateur, ou génération hors app gardée)
- Garder la rotation sur 4 menus quoi qu'il arrive (cf. contraintes)
