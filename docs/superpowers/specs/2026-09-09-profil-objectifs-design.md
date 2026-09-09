# Spec — Profil & objectifs (axe 3)

## Contexte

L'axe 3 de `docs/ameliorations.md` (avec la « Partie Objectif » de l'axe 2) devient un chantier : l'app ne connaît aujourd'hui de ses utilisateurs que `age, taille, poidsObjectif?, kcalObjectif?`. Le « régime » de Mélanie est un fait implicite du contenu .md, l'objectif n'existe pas (les cibles kcal le devinent), les compléments nulle part.

Décisions validées en brainstorming (2026-09-09) :

| Sujet | Décision |
|---|---|
| Périmètre | **Les 4 items** : date de naissance, objectif explicite + échéance, compléments, régime (l'utilisateur veut les 4, régime inclus) |
| Âge → date de naissance | **Migration forcée** : au premier lancement après la mise à jour, l'onboarding se relance |
| Forme de la migration | **Re-onboarding prérempli** : valeurs existantes préremplies (poids = dernière pesée, taille, objectifs), seule la date de naissance est à compléter ; pas de re-choix du profil (les pesées sont liées à l'id) |
| Objectif | **4 types** : Perte de poids / Affiner (recomposition) / Prise de masse / Maintien + échéance optionnelle |
| Affichage objectif | **Bloc « Objectif » en tête de Mon suivi** : type + échéance (J-restants) + progression adaptée au type |
| Compléments | **Presets + ajout libre**, affichés en chips dans le suivi |
| Régime | **Descriptif** : mono-valeur parmi presets, stocké + affiché, sans effet fonctionnel (il servira de base aux futurs filtres recettes) |
| Saisie | **Tout à l'onboarding** (compléments et régime deviennent des étapes) |
| Stockage | **Approche A — Profil v2 unique** : même clé `sportapp:profile`, shape réécrit, détection de l'ancienne forme à la lecture |

Un point de design est **délibérément reporté aux maquettes** : la mise en forme exacte de l'onboarding (4 étapes), du bloc Objectif et des nouvelles sections Profil est validée visuellement avant le plan d'implémentation (même pattern que le chantier Herbes — toute divergence entre maquette et spec → la spec est amendée).

## 1. Modèle de données & migration

### Types (`src/lib/model.ts`)

```ts
export type ObjectifType = 'perte' | 'affiner' | 'masse' | 'maintien';
export type Regime = 'keto' | 'vegetarien' | 'vegan' | 'sans-gluten' | 'aucun';

export interface Objectif {
  type: ObjectifType;
  echeance?: string; // AAAA-MM-JJ, optionnelle
}

export interface UserProfile {
  id: ProfileKey;
  dateNaissance: string; // AAAA-MM-JJ (remplace age)
  taille: number;
  poidsObjectif?: number;
  kcalObjectif?: number;
  objectif: Objectif;
  complements: string[];
  regime: Regime;
}

// ancienne forme stockée avant migration — lecture seule, préremplissage only
export interface ProfilLegacy {
  id: ProfileKey;
  age: number;
  taille: number;
  poidsObjectif?: number;
  kcalObjectif?: number;
}
```

### Storage (`src/lib/storage.ts`)

- Clé inchangée : `sportapp:profile`.
- `loadProfile(): UserProfile | null` — parse **v2 strict** (garde de forme : `dateNaissance` ISO, `objectif.type` dans l'enum, `complements` tableau de chaînes, `regime` dans l'enum). Toute forme non conforme → `null` (donnée corrompue → warn + remove + fallback, règle repo ; l'ancienne forme n'est pas « corrompue », elle est simplement lue par l'autre fonction, sans warning).
- `loadProfilLegacy(): ProfilLegacy | null` — parse l'ancienne forme (présence de `age`, garde de forme). `null` sinon. Sert uniquement au préremplissage de la migration. Une fois le profil v2 sauvé, la clé est écrasée → retourne naturellement `null`.
- `saveProfile()` : inchangé (sauve la forme v2).

### Contrat .md

**Aucun changement** : objectif, compléments et régime sont des données d'app (profil), pas du cycle. `parse.ts` intouché.

## 2. Onboarding — 4 étapes

`src/components/onboarding/Onboarding.tsx` (fichier unique, 2 étapes aujourd'hui → 4) :

1. **Profil** — inchangé (Marc 💪 / Mélanie 🌿).
2. **Infos** — Poids (kg, → `addWeight` inchangé) · **Date de naissance** (input `type=date`, obligatoire, remplace l'Âge) · Taille (cm).
3. **Objectif** — 4 cartes radio : Perte de poids / Affiner / Prise de masse / Maintien · Échéance (input date, optionnelle) · Poids objectif (kg) · Objectif kcal/jour (champs existants déplacés ici).
4. **Personnalisation** — Compléments : chips presets cochables (whey, créatine, oméga-3, collagène, magnésium, vitamine D) + champ d'ajout libre · Régime : 5 radios (Keto / Végétarien / Vegan / Sans gluten / Aucun).

Dots ×4. Validation par étape (message `role="alert"` existant). Bornes conservées : poids 30-250, taille 120-230, kcal 800-6000, âge calculé 10-100.

### Mode migration

Prop `prefill?: ProfilLegacy` :

- Démarre **directement à l'étape 2** (pas de re-choix du profil).
- Préremplit : poids (dernière pesée enregistrée via `getWeights`, champ vide si aucune), taille, poids objectif, kcal objectif.
- Titre : « Une mise à jour 👋 — on complète ton profil » (étape 2) ; les étapes 3-4 s'affichent normalement (régime pré-coché `keto` si l'id est `melanie` ? **non** — le régime n'existe pas dans la donnée legacy, il démarre sur `aucun` ; Mélanie le choisira).
- Après `saveProfile` (v2), la clé est écrasée → migration terminée, plus jamais proposée.

## 3. Affichage Mon suivi & écran Profil

### `ObjectifBloc` (nouveau composant `src/components/ObjectifBloc.tsx`)

Une carte en tête de Mon suivi (après le greeting, avant les StatCards) :

- Rangée de tête : pill **type d'objectif** + pill **régime** (« Keto », cachée si `aucun`).
- **Échéance** : « Échéance : 12 oct. · dans 33 jours » ; si dépassée : « Échéance : 12 oct. · dépassée » ; cachée si absente.
- **Progression** selon le type :
  - `perte` : « X,Y kg restants » + barre de progression (départ = 1ʳᵉ pesée enregistrée → actuelle = dernière ; sans pesée, pas de barre ni de kg).
  - `masse` : « X,Y kg à prendre » + barre (même logique, sens inversé).
  - `affiner` / `maintien` : pas de barre ; ligne « Poids actuel X kg · cible Y kg » si `poidsObjectif` existe.
- **Compléments** en chips en bas du bloc (rien si liste vide).

Lit les pesées via `getWeights(profile.id)` — remonté par le même pattern `weightsBump` que les StatCards (remount à l'ajout d'une pesée).

### `ProfilScreen`

- « Mes infos » : date de naissance (input date) remplace l'âge.
- Nouvelle section **Objectif** : radios type + échéance + poids objectif + kcal objectif.
- Nouvelle section **Compléments** : chips retirables + champ d'ajout.
- Nouvelle section **Régime** : radios.
- Semaine / Compte : inchangés.

`ProfileView` (onglet suivi) : inchangé (le bloc Objectif est rendu par `App.tsx`, pas par ProfileView).

## 4. Dates & calculs (`src/lib/dates.ts`)

- `ageDepuis(dateNaissance: string): number` — calcul en heure locale (pattern repo : jamais de parse date seule en UTC).
- `joursRestants(echeance: string): number` — signé, négatif = dépassé.
- `formatDayMonth` existant réutilisé pour la date d'échéance.

## 5. Validation & erreurs

- Date de naissance obligatoire, pas dans le futur, âge calculé borné 10-100.
- Échéance optionnelle ; une date passée est autorisée (affichage neutre « dépassée »).
- Compléments : dédoublonnés (trim + comparaison insensible casse/accents), ajout libre limité à 40 caractères.
- Profil v2 corrompu → `safeParse` + remove + fallback (jamais de crash).

## 6. Tests (TDD)

- `tests/storage.test.ts` : round-trip v2, détection legacy (`loadProfilLegacy`), v2 corrompu → null, legacy absent → null.
- `tests/lib/dates.test.ts` (nouveau, miroir) : `ageDepuis`, `joursRestants` (fake timers `vi.setSystemTime(new Date('…T10:00:00'))`).
- `tests/components.test.tsx` : Onboarding 4 étapes (navigation dots, validation par étape, chips compléments ajout/retrait/dédoublonnage, régime), `ObjectifBloc` (4 types, échéance présente/dépassée/absente, barre selon pesées, compléments), ProfilScreen (sections).
- `tests/app.test.tsx` : **migration gate** — `sportapp:profile` en ancienne forme → Onboarding prérempli affiché (étape 2 directe, poids prérempli) ; après save → app directe. Vérifier aussi qu'aucun profil → onboarding vierge (étape 1).
- `tests/e2e/` : onboarding complet (4 étapes), migration préremplie (storageState avec l'ancienne clé `age` → date → app), bloc objectif visible. **Attention** : tous les storageState existants posent `sportapp:profile` en ancienne forme `{ id, age, taille }` — ils passent tous au shape v2, sinon l'app affiche l'onboarding et les specs cassent.

## 7. Fichiers touchés

| Fichier | Action |
|---|---|
| `src/lib/model.ts` | types v2 (`Objectif`, `Regime`, `UserProfile` réécrit, `ProfilLegacy`) |
| `src/lib/storage.ts` | `loadProfile` v2 strict, `loadProfilLegacy` nouveau |
| `src/lib/dates.ts` | `ageDepuis`, `joursRestants` |
| `src/components/onboarding/Onboarding.tsx` | réécriture 4 étapes + mode migration (`prefill`) |
| `src/components/ObjectifBloc.tsx` | **nouveau** |
| `src/components/ProfilScreen.tsx` | sections Objectif / Compléments / Régime + date de naissance |
| `src/App.tsx` | migration gate (`loadProfilLegacy` → Onboarding prérempli) + rendu `ObjectifBloc` |
| `src/index.css` | styles onboarding 4 étapes, cartes radio, chips, bloc objectif |
| `AGENTS.md` | shape `sportapp:profile` v2 + « onboarding en 4 étapes » |
| `README.md` | idem si mention (grep « onboarding », « âge ») |
| `CHANGELOG.md` | section `[Non publié]` |
| `ai/context/*` | chips / cartes radio / bloc objectif si divergence avec design-system |

## 8. Hors périmètre

- Effets fonctionnels du régime (filtres recettes, encadré dynamique) → futur onboarding enrichi.
- Calories du jour selon repas cochés, graphique poids, rappel pesée (axe 5).
- Rappels/notifications compléments.
- Contrat .md (intouché).

## 9. Vérifications

- `npm test && npm run typecheck && npm run lint && npm run build` verts.
- `npm run e2e` verts (375/320, zéro débordement) — storageStates migrés en v2.
- Parcours manuel : onboarding vierge 4 étapes ; migration préremplie ; bloc objectif (4 types + échéance) ; édition Profil ; données corrompues → fallback propre.

## 10. Risques

- **Tous les storageState e2e et tests unitaires** posant l'ancienne forme `sportapp:profile` cassent par design — mise à jour systématique (compter les occurrences `age:` au grep avant de commencer).
- Le poids prérempli vient des pesées stockées : si l'utilisateur n'a jamais pesé, champ vide — il ressaisit.
- La migration supprime définitivement `age` de la clé : après save v2, un retour arrière de version afficherait l'onboarding (acceptable — migration à sens unique assumée).
