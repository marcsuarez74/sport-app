# Spec — Maison & courses (axe 2)

## Contexte

L'axe 2 de `docs/ameliorations.md` (« Onboarding enrichi ») devient un chantier — **moins la Partie Objectif**, absorbée par la spec Profil & objectifs (chantier 2). Le magasin existe déjà comme donnée (chantier 1 : l'utilisateur peut tagger des rayons), mais rien ne le connaît : pas de budget, pas de types de plats, pas de taille du foyer. La brique manquante est **le prix** : ce que Marc & Mélanie paient vraiment (Lidl vs Intermarché ne coûtent pas pareil) contre l'estimé du menu.

Décisions validées en brainstorming (2026-09-09) :

| Sujet | Décision |
|---|---|
| Périmètre | **4 briques** : magasin, budget (estimé/réel/max), types de plats, nb repas/jour + personnes. **Matériel reporté** (chantier ultérieur, cf. axe 4) |
| Magasin | **Nom seul** (pas de disposition de liste — axe 4) mais centré **prix** : le comparatif par magasin émerge de l'historique des dépenses |
| Magasin (saisie) | **Datalist natif** : suggestions de magasins français connus (`MAGASINS_PRESETS`, ~10) pendant la frappe, **saisie libre préservée** (magasin de quartier possible) — aucun effet bloquant |
| Budget | **3 valeurs distinctes** : *estimé* (ligne `- budget:` du .md, parsée par Herbes), *réel* (total saisi après les courses), *max* (plafond hebdo au profil — « il ne faut pas que ça dépasse trop ») |
| Types de plats | **Champ séparé multi-pick** (presets + ajout libre), distinct du régime — alimente le prompt IA, aucun effet fonctionnel dans l'app |
| Repas/jour + personnes | **Paramètres IA seuls** — aucun effet sur le contrat .md (5 clés intangibles) |
| Stockage | **Approche A** : `UserProfile` v2 **étendu** (champs optionnels, même clé) + nouvelle clé `sportapp:depenses` |
| Migration | **Pas de re-onboarding** pour les migrés chantier 2 : profil v2 sans ces champs = valide, à compléter à l'écran Profil. Les futurs migrés legacy passent par 5 étapes |
| Dépenses | `{date, magasin, total}` — **upsert par (date, magasin)**, deux magasins le même jour OK, historique trié par date desc + résumé « Par magasin » |
| Boutons | **Sobres** sur ces écrans (`.bsoft` bordure fine + texte basilic, `.blink` lien-texte) — le gros basilic reste réservé au CTA de l'onboarding ; « Enregistrer » du Profil **garde le style pleine largeur v6** (décision utilisateur) |
| Copie IA | Bouton « Copier les paramètres IA » au Profil : bloc texte vers le presse-papiers (Clipboard + fallback), masqué si tout vide |

**Maquette de référence (validée)** : `docs/superpowers/mockups/maison-courses-v2.html` — langage Herbes, interrupteurs d'états du budget (ok / dépassé / sans budget max / rien de saisi) sur l'écran Courses. C'est elle qui fait foi sur le rendu exact ; en cas de divergence avec ce document, elle gagne.

## 1. Modèle de données & stockage

### Types (`src/lib/model.ts`)

```ts
// UserProfile — champs optionnels ajoutés (rétrocompatible profil v2 chantier 2)
export interface UserProfile {
  // …id, dateNaissance, taille, poidsObjectif?, objectif, complements, regime (chantier 2)
  magasin?: string;        // nom libre, trim (ex. « Lidl »)
  budgetMax?: number;      // € / semaine (plafond)
  preferences?: string[];  // types de plats souhaités (presets + libre)
  personnes?: number;      // personnes à table (entier ≥ 1)
  repasJour?: number;      // repas par jour (entier ≥ 1)
}

export interface DepenseEntry {
  date: string;    // AAAA-MM-JJ
  magasin: string; // trim, non vide
  total: number;   // € positif, 2 décimales max
}

// suggestions de la saisie magasin (datalist) — liste ouverte, saisie libre toujours possible
export const MAGASINS_PRESETS: readonly string[] = [
  'Lidl', 'Carrefour', 'Auchan', 'Intermarché', 'Grand Frais',
  'Leclerc', 'Aldi', 'Super U', 'Monoprix', 'Casino',
];
```

