# Spec — Rotation de menus, convention template & import .md

**Date :** 2026-09-09 · **Statut :** validé en brainstorming (option 1 + changement de semaine depuis l'app, chevrons en bannière)

## Contexte

L'import .md a été retiré de l'UI en septembre (semaine d'exemple auto-chargée) en attendant une convention « template ». Le besoin réel est plus large : la source de contenu (`diet/carnet-recettes-batch-2026-09-02.html` + listes-courses + plan-diet Marc + plan-keto-if Mélanie) est une **rotation de 4 menus** (A/B/C/D) avec batch commun, et l'app n'est utilisée que par Marc & Mélanie. Le jour où les menus lasseront, il faut pouvoir **régénérer le cycle** sans jamais perdre les données de suivi, en gardant toujours la même structure de contenu.

Décisions validées :

- **Unité de génération = le cycle** : une session de prompt produit **4 fichiers .md** (un par semaine, datés), importés **en une seule fois** dans l'app
- **Changement de semaine depuis l'app** : l'app stocke plusieurs semaines, ouvre sur celle qui contient aujourd'hui (roulement implicite), navigation ‹ › dans la bannière
- Template + prompt versionnés dans le repo (`docs/templates/`) ; les .md réels restent **hors repo** (données perso) dans `diet/rotations/`
- Chaque .md porte les **6-7 recettes du menu** + les bases citées ; le carnet HTML reste la source maîtresse des 24 recettes
- La **liste de courses est incluse** dans chaque fichier (rayons du menu + `### Keto`) ; le placard permanent (réassort mensuel) n'est **pas** dans les fichiers hebdo

## 1. Le cycle généré (4 fichiers)

| Fichier | Semaine | Menu |
|---|---|---|
| `2026-S38-menu-b.md` | 2026-09-14 → 2026-09-20 | B — Chili & crémeux |
| `2026-S39-menu-c.md` | 2026-09-21 → 2026-09-27 | C — Budget batch |
| `2026-S40-menu-d.md` | 2026-09-28 → 2026-10-04 | D — Confort budget |
| `2026-S41-menu-a.md` | 2026-10-05 → 2026-10-11 | A — Base poulet & bolo (cycle recommence) |

Nommage : `AAAA-Sxx-menu-{lettre}.md` (tri chronologique naturel). Livraison : `diet/rotations/`. Chaque fichier est **autonome et conforme au contrat .md actuel — le parser ne change pas** :

- Frontmatter : `semaine`, `menu`, `du`, `au` (ISO, lundi→dimanche), `titre`
- `## Courses` : 2-3 rayons (issues des listes-courses du menu) + `### Keto` en dernier (encadré keto permanent, identique chaque semaine)
- `## Menu` : 7 jours `Lundi`→`Dimanche`, les 5 clés, refs `→ slug` vers les recettes du fichier
- `## Batch` : `### Rituel dimanche` (les 6 étapes génériques du carnet, détail ajusté au menu) + `### Micro-batch` (le tableau micro-batch du menu) + 3-5 tâches `- [ ]` du gros batch (parsées, non affichées aujourd'hui — le contrat reste intact)
- `## Recettes` : les recettes du menu, **titres exacts du carnet** (`### R8 · Chili con carne + riz` — le slug du titre = l'id, donc identique d'un fichier à l'autre ; important pour les recettes partagées comme les tacos R5 en A et D), enrichies : `temps`, `kcal`, `proteines`, `glucides`, `lipides`, `score` (0-10, estimations réalistes — le carnet n'a pas les macros), `image` (Unsplash https), `bases`, `- pour 4:`, étapes numérotées, `- mel:`, `- batch:`. **Même recette = mêmes valeurs** partout
- `## Bases` : les bases citées par les recettes du menu
- `## Marc` / `## Melanie` : **copie conforme du template** d'une semaine à l'autre (cibles des plans, séances hebdo à libellés stables, rappels) — seuls les événements de la semaine bougent

## 2. `docs/templates/template-semaine.md`

Squelette d'UNE semaine avec placeholders `{{...}}` et commentaires d'instruction par section. Garantit « toujours le même contenu/formatage ». Le README reste la grammaire fine du format ; le template impose la structure (rayons, 5 clés, rituel, micro-batch, enrichissement recettes, blocs suivi figés).

## 3. `docs/templates/prompt-semaine-ia.md`

Prompt réutilisable (Claude, ChatGPT…) à coller avec les 4 HTML du dossier diet/ en pièces jointes :

- **Paramètres en tête** : n° de semaine de départ + date du lundi, quels menus générer, événements de la période (soirée danse Maëlle, vendredis à deux, vacances…)
- **Process imposé** : dates ISO par semaine → courses du menu + keto → menu 7 jours calé sur les recettes du carnet → rituel + micro-batch → recettes enrichies → suivi = copie du template
- **Règles dures (contrat)** : ids stables (slugs = libellés, jamais retouchés pour une même semaine), zéro ligne hors format (**l'app doit importer avec 0 warning**), refs `→ slug` exacts, recettes partagées avec valeurs identiques
- **Auto-contrôle final** : checklist vérifiée par l'IA avant de rendre les fichiers
- **Sortie** : 4 blocs de code markdown, un par fichier, avec le nom de fichier indiqué

## 4. Garantie « sans perdre les données de suivi »

- Les coches vivent déjà par semaine (`sportapp:checks:{semaine}`) : importer 4 semaines n'écrase rien ; régénérer une même semaine conserve les coches tant que les libellés ne changent pas (règle écrite dans la convention : ne pas retoucher un libellé de coche d'une semaine déjà utilisée)
- Les semaines importées **restent toutes en storage** → historique gratuit

## 5. App — stockage multi-semaines

Nouvelle clé `sportapp:weeks` (les clés existantes sont intactes) :

```
sportapp:weeks = { semaines: { "2026-S38": { raw, data, importedAt }, … } }
```

- `storage.ts` : `loadWeeks()` (safeParse + garde de forme **par entrée** — une semaine corrompue est retirée silencieusement, les autres gardées ; clé absente silencieuse) + `upsertWeek(week)` (même `meta.semaine` → remplace, les autres restent)
- **Migration** : au démarrage, si `sportapp:weeks` absent/vide et `sportapp:week` présent → recopié dans `sportapp:weeks` (la S37 actuelle + ses coches arrivent intactes) ; l'ancienne clé reste en place, non écrite
- `sportapp:checks:*`, `sportapp:weights:*`, `sportapp:profile` : aucun changement

## 6. App — semaine courante & navigation

- `src/lib/weeks.ts` (nouveau, pur, testé) : `semaineCourante(semaines, today)` → 1) la semaine contenant aujourd'hui (`du ≤ jour ≤ au`) ; 2) sinon la prochaine à venir ; 3) sinon la dernière stockée. Tri par `du`.
- `App.tsx` : liste des semaines triée + index courant (état) ; l'import appelle le recalcul auto ; le fallback hors-ligne (semaine d'exemple en mémoire) reste inchangé
- `WeekBanner` : chevrons ‹ › autour du titre — boutons ≥ 48 px, `aria-label` « Semaine précédente / Semaine suivante », **masqués s'il n'y a qu'une semaine**, navigation en **session** (on ouvre l'app → semaine du jour ; on referme → retour à l'auto, rien de persisté pour la navigation) ; pill menu + dates suivent le fichier affiché

## 7. App — import groupé

`ImportButton` restauré dans `ProfilScreen` (section « Semaine ») :

- Input `multiple` : les 4 fichiers d'un coup → stockage de chacun, résumé « N semaines importées » + compte de warnings
- Un fichier invalide (frontmatter) → erreur **nominative** (nom du fichier), les autres sont quand même importés
- Semaines déjà présentes → **un seul** confirm « Remplacer : 2026-S38, 2026-S39 ? » avant écrasement
- Confirmation native conservée (window.confirm — fiable en PWA standalone ; un écran dédié est possible plus tard si elle agace)

## Hors périmètre

- Statistiques % vs semaine passée / tendances (nécessiterait l'itération « historique » — le stockage multi-semaines la prépare)
- Édition des semaines dans l'app, sync multi-appareils, notifications
- Renommage repo / URL Pages
- Le placard permanent dans les fichiers hebdo (documenté dans la convention, hors .md)

## Tests (TDD)

- `storage.test.ts` : `loadWeeks`/`upsertWeek` (ajout, remplacement même semaine, préservation des autres), migration depuis `sportapp:week`, corruption → réparation silenciée par entrée, clé absente silencieuse
- `weeks.test.ts` (nouveau) : les 3 règles de sélection + bordures (jour = du, jour = au, gap entre semaines, liste vide)
- `components.test.tsx` : WeekBanner (chevrons naviguent, masqués à 1 semaine, aria-labels), ImportButton (multiple : 2 valides → stockées + résumé ; 1 invalide → erreur nominative + les valides importées ; même semaine → confirm)
- `app.test.tsx` : import du cycle → la bannière affiche la semaine du jour ; chevrons → les 3 onglets suivent la semaine affichée
- `tests/e2e/` : fixtures .md (mini-semaines fictives) + `setInputFiles`, navigation, **zéro débordement horizontal 320/375** (les chevrons dans la bannière = point de vigilance)

## Vérifications

- `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e` — tout vert
- Dogfooding : le cycle S38→S41 généré **via le prompt** s'importe avec **0 warning** dans l'app (validation de la convention par l'usage réel)
- `npm run build && npm run preview` avant commit

## Risques

- **Densité de la bannière à 320 px** (chevrons + titre + pill) : flex-wrap + `min-width: 0` + troncature du titre, vérifié par e2e overflow
- **URLs Unsplash générées par l'IA** potentiellement mortes : l'app affiche déjà le fallback dégradé/emoji — acceptable ; à l'usage, remplacer par des URLs vérifiées
- **Régénération d'une semaine en modifiant un libellé de coche** → perte de l'état de cette coche seule (comportement documenté dans la convention, pas de garde technique — hors scope)
- Le confirm natif en PWA standalone fonctionne (iOS/Android) — revue UX possible plus tard (option B « écran dédié »)
