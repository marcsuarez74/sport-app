# Spec — Profil & objectifs (axe 3)

## Contexte

L'axe 3 de `docs/ameliorations.md` (avec la « Partie Objectif » de l'axe 2) devient un chantier : l'app ne connaît aujourd'hui de ses utilisateurs que `age, taille, poidsObjectif?, kcalObjectif?`. Le « régime » de Mélanie est un fait implicite du contenu .md, l'objectif n'existe pas (les cibles kcal le devinent), les compléments nulle part.

Décisions validées en brainstorming (2026-09-09) :

| Sujet | Décision |
|---|---|
| Périmètre | **Les 4 items** : date de naissance, objectif explicite + échéance, compléments, régime |
| Âge → date de naissance | **Migration forcée** : au premier lancement après la mise à jour, l'onboarding se relance prérempli |
| Forme de la migration | **Re-onboarding prérempli** : poids = dernière pesée, taille, objectifs ; seule la date de naissance à compléter ; pas de re-choix du profil |
| Objectif | **4 types** : Perte de poids / Affiner / Prise de masse / Maintien + échéance optionnelle |
| Affichage objectif | **Bloc « Objectif » en tête de Mon suivi** : type + échéance (J-restants) + progression adaptée au type |
| Compléments | **Presets + ajout libre**, affichés en chips dans le bloc Objectif |
| Régime | **Descriptif** : mono-valeur parmi presets, stocké + affiché, sans effet fonctionnel |
| Saisie | **Tout à l'onboarding** (4 étapes) |
| Stockage | **Approche A — Profil v2 unique** : même clé `sportapp:profile`, shape réécrit, détection de l'ancienne forme à la lecture |
| **Objectif kcal/jour** | **Supprimé** (maquette v2) — plus de saisie nulle part ; la donnée `kcalObjectif` est abandonnée (plus collectée, plus affichée) |
| **Stat-cards** | **Réduites à la carte Poids** (maquette v5) — pleine largeur avec variation « ▼ x kg vs 7 jours » ; cartes Courses, Kcal du jour et Séances supprimées |
| **Séances** | **Liste libre à cocher** (maquette v4) — plus de jour imposé : « Muscu libre 10h30 » + pastille discrète « conseillé lun. » ; même philosophie que le menu v2 |
| **Boutons** | Maquette v2 : navigation d'étapes = rangée « Retour » (fantôme) + « Continuer » (basilic, chevron) ; dernier écran = « C'est parti ! 🚀 » pleine largeur ; Profil = pilules pleines (Enregistrer) / fantôme (Importer) / fantôme rouge (Changer de profil) |