### Storage (`src/lib/storage.ts`)

- Clé profil inchangée : `sportapp:profile`. `loadProfile()` : garde v2 du chantier 2 **étendue champ par champ** — un champ optionnel de mauvais type est **ignoré** (retiré du résultat) sans invalider le profil ; les champs requis (id, dateNaissance, taille, objectif) restent requis. `preferences` dédoublonnée à la sauvegarde (trim + insensible casse/accents, même règle que `complements`).
- Nouvelle clé **`sportapp:depenses`** — tableau brut `DepenseEntry[]` (convention `sportapp:weights:*`), trié par date desc :
  - `getDepenses(): DepenseEntry[]` — safeParse + garde de forme **par entrée** (date ISO, magasin non vide, total > 0) ; entrée illégale → rejetée ; tableau entier illégal → warn + remove + `[]` ; clé absente → silencieux.
  - `saveDepense(date, magasin, total)` — **upsert par (date, magasin)** : remplace si la paire existe, sinon ajoute ; re-trie par date desc.
  - `deleteDepense(date, magasin)` — retire la ligne correspondante.

### Contrat .md

**Aucun changement.** La ligne `- budget:` est parsée par le chantier Herbes en `data.budget?: string` — chaîne libre (« ≈ 35 € ») affichée **telle quelle**, jamais re-parsée en nombre.

## 2. Onboarding — 5e étape & Profil

### Onboarding (`src/components/onboarding/Onboarding.tsx`, 4 → 5 étapes)

Étape 5 **« Maison & courses »** :

- **Magasin habituel** — texte libre + **datalist natif** `MAGASINS_PRESETS` (suggestions pendant la frappe), placeholder « Lidl, Intermarché… ».
- **Budget max courses / semaine** (€, optionnel) — hint « Le plafond à ne pas dépasser — l'app compare l'estimé du menu et ce que tu paies vraiment ».
- **Personnes à table** + **Repas par jour** (nombres entiers).
- **Préférences pour les prochains cycles** — chips presets (`Healthy` / `Petit budget` / `Rapide` / `Batch-friendly`) + rangée d'ajout libre (règle compléments : trim, dédoublonnage, 40 caractères max).
- Tout est **optionnel** — « C'est parti ! 🚀 » (pleine largeur basilic, **déplacé ici depuis l'étape 4**) sauve même si tout est vide. Dots ×5.
- Bornes : budgetMax > 0 si rempli (décimal, virgule acceptée via `parseEuro`), personnes/repasJour entiers 1-12, sinon alerte `role="alert"`.

Les utilisateurs migrés par le chantier 2 **ne repassent pas** l'onboarding : profil v2 sans ces champs = profil valide. Les futurs migrés legacy passent par les 5 étapes (étape 5 vierge — la donnée legacy ne contient rien de ces champs).

### `ProfilScreen`

- Nouvelle section **« Maison & courses »** (après Régime, avant Semaine) : mêmes champs (magasin avec le même datalist) + chips retirables + « Enregistrer » **pleine largeur basilic** (style v6 conservé — décision utilisateur).
- Nouvelle section **« Génération IA »** : hint « Ces réglages complètent les “Paramètres” du prompt de génération de cycle » + bouton fantôme « Copier les paramètres IA » + confirmation « Paramètres copiés ✓ ». Bouton masqué si tout est vide (cf. § 4).

## 3. Écran Courses — carte budget & dépenses

Nouveau composant `src/components/cuisine/CoursesBudget.tsx`, rendu dans `CuisineView` au-dessus de `ShoppingList` (onglet courses uniquement). Deux sous-vues internes : la **carte budget** et le **panneau dépenses** (qui remplace la liste quand ouvert, bouton retour chevron + « Retour »).

### Carte « Budget courses »

Titre en petites capitales muted + pill magasin (icône caddie + `profil.magasin`, pill masquée si vide).

