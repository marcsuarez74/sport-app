# Spec — UX personnalisée (onboarding, app teintée, 2 onglets)

Date : 2026-09-07 · Branche : `ux-revamp` · Statut : validé par Marc (design présenté par sections + maquette A + points de progression)

## Objectif

Rendre l'app **personnalisée par profil** : chacun ne voit que ce qui le concerne + la partie cuisine. Une première connexion ludique en 2 étapes choisit le profil et collecte les bases (poids, âge, taille). Un téléphone chacun — le profil est choisi une fois.

## Décisions validées

1. **Onboarding 2 étapes** (lancé si `sportapp:profile` absent) :
   - Étape 1 « Qui est derrière l'écran ? » : deux grandes cartes à dégradés saturés — 💪 Marc (orange `#e07b39`, « Diet & sport ») / 🌿 Mélanie (vert `#3d9a6c`, « Keto & sport »). Style « Grand écart fun » (maquette A).
   - Étape 2 « Salut {prénom} ! 👋 » : poids (kg), âge, taille (cm) + CTA « C'est parti ! 🚀 ». Points de progression en haut (de B).
   - Validation : poids 30–250, âge 10–100, taille 120–230. Erreur inline `.error` `role="alert"`.
   - Submit → `saveProfile({ id, age, taille })` + `addWeight(id, date du jour, poids)` (première entrée d'historique).
   - Pas de « passer ». « ← Retour » de l'étape 2 vers l'étape 1.
2. **App teintée** : `data-profile="marc|melanie"` sur `<html>` → variable `--accent` globale (orange/vert). Avant le choix : bleu-violet actuel. Tous les usages `--accent-cuisine` migrent vers `--accent` (checkboxes, boutons, focus, badge aujourd'hui, barre d'onglet active, sparkline).
3. **Navigation 2 onglets** : 🛒 Cuisine (partagé, inchangé) / 🎯 Mon suivi (`ProfileView` existant réutilisé avec `profileKey = mon id` — filtrage gratuit) + accueil « Salut {prénom} 👋 ».
4. **Écran Profil** (icône en haut à droite de la bannière, ≥ 48px, écran poussé avec retour) : mes infos (âge/taille modifiables), importer un .md, **changer de profil** (efface `sportapp:profile` → onboarding, données conservées), à propos.
5. **Illustrations** : émojis + SVG inline uniquement (pas d'Unsplash : budget précache PWA < 300 Ko + offline-first).

## Données

- Nouvelle clé : `sportapp:profile` = `{ id: 'marc'|'melanie', age, taille }` — lecture via safeParse + garde de forme (id valide, nombres) ; corrompu → warn + remove + null (= re-onboarding). Absent → silencieux.
- Clés existantes **inchangées** : `sportapp:week`, `sportapp:checks:{semaine}`, `sportapp:weights:{profil}`. IDs de coches intacts.
- Rétrocompat : les données existantes sans `sportapp:profile` déclenchent l'onboarding une fois.

## Composants

- `src/components/onboarding/Onboarding.tsx` (2 étapes, interne) — props : `onDone(profile)` 
- `App.tsx` : pas de profil → Onboarding ; sinon pose `data-profile`, shell 2 onglets + état `profileOpen` (écran Profil)
- `TabBar.tsx` : `TabId = 'cuisine' | 'suivi'`, 2 entrées
- `ProfilScreen.tsx` : props `profile`, `onBack`, `onChangeProfile`, `onImported`
- `storage.ts` : `saveProfile` / `loadProfile` / `removeProfile` ; `model.ts` : type `UserProfile`

## Tests (TDD, +~25)

- Store profil : persistance, clé absente silencieuse, JSON corrompu → null + remove, forme invalide → null + remove
- Onboarding : rendu étape 1, choix profil → étape 2 avec prénom, refus submit incomplet, validation bornes, submit → storage + poids initial daté du jour, retour étape 1
- Theming : `data-profile` posé selon le profil
- Shell : 2 onglets, Mon suivi ne montre que mes données, icône profil ouvre l'écran, retour
- Profil : édition infos, changer de profil → onboarding + données conservées

## Hors scope

Light mode, swipe entre onglets, import multi-semaines, stats avancées, changement de profil multi-comptes simultanés.
