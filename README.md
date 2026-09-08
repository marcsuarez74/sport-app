# Sport App

Suivi cuisine / diet / sport pour Marc & Mélanie — PWA installable, livrée avec une semaine d'exemple prête à cocher.

## Utilisation sur téléphone

1. Ouvrir l'URL de l'app dans le navigateur.
2. L'installer comme application :
   - **iOS** : Safari → bouton **Partager** → **Sur l'écran d'accueil**
   - **Android** : Chrome → **Installer**
3. L'app fonctionne **hors ligne** après la première visite (le service worker est installé à ce moment-là).

> **Note** : l'import de fichier `.md` est momentanément retiré de l'app (il reviendra avec une future convention « template »). La semaine d'exemple se charge automatiquement au premier lancement. Le format décrit ci-dessous reste le contrat de référence.

## Le fichier .md de la semaine (contrat de référence)

Chaque semaine est décrite par un fichier Markdown avec frontmatter YAML **obligatoire**. Extrait du fichier d'exemple (les blocs `## Recettes`, `## Bases`, `### Keto`, `### Rituel dimanche` et `### Micro-batch` sont optionnels) :

```markdown
---
semaine: 2026-S37
menu: A
titre: Menu A — Base poulet & bolo
du: 2026-09-07
au: 2026-09-13
---

# Semaine 37

## Courses
### Protéines
- Cuisses de poulet (famille)
- Œufs ×20
### Keto
- Avocats ×3-4
- Chocolat noir ≥ 85 %

## Menu
### Lundi
- dejeuner-marc: Boîte dinde-quinoa (batch dim) + légumes
- dejeuner-melanie: Restes dinde + gratin courgettes + ½ avocat
- diner-famille: Cuisses poulet rôties + carottes/patates douces + riz → R1
- diner-melanie: Poulet + légumes rôtis + filet huile d'olive (sans riz/patate douce)
- batch: Double riz + légumes rôtis → boîte mardi Marc

## Recettes
### R1 · Cuisses de poulet rôties + légumes + riz
temps: 45 min · four 200°
kcal: 680
proteines: 48
- pour 4: 6-8 cuisses · 600 g carottes · 600 g patates douces · 250 g riz · huile, paprika, thym
1. Four 200°. Cuisses : huile + sel + paprika + thym, dans un plat avec les légumes en gros dés.
2. Filet d'huile sur les légumes, four 40-45 min (retourner à mi-parcours).
3. Riz en parallèle — cuire en double (boîte).
- mel: pas de riz ni patate douce : poulet + légumes rôtis + filet d'huile d'olive
- batch: double riz + légumes → boîte de mardi

## Bases
### B4 · Vinaigrette minute
3 c.à.s huile d'olive + 1 moutarde + jus d'½ citron + sel. Le pot de 3 jours se garde au frigo.

## Batch
### Rituel dimanche
- 0-5 min · Four à 180° — egg muffins ×10 lancés, on fait le reste
- 5-30 min · Cuissons en double — dîner du soir ×2 + féculent ×2 → boîte lundi

### Micro-batch
- lundi: doubler le plat (boîtes mar/mer)
- mardi: doubler la sauce + courgettes en julienne (5 min le soir)

- [ ] Egg muffins ×10
- [ ] Doubler dinde + quinoa → boîte lundi Marc

## Marc
### Cibles
- 2 450 kcal std · 2 750 sortie · 2 300 repos
### Séances
- [ ] Lundi — Muscu libre 10h30
### Rappels
- Pesée lun/mer/ven à jeun → moyenne hebdo

## Melanie
### Cibles
- 1 450-1 500 kcal · protéines 110 g
### Séances
- [ ] Lundi — Danse 21h
### Rappels
- Jeûne matin : eau · café noir · thé uniquement
```

Règles du format :