Grille 3 colonnes alignées (labels caps 9,5 px au-dessus, valeurs tabulaires 2 décimales) :

1. **Estimé menu** — chaîne `data.budget` telle quelle (« ≈ 35 € ») ; cellule masquée si la ligne est absente du .md.
2. **Payé cette semaine** — somme des dépenses dont la date ∈ [du..au] de la semaine affichée (comparaison par chaînes ISO, pas de parse Date) ; « — » si aucune.
3. **Budget max** — `profil.budgetMax` formaté ; grille 2 colonnes si absent.

Barre + label : seulement si payé ET budget max connus — largeur `min(100 %)`, label « X % du budget » ; si payé > max : barre pleine rouge + « dépassé de X % » en rouge.

**Visibilité** : carte affichée si `data.budget` OU `budgetMax` OU ≥ 1 dépense de la semaine — sinon aucune carte (pas d'écran vide inutile).

Actions (séparées par un filet pointillé) : « + Total payé » (`.bsoft`, ouvre le panneau avec la saisie dépliée et focus total) + « Voir mes dépenses réelles » (`.blink`).

### Panneau « Mes dépenses réelles »

- **Saisie** — 3 champs étiquetés : Date (défaut : aujourd'hui) · Magasin (défaut : `profil.magasin`, même datalist `MAGASINS_PRESETS`) · Total (€, virgule acceptée). Boutons : « Annuler » (lien) + « Enregistrer » (petit basilic 38 px). Total invalide ou date future → alerte. `saveDepense` = upsert (date, magasin) → bump du pattern refresh (même mécanique que `weightsBump`).
- **Par magasin** — une carte par magasin : nom + nb sessions, total, moyenne « ≈ X € / session ». C'est le comparatif Lidl/Intermarché.
- **Historique** — liste triée par date desc : date courte (`formatDayMonth`), magasin, total aligné tabulaire, bouton ✕ de suppression (direct, sans confirmation). Hint « Deux magasins le même jour = deux lignes ».

## 4. Copie paramètres IA & `src/lib/prix.ts`

Bloc copié — une ligne par donnée présente, lignes absentes omises (régime omis si `aucun`) :

```
- Magasin : Lidl
- Budget courses / semaine : 40 €
- Personnes à table : 4 · 3 repas/jour
- Préférences : healthy, petit budget, rapide
- Régime : keto
```

Copie via `navigator.clipboard.writeText` + fallback textarea/execCommand ; confirmation visuelle ; masqué si ni magasin, ni budget, ni personnes/repas, ni préférences (le régime seul ne justifie pas le bloc).

`src/lib/prix.ts` (nouveau, zéro React) :

- `formatEuro(n: number): string` — fr-FR, 2 décimales, « 38,20 € » (utilisé par la carte, le résumé, l'historique).
- `parseEuro(s: string): number | null` — accepte virgule/point/espaces, arrondi 2 décimales, renvoie `null` si invalide ou ≤ 0.

## 5. Validation & erreurs

- `budgetMax` : nombre > 0 (décimal autorisé). `personnes` / `repasJour` : entiers 1-12.
- `preferences` : trim, dédoublonnées (insensible casse/accents), max 40 caractères.
- Dépense : total > 0, date valide **non future**, magasin trim non vide — sinon alerte, rien n'est sauvé.
- Le magasin est stocké tel que saisi (trim) ; le regroupement **« Par magasin » est insensible à la casse** (première graphie rencontrée conservée en libellé).
- Toute donnée corrompue → réparation silencieuse (warn + remove + fallback), **jamais de crash** (règle repo).

## 6. Tests (TDD)

- `tests/storage.test.ts` : dépenses round-trip, upsert (remplace la même paire (date, magasin), deux magasins le même jour), tri desc, entrée corrompue rejetée, clé corrompue → warn + remove + `[]`, suppression. `loadProfile` : champ optionnel bon type conservé, mauvais type ignoré sans invalider le profil, champs requis manquants → `null`.
- `tests/lib/prix.test.ts` (nouveau, miroir) : `formatEuro` fr-FR, `parseEuro` (virgule, point, espaces, invalide → `null`).
- `tests/components.test.tsx` : `CoursesBudget` — 4 états de la carte (ok / dépassé / sans budget max / rien de saisi + estimé absent), « payé » = somme des dépenses de la semaine (hors semaine ignorée), saisie avec préremplissage (date, magasin) et upsert via storage, panneau (par magasin, suppression). Onboarding étape 5 (tout optionnel, chips presets + ajout libre, « C'est parti » en étape 5, dots ×5). `ProfilScreen` — section Maison & courses, bouton copie IA masqué si vide → confirmation si copié. Saisies magasin : attribut `list` branché sur un datalist alimenté par `MAGASINS_PRESETS` (onboarding, profil, dépenses).
- `tests/app.test.tsx` : smoke onglet courses avec la carte rendue (gate inchangé).
- `tests/e2e/` : extension de la couverture courses — storageState avec profil v2 étendu (magasin + budgetMax), saisie d'une dépense → carte mise à jour + historique visible ; 375/320 zéro débordement.

## 7. Fichiers touchés

| Fichier | Action |
|---|---|
| `src/lib/model.ts` | `UserProfile` étendu (5 champs optionnels) + `DepenseEntry` |
| `src/lib/storage.ts` | garde `loadProfile` étendue par champ + `getDepenses` / `saveDepense` / `deleteDepense` |
| `src/lib/prix.ts` | **nouveau** — `formatEuro`, `parseEuro` |
| `src/components/cuisine/CoursesBudget.tsx` | **nouveau** — carte budget + panneau dépenses |
| `src/components/cuisine/CuisineView.tsx` | rendu de `CoursesBudget` au-dessus de `ShoppingList` |
| `src/components/onboarding/Onboarding.tsx` | 5e étape + « C'est parti » déplacé |
| `src/components/ProfilScreen.tsx` | sections « Maison & courses » + « Génération IA » |
| `src/index.css` | styles carte budget (grille, barre, pill magasin), panneau dépenses, boutons sobres (`.bsoft`, `.blink`) |
| `tests/` | miroir complet (cf. § 6) |
| `AGENTS.md` | clé `sportapp:depenses` + shape profil + « onboarding en 5 étapes » (à l'implémentation) |
| `docs/ameliorations.md` | axe 2 marqué traité (matériel reporté vers axe 4) |
| `CHANGELOG.md` | section `[Non publié]` |
| `ai/context/*` | carte budget / boutons sobres si divergence avec design-system |

## 8. Hors périmètre

- **Matériel** (four, multi-cuiseur, blender → filtres recettes/batch) — reporté, sera traité avec l'axe 4.
- Disposition des listes par magasin, scoring/budget par recette — axe 4.
- Appel API IA depuis l'app — axe 6, reste du presse-papier.
- Contrat .md (intouché — la ligne `- budget:` vient du chantier Herbes).

## 9. Vérifications

- `npm test && npm run typecheck && npm run lint && npm run build` verts.
- `npm run e2e` verts (375/320, zéro débordement).
- Parcours manuel : onboarding 5 étapes (tout vide → sauvegarde OK) ; carte budget 4 états ; saisie dépense (upsert + deux magasins même jour) ; suppression ; édition Profil ; copie IA (bloc exact) ; données corrompues → fallback propre.

## 10. Risques

- `data.budget` est une **chaîne libre** : jamais parsée en nombre → pas de comparaison estimé/max automatisée dans la carte (le % ne porte que sur payé/max). C'est assumé (axe 4 pour le scoring).
- Le panneau dépenses remplace la liste de courses : état d'ouverture perdu si l'utilisateur bascule Batch/Menu — acceptable (retour = liste).
- Les migrés chantier 2 ont ces champs vides : la carte n'apparaît qu'avec l'estimé ou après une première saisie — pas d'élément vide inattendu, mais pensez-y aux tests.
- Nouvelle clé `sportapp:depenses` : pas de backward compat nécessaire (donnée inexistante avant) ; tout retour arrière de version l'ignore simplement.