**Maquette de référence (validée)** : `docs/superpowers/mockups/profil-objectifs-v6.html` — langage Herbes, interrupteurs de variantes (4 types, 3 états d'échéance, compléments) sur l'écran Suivi. C'est elle qui fait foi sur le rendu exact ; en cas de divergence avec ce document, elle gagne.

Un point de design a été tranché par les maquettes (v1 → v6, itérées avec l'utilisateur) : l'onboarding 4 étapes, le bloc Objectif, l'écran Profil, les boutons, la réduction des stat-cards et la liste de séances libre. Le résultat est figé dans la maquette de référence ci-dessus.

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
  objectif: Objectif;
  complements: string[];
  regime: Regime;
}
// NB : kcalObjectif disparaît (maquette v2) — la donnée legacy est ignorée au parse.

// ancienne forme stockée avant migration — lecture seule, préremplissage only
export interface ProfilLegacy {
  id: ProfileKey;
  age: number;
  taille: number;
  poidsObjectif?: number;
  kcalObjectif?: number; // conservé pour le type legacy, ignoré au préremplissage
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
2. **Infos** — Poids (kg, → `addWeight` inchangé) · **Date de naissance** (input `type=date`, obligatoire, remplace l'Âge, hint « ton âge se calcule tout seul ») · Taille (cm).
3. **Objectif** — 4 cartes radio : Perte de poids / Affiner / Prise de masse / Maintien · Échéance (input date, optionnelle) · Poids objectif (kg). **Pas de kcal/jour** (supprimé, maquette v2).
4. **Personnalisation** — Compléments : chips presets cochables (whey, créatine, oméga-3, collagène, magnésium, vitamine D) + rangée d'ajout (input discret fond `--bg` + bouton « Ajouter » compact) · Régime : 5 radios (Keto / Végétarien / Vegan / Sans gluten / Aucun).

Dots ×4. Validation par étape (message `role="alert"` existant). Bornes conservées : poids 30-250, taille 120-230, âge calculé 10-100 (la borne kcal 800-6000 disparaît avec le champ).

**Boutons** (maquette v2) : navigation = rangée `Retour` (fantôme, bordure) + `Continuer` (basilic, chevron SVG) ; dernier écran = `C'est parti ! 🚀` pleine largeur.

### Mode migration

Prop `prefill?: ProfilLegacy` :

- Démarre **directement à l'étape 2** (pas de re-choix du profil) avec le bandeau « Une mise à jour 👋 — ton profil existe déjà : on l'a prérempli » et la rangée « Profil : Marc 💪 — non modifiable ici ».
- Préremplit : poids (dernière pesée enregistrée via `getWeights`, champ vide si aucune, hint « dernière pesée enregistrée »), taille, poids objectif. La date de naissance est vide, label marqué « à compléter » en rouge.
- Régime démarre sur `aucun`, compléments vides (rien dans la donnée legacy).
- Après `saveProfile` (v2), la clé est écrasée → migration terminée, plus jamais proposée.

## 3. Affichage Mon suivi & écran Profil

Ordre du suivi : greeting → **ObjectifBloc** → **carte Poids** (héritière des stat-cards) → ProfileView (Cibles, Séances, Suivi poids, Rappels).

### `ObjectifBloc` (nouveau composant `src/components/ObjectifBloc.tsx`)

Une carte :

- Rangée de tête : pill **type d'objectif** + pill **régime** (« 🌿 Keto » via icône `leaf`, cachée si `aucun`).
- **Échéance** : « Échéance : 15 déc. · dans 97 jours » ; si dépassée : « Échéance : 15 juin · dépassée » (date en rouge) ; cachée si absente.
- **Progression** selon le type :
  - `perte` : « 4,4 kg restants » + barre basilic (départ = 1ʳᵉ pesée → actuelle = dernière ; sans pesée, pas de barre ni de kg) + hint « Départ 82,8 kg · 82,8 → 78,4 → cible 74,0 kg ».
  - `masse` : « 3,6 kg à prendre » + barre (même logique, sens inversé).
  - `affiner` / `maintien` : pas de barre ; ligne « Poids actuel 78,4 kg · cible 74,0 kg » si `poidsObjectif` existe.
- **Compléments** en chips sous un filet pointillé (rien si liste vide).

Lit les pesées via `getWeights(profile.id)` — remonté par le même pattern `weightsBump` que la carte Poids (remount à l'ajout d'une pesée).

### Carte Poids (StatCards réduite)

`src/components/StatCards.tsx` : ne conserve que la carte **Poids**, pleine largeur (valeur + `▼/▲ x,x kg vs 7 jours` coloré selon le sens de l'objectif). Les cartes Courses, Kcal du jour et Séances sont **supprimées** (maquettes v2/v5) — `kcalDuJour` (stats.ts) n'a plus de consommateur UI : la fonction reste si un futur chantier la relève, sinon sortie avec son test.

### Séances en liste libre

`src/components/ProfileView.tsx` : la liste des séances n'affiche plus le jour comme titre — le préfixe « <Jour> — » du libellé .md est extrait et rendu en pastille discrète « conseillé lun. » (majuscules 10 px, `--surface-2`), le reste du libellé passe en texte principal. Pas de préfixe jour → pas de pastille. **Ids de coches inchangés**, la coche garde son comportement. Rendu via le prop `renderLabel` de `Checklist` (ajouté par le chantier Herbes). Mapping abréviations dans `dates.ts` : `jourAbrege('lundi') → 'lun.'`.

### `ProfilScreen`

- « Mes infos » : date de naissance (input date, hint « 41 ans — calculé automatiquement ») remplace l'âge ; bouton `Enregistrer` pleine largeur.
- Nouvelle section **Objectif** : radios type + échéance + poids objectif + `Enregistrer`.
- Nouvelle section **Compléments** : chips retirables + rangée d'ajout.
- Nouvelle section **Régime** : radios + `Enregistrer`.
- Semaine : `Importer un cycle (.md)` fantôme. Compte : `Changer de profil` fantôme rouge.

## 4. Dates & calculs (`src/lib/dates.ts`)

- `ageDepuis(dateNaissance: string): number` — calcul en heure locale (pattern repo : jamais de parse date seule en UTC).
- `joursRestants(echeance: string): number` — signé, négatif = dépassé.
- `jourAbrege(jour: string): string` — `'lundi' → 'lun.'` (pour les pastilles de recommandation des séances).
- `formatDayMonth` existant réutilisé pour la date d'échéance.

## 5. Validation & erreurs

- Date de naissance obligatoire, pas dans le futur, âge calculé borné 10-100.
- Échéance optionnelle ; une date passée est autorisée (affichage neutre « dépassée », date en rouge).
- Compléments : dédoublonnés (trim + comparaison insensible casse/accents), ajout libre limité à 40 caractères.
- Profil v2 corrompu → `safeParse` + remove + fallback (jamais de crash).

## 6. Tests (TDD)

- `tests/storage.test.ts` : round-trip v2, détection legacy (`loadProfilLegacy`), v2 corrompu → null, legacy absent → null.
- `tests/lib/dates.test.ts` (nouveau, miroir) : `ageDepuis`, `joursRestants`, `jourAbrege` (fake timers `vi.setSystemTime(new Date('…T10:00:00'))`).
- `tests/components.test.tsx` : Onboarding 4 étapes (navigation dots, validation par étape, chips compléments ajout/retrait/dédoublonnage, régime, boutons Retour/Continuer), `ObjectifBloc` (4 types avec/sans barre, échéance présente/dépassée/absente, compléments, pill régime cachée si `aucun`), StatCards réduite (carte Poids seule + variation), séances avec pastille « conseillé » (préfixe jour extrait), ProfilScreen (sections).
- `tests/app.test.tsx` : **migration gate** — `sportapp:profile` en ancienne forme → Onboarding prérempli affiché (étape 2 directe, poids prérempli, date à compléter) ; après save → app directe. Vérifier aussi qu'aucun profil → onboarding vierge (étape 1).
- `tests/e2e/` : onboarding complet (4 étapes), migration préremplie (storageState avec l'ancienne clé `age` → date → app), bloc objectif + carte Poids visibles. **Attention** : tous les storageState existants posent `sportapp:profile` en ancienne forme `{ id, age, taille }` — ils passent tous au shape v2, sinon l'app affiche l'onboarding et les specs cassent.

## 7. Fichiers touchés

| Fichier | Action |
|---|---|
| `src/lib/model.ts` | types v2 (`Objectif`, `Regime`, `UserProfile` réécrit, `ProfilLegacy`) — `kcalObjectif` sorti de UserProfile |
| `src/lib/storage.ts` | `loadProfile` v2 strict, `loadProfilLegacy` nouveau |
| `src/lib/dates.ts` | `ageDepuis`, `joursRestants`, `jourAbrege` |
| `src/components/onboarding/Onboarding.tsx` | réécriture 4 étapes + mode migration (`prefill`) + boutons Retour/Continuer |
| `src/components/ObjectifBloc.tsx` | **nouveau** |
| `src/components/StatCards.tsx` | réduite à la carte Poids pleine largeur (Courses/Kcal/Séances supprimées) |
| `src/components/ProfileView.tsx` | séances : pastille « conseillé <jour> » via `renderLabel` |
| `src/components/ProfilScreen.tsx` | sections Objectif / Compléments / Régime + date de naissance + boutons |
| `src/App.tsx` | migration gate (`loadProfilLegacy` → Onboarding prérempli) + rendu `ObjectifBloc` |
| `src/index.css` | styles onboarding 4 étapes, cartes radio, chips, bloc objectif, pastilles recommandation, boutons |
| `tests/e2e/*.spec.ts` | tous les `storageState` migrés au shape v2 |
| `AGENTS.md` | shape `sportapp:profile` v2 + « onboarding en 4 étapes » |
| `README.md` | idem si mention (grep « onboarding », « âge ») |
| `CHANGELOG.md` | section `[Non publié]` |
| `docs/ameliorations.md` | axe 3 marqué traité, partiel axe 5 (séances) |
| `ai/context/*` | chips / cartes radio / bloc objectif si divergence avec design-system |

## 8. Hors périmètre

- Effets fonctionnels du régime (filtres recettes, encadré dynamique) → futur onboarding enrichi.
- Calories du jour selon repas cochés (axe 5 — la carte est supprimée, l'idée reste au fichier d'améliorations), graphique poids, rappel pesée.
- Rappels/notifications compléments.
- Contrat .md (intouché).

## 9. Vérifications

- `npm test && npm run typecheck && npm run lint && npm run build` verts.
- `npm run e2e` verts (375/320, zéro débordement) — storageStates migrés en v2.
- Parcours manuel : onboarding vierge 4 étapes ; migration préremplie ; bloc objectif (4 types + 3 états d'échéance) ; carte Poids ; séances en liste libre ; édition Profil ; données corrompues → fallback propre.

## 10. Risques

- **Tous les storageState e2e et tests unitaires** posant l'ancienne forme `sportapp:profile` cassent par design — mise à jour systématique (compter les occurrences `age:` au grep avant de commencer).
- Le poids prérempli vient des pesées stockées : si l'utilisateur n'a jamais pesé, champ vide — il ressaisit.
- `kcalObjectif` est abandonné : la donnée existante est ignorée au parse v2 (choix utilisateur, maquette v2) — un retour arrière de version afficherait l'onboarding.
- La migration supprime définitivement `age` de la clé : après save v2, un retour arrière de version afficherait l'onboarding (acceptable — migration à sens unique assumée).
