# Spec — Versionning de l'app (v1)

**Date :** 2026-09-09
**Statut :** validée (approche A — manuelle, zéro dépendance)
**Décisions :** version visible dans l'app + tags/releases GitHub + CHANGELOG ; bump volontaire ; semver

## 1. Objectif

Savoir **quelle version de l'app tourne sur le téléphone** (diagnostic du cache
du service worker), garder **une trace de l'historique** (tags + releases
GitHub) et **documenter les changements** entre versions (CHANGELOG).

Hors scope : bump automatique, semantic-release, calver, multi-projets.

## 2. Source de vérité & départ

- `package.json` → champ `version` (semver `majeur.mineur.correctif`) est la
  **seule source de vérité**.
  - **majeur** : changement cassant (contrat .md, migration storage)
  - **mineur** : nouvelle fonctionnalité
  - **correctif** : bugfix
- Départ : **v1.0.0** — l'app est en usage réel depuis des semaines ; on tague
  le commit courant et on initialise le CHANGELOG avec l'état actuel.

## 3. Version visible dans l'app

- **Injection** : `vite.config.ts` — `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`
  (lecture de `package.json` au chargement de la config). Déclaration du global
  dans `src/vite-env.d.ts` (`declare const __APP_VERSION__: string`).
- **Affichage** : bas de l'écran **Profil** (`ProfilScreen`), texte discret
  « Rituel v1.0.0 » — classe sémantique existante (`.muted`), non interactif,
  aucune cible tactile requise. La valeur affichée = la version du **build**
  (donc celle du deploy sur Pages).
- **Test unitaire** : l'écran Profil affiche « Rituel v » + la valeur de
  `__APP_VERSION__` (test comportemental simple, pas de mock nécessaire).

## 4. CHANGELOG.md

- À la racine, en **français**, style [Keep a Changelog](https://keepachangelog.com) :
  - `## [x.y.z] - AAAA-MM-JJ` par version, sous-sections `### Ajouté`,
    `### Modifié`, `### Corrigé`, `### Retiré` (seulement si pertinent)
  - section `## [Non publié]` en tête, alimentée au fil des merges
  - liens de comparaison en pied de fichier
- Entrée initiale `[1.0.0] - 2026-09-09` : résumé de l'existant (rotation 4
  menus + import cycle, stock multi-semaines, onboarding, suivi profil, PWA
  offline).
- Discipline : les changements notables sont ajoutés à « Non publié » dans la
  PR qui les introduit ; au bump, la section est renommée avec la version.

## 5. Workflow de release (usage humain)

1. **Dans la branche** de la feature (dernier commit avant merge) : finaliser
   la section CHANGELOG (renommée avec la nouvelle version) puis
   `npm version minor` (ou `major`/`patch`) — crée le commit de bump **et** le
   tag `v1.x.y` localement
2. **Merge** sur `main` → le deploy Pages embarque la nouvelle version
   (un seul déploiement, la version affichée dans l'app est à jour)
3. **Pousser le tag** : `git push origin v1.x.y` → `release.yml` crée la
   GitHub Release automatiquement

Règle : pas de tag sans entrée CHANGELOG correspondante (la CI le vérifie
implicitement, cf. § 6).

## 6. Workflow CI — `release.yml` (nouveau)

- **Déclencheur** : `on: push: tags: ['v*']`
- **Permissions** : `contents: write` (création de release)
- **Étapes** :
  1. `actions/checkout@v5`
  2. Extraction des notes : la section `## [x.y.z]` du CHANGELOG correspondant
     au tag (awk — de la ligne du titre jusqu'au prochain `## [`), écrite dans
     un fichier temporaire ; **échec avec message clair si la section est
     absente ou vide**
  3. `gh release create <tag> --title "v<x.y.z>" --notes-file <fichier>` (gh
     est préinstallé sur les runners ; `GH_TOKEN` via `${{ github.token }}`)
- **Zéro dépendance npm** : ni action tierce, ni paquet ajouté.

## 7. Cas limites

- Tag poussé sans section CHANGELOG → workflow en échec, message explicite
  (le tag se corrige en supprimant/recréant, ou la section s'ajoute).
- Bump oublié → l'app affiche l'ancienne version (conséquence assumée du bump
  volontaire ; la release éventuelle reste correcte car le tag pilote).
- Cache périmé du service worker → la version affichée dans le Profil permet
  de le diagnostiquer (le SW est régénéré à chaque build, les assets sont
  hashés).
- `npm version` sur une arborescence sale échoue par défaut : le bump se fait
  sur un working tree propre (comportement souhaité).

## 8. Tests

- **Unitaire** : `ProfilScreen` affiche « Rituel v » + `__APP_VERSION__`
  (ajout au describe existant du profil).
- **Pas de nouvel e2e** : rien d'interactif ; les e2e existants ne doivent pas
  bouger (l'ajout dans ProfilScreen ne perturbe aucun sélecteur existant).
- Gates habituels avant chaque commit (`npm test && npm run typecheck &&
  npm run lint && npm run build`).

## 9. Documentation

- **README** : section Développement — « Faire une release » (les 3 commandes
  du § 5).
- **AGENTS.md** : `CHANGELOG.md` dans la Structure + une ligne dans Git
  (bump volontaire, tag pushé après merge).

## 10. Fichiers touchés

| Fichier | Action |
|---|---|
| `package.json` | `0.0.0` → `1.0.0` |
| `CHANGELOG.md` | créé (entrée 1.0.0) |
| `vite.config.ts` | `define` + lecture de la version |
| `src/vite-env.d.ts` | déclaration `__APP_VERSION__` |
| `src/components/ProfilScreen.tsx` | affichage « Rituel vX.Y.Z » |
| `tests/profil-screen.test.tsx` | test de l'affichage |
| `.github/workflows/release.yml` | créé |
| `README.md`, `AGENTS.md` | docs release |
| tag `v1.0.0` | créé + poussé après merge |