- **Frontmatter requis** : `semaine`, `menu`, `du`, `au` (le `titre` est optionnel).
- `## Courses` : une `### Rayon` par sous-section, les items sont des listes `-` ; un rayon `### Keto` est rendu en **encadré dédié** (en fin de liste).
- `## Menu` : une `### Jour` par jour, chaque repas est une ligne `- clé: texte` avec exactement **5 clés valides** : `dejeuner-marc`, `dejeuner-melanie`, `diner-famille`, `diner-melanie`, `batch`. Une clé inconnue génère un avertissement (non bloquant). Une référence `→ R1` en fin de ligne lie le repas à une recette de `## Recettes` (fiche dépliable dans l'app).
- `## Recettes` (optionnel) : une `### R1 · Nom` par recette, avec `temps:`, `kcal:`, `proteines:`, `bases: B4, B6` (renvois vers `## Bases`), la liste d'ingrédients `- pour 4: …`, les étapes numérotées `1. …` et les adaptations `- mel: …` / `- batch: …`.
- `## Bases` (optionnel) : une `### B4 · Nom` par base + un texte court (technique réutilisable).
- `## Batch` : la checklist `- [ ]`, plus deux blocs optionnels — `### Rituel dimanche` (étapes `- <créneau> · <label> — <détail>`, cochables en timeline) et `### Micro-batch` (`- jour: quoi`, carrousel horizontal).
- Puis `## Marc` et `## Melanie` (accents acceptés — `Mélanie` == `Melanie`), chacune avec les sous-sections `### Cibles`, `### Séances`, `### Rappels`.
- Les items `- [ ]` (batch, rituel, séances) sont cochables dans l'app.
- **Ids de coches stables**, dérivés du contenu : `courses:…`, `batch:…`, `batch:rituel:…`, `seances:…` — renommer un item = perdre son état coché.
- **Rétrocompatible** : une semaine v1 (sans Recettes/Bases/Rituel/Micro-batch) s'affiche comme avant — les blocs optionnels n'apparaissent que s'ils existent.

Exemple canonique complet : [`src/assets/semaine-exemple.md`](src/assets/semaine-exemple.md).

> **Entretien de la sample** : tant qu'il n'y a pas de convention template, `semaine-exemple.md` reste alignée sur la semaine courante (S37 au 08/09/2026). Pour la rafraîchir, bump en lockstep : frontmatter + `# Semaine` de la sample, `tests/parse.test.ts` (describe « sample réelle »), `tests/app.test.tsx`, `tests/profil-screen.test.tsx` et `tests/e2e/{onboarding-mobile,dock}.spec.ts` — cf. le commentaire en tête de ce describe dans `tests/parse.test.ts`.

## L'écran Cuisine

Trois sous-onglets partagés (🛒 Courses · 📅 Menu · 📦 Batch) :

- **Bannière** : le menu courant (« Menu A ») reste visible en pill à côté du titre de semaine.
- **Menu** : le jour courant passe en tête (badge « Aujourd'hui »), les jours passés sont regroupés à la fin (badge « Passé », atténués) ; chaque repas porte un tag de profil (Marc / Mé / Famille / Batch) et une référence `→ R1` ouvre la **fiche recette** (une seule ouverte à la fois).
- **Fiches recettes** : temps, kcal/protéines, ingrédients « pour 4 », étapes, adaptation keto de Mé et rappel batch ; les bases référencées (B4, B6…) sont cliquables et affichent la technique.
- **Courses** : compteurs d'items par rayon, et le rayon `### Keto` devient un encadré dédié en fin de liste.
- **Batch** : le rituel du dimanche s'affiche en **timeline cochable**, le micro-batch en **carrousel** horizontal par jour.

## Développement

```bash
npm install
npm run dev        # serveur de dev
npm test           # tests unitaires (vitest) — 190 verts
npm run e2e        # tests navigateur (Playwright, mobile 375/320) — 11 specs × 2 mobiles, 22 verts
npm run build      # build de production
npm run preview    # prévisualiser le build
npm run icons      # régénérer les icônes après modification de public/icon-src.svg
```

## Déploiement

L'app est déployée sur **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`).

1. Créer un repo nommé `sport-app` sur GitHub. Il doit être **public** : GitHub Pages gratuit n'est disponible que pour les repos publics (les repos privés nécessitent un plan payant).
2. Pousser le code :

   ```bash
   git remote add origin git@github.com:<user>/sport-app.git
   git push -u origin main
   ```

3. Sur GitHub : **Settings → Pages → Source: GitHub Actions**.
4. Chaque push sur `main` reconstruit et déploie. URL : `https://<user>.github.io/sport-app/`.

> Le `base` dans `vite.config.ts` vaut `/sport-app/` — à mettre à jour si le repo est renommé.

## Données

- **Tout est stocké en local sur le téléphone** (localStorage) — aucun serveur, aucune donnée envoyée.
- Les **pesées sont stockées par profil** : importer un nouveau fichier de semaine différent ne les remet pas à zéro.
- Les **coches** (courses, batch, séances) sont réinitialisées à chaque nouvelle semaine.
