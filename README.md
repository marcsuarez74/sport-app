# Sport App

Suivi cuisine / diet / sport pour Marc & Mélanie — PWA installable, contenu piloté par un fichier `.md` par semaine.

## Utilisation sur téléphone

1. Ouvrir l'URL de l'app dans le navigateur.
2. L'installer comme application :
   - **iOS** : Safari → bouton **Partager** → **Sur l'écran d'accueil**
   - **Android** : Chrome → **Installer**
3. L'app fonctionne **hors ligne** (service worker + cache).
4. Pour changer de semaine : bouton **« Importer un .md »** puis choisir le fichier de la nouvelle semaine.

## Le fichier .md de la semaine

Chaque semaine est décrite par un fichier Markdown avec frontmatter YAML **obligatoire** :

```markdown
---
semaine: 2026-S39
menu: A
titre: Menu A — Base poulet & bolo
du: 2026-09-21
au: 2026-09-27
---

# Semaine 39

## Courses
### Protéines
- Cuisses de poulet (famille)
- Œufs ×20

## Menu
### Lundi
- dejeuner-marc: Boîte dinde-quinoa (batch dim) + légumes
- dejeuner-melanie: Restes dinde + ½ avocat
- diner-famille: Cuisses poulet rôties + carottes + riz
- diner-melanie: Poulet + légumes rôtis (sans riz)
- batch: Double riz → boîte mardi Marc

## Batch
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
- `## Courses` : une `### Rayon` par sous-section, les items sont des listes `-`.
- `## Menu` : une `### Jour` par jour, chaque repas est une ligne `- clé: texte` avec exactement **5 clés valides** : `dejeuner-marc`, `dejeuner-melanie`, `diner-famille`, `diner-melanie`, `batch`. Une clé inconnue génère un avertissement (non bloquant).
- `## Batch`, puis `## Marc` et `## Melanie` (accents acceptés — `Mélanie` == `Melanie`), chacune avec les sous-sections `### Cibles`, `### Séances`, `### Rappels`.
- Les items `- [ ]` (batch, séances) sont cochables dans l'app.

Exemple canonique complet : [`src/assets/semaine-exemple.md`](src/assets/semaine-exemple.md).

## Développement

```bash
npm install
npm run dev        # serveur de dev
npm test           # tests (vitest)
npm run build      # build de production
npm run preview    # prévisualiser le build
npm run icons      # régénérer les icônes après modification de public/icon-src.svg
```

## Déploiement

L'app est déployée sur **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`).

1. Créer un repo nommé `sport-app` sur GitHub.
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
