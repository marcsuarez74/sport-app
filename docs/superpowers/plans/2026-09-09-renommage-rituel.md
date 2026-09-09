# Renommage « Rituel » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renommer l'app « Sport App » en « Rituel » (nom PWA, titre, package.json, docs) avec une nouvelle icône monogramme « R » disque de fonte — repo/URL/clés storage inchangés.

**Architecture:** Renommage d'affichage : manifest Vite PWA + title HTML + package.json + icône SVG source régénérée via `pwa-assets-generator` + sync des docs (README, AGENTS.md, `ai/`). Un seul commit cohérent. **Prérequis absolu : la branche `feat/nutrigo-redesign` est déjà mergée sur `main`** (le chantier s'exécute sur main, à la racine du repo — PAS dans le worktree).

**Tech Stack:** Vite + vite-plugin-pwa (`pwa-assets-generator --preset minimal-2023`), SVG statique, aucun changement de code applicatif ni de tests (aucune référence au nom dans `tests/` — vérifié `rg "Sport App" tests/` = 0).

**Spéc :** `docs/superpowers/specs/2026-09-09-renommage-rituel-design.md`

**Convention de nommage docs :** une mention qui nomme **l'app** devient « Rituel » ; une mention qui nomme le **chemin/repo** (`/sport-app/`, `sport-app.git`, `github.io/sport-app/`, `base`) reste inchangée.

---

### Task 1: Préconditions — main à jour avec le redesign

**Files:** aucun (vérifications uniquement)

- [ ] **Step 1: Vérifier l'état de main**

Run (à la racine du repo, PAS dans `.worktrees/`):
```bash
git branch --show-current && git status --short && git log --oneline -3
```
Expected: branche `main`, working tree propre (hors `.playwright-mcp/` éventuel, non tracké), et le log contient les commits du redesign (`f9db7ca`…`dfedf53`) ET la spec renommage (`ecf2933`). Si la branche n'est pas encore mergée : STOP, la merger d'abord (cf. fin de session brainstorming) puis reprendre ici.

- [ ] **Step 2: Vérifier que les gates sont vertes sur main post-merge**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 225 tests OK, typecheck OK, lint OK.

---

### Task 2: Nom affiché — manifest, title, package.json

**Files:**
- Modify: `vite.config.ts:14-16`
- Modify: `index.html:13`
- Modify: `package.json:2`

- [ ] **Step 1: vite.config.ts — le manifest**

Remplacer :
```ts
        name: 'Sport App',
        short_name: 'Sport',
```
par :
```ts
        name: 'Rituel — cuisine & sport',
        short_name: 'Rituel',
```

- [ ] **Step 2: index.html — le titre**

Remplacer :
```html
    <title>Sport App</title>
```
par :
```html
    <title>Rituel — cuisine & sport</title>
```

- [ ] **Step 3: package.json — le name**

Remplacer :
```json
  "name": "sport-app",
```
par :
```json
  "name": "rituel",
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npm run typecheck && npm run lint`
Expected: OK (rien ne référence l'ancien nom dans le code).

- [ ] **Step 5: Ne PAS committer encore** — le commit unique arrive en Task 4 (le renommage = un changement cohérent, cf. AGENTS.md).

---

### Task 3: Icône — monogramme « R » disque de fonte

**Files:**
- Modify: `public/icon-src.svg` (remplacement intégral)
- Generated: `public/pwa-*.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png` (via `npm run icons`)

- [ ] **Step 1: Remplacer le contenu intégral de `public/icon-src.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#1b1d24" />
  <circle cx="256" cy="256" r="180" fill="none" stroke="#ffa257" stroke-width="40" />
  <circle
    cx="256"
    cy="256"
    r="180"
    fill="none"
    stroke="#c2e66e"
    stroke-width="40"
    stroke-linecap="round"
    stroke-dasharray="283 848"
    transform="rotate(-90 256 256)"
  />
  <text
    x="256"
    y="340"
    text-anchor="middle"
    font-family="Poppins, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    font-size="230"
    font-weight="800"
    fill="#f9f4f2"
  >R</text>
</svg>
```

Géométrie imposée par la spec : fond `#1b1d24` (rx 112), anneau orange plein r 180 / trait 40 (bord externe = 200 = limite de la zone sûre maskable, PAS PLUS), arc lime ≈ 25 % du cercle (283 / (2π×180 ≈ 1131)), partant de 12 h (rotate -90), ligne arrondie, R blanc `#f9f4f2`.

- [ ] **Step 2: Régénérer les icônes PWA**

Run: `npm run icons`
Expected: `pwa-assets-generator` régénère `public/pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png` (dates de modification fraîches).

- [ ] **Step 3: Vérifier le rendu et le crop maskable**

Run: `npm run build && npm run preview` puis ouvrir `http://localhost:4173/sport-app/` et vérifier :
- Le `<title>` de l'onglet vaut « Rituel — cuisine & sport »
- `fetch('/sport-app/manifest.webmanifest').then(r => r.json()).then(m => m.name + ' / ' + m.short_name)` → « Rituel — cuisine & sport / Rituel »
- `dist/` contient les PNG régénérés
- Montrer `public/pwa-512x512.png` et `public/maskable-icon-512x512.png` à l'utilisateur (le companion visuel peut les afficher côte à côte) : anneau complet visible, arc lime intact, R centré — sur le maskable, rien ne doit être rogné par un crop cercle

Expected: conforme au candidat 2 validé (planche visuelle du brainstorming).

- [ ] **Step 4: Ne PAS committer encore** — commit unique en Task 4.

---

### Task 3bis: Sync des docs

**Files:**
- Modify: `README.md:1` (+ note réinstallation)
- Modify: `AGENTS.md:7`
- Modify: tous les fichiers de `ai/` mentionnant le nom d'app (rg d'abord)

- [ ] **Step 1: README.md — titre**

Remplacer :
```markdown
# Sport App
```
par :
```markdown
# Rituel
```

- [ ] **Step 2: README.md — note réinstallation** (après le blocquote `> Le \`base\` dans \`vite.config.ts\`…`, ligne ~152)

Ajouter :
```markdown
> Septembre 2026 — l'app s'appelle désormais **Rituel**. Sur les téléphones où elle est déjà installée, le nom sous l'icône ne change qu'après une réinstallation (supprimer l'icône, réinstaller depuis le navigateur).
```

- [ ] **Step 3: AGENTS.md — ligne 7**

Remplacer :
```markdown
**Sport App** — PWA React (dark mode only) de suivi cuisine/diet/sport pour Marc & Mélanie. 100 % front, zéro backend :
```
par :
```markdown
**Rituel** — PWA React (dark mode only) de suivi cuisine/diet/sport pour Marc & Mélanie. 100 % front, zéro backend :
```

- [ ] **Step 4: ai/ — toutes les mentions du nom d'app**

Run: `rg -rn "Sport App" ai/` puis pour chaque hit, appliquer la convention (l'app → « Rituel », le chemin/repo → inchangé). Exemples attendus :
- `ai/context/project-architecture.md:5` — « **Sport App** est une PWA… » → « **Rituel** est une PWA… »
- Titres du type `# Design System — sport-app` → `# Design System — Rituel` (ça nomme le projet, pas le chemin)

- [ ] **Step 5: Vérifier qu'il ne reste que les mentions de chemin légitimes**

Run: `rg -in "sport app" index.html vite.config.ts package.json src/ tests/ README.md AGENTS.md ai/`
Expected: 0 occurrence. Run: `rg -n "sport-app" README.md AGENTS.md ai/ vite.config.ts`
Expected: uniquement les références au chemin/repo (`/sport-app/`, `sport-app.git`, `github.io/sport-app/`) — chacune doit rester VRAIE.

---

### Task 4: Gates, commit unique, push

**Files:** (aucun nouveau — commit de tout le renommage)

- [ ] **Step 1: Gates complets**

Run: `npm test && npm run typecheck && npm run lint && npm run build && npm run e2e`
Expected: 225 tests, typecheck, lint, build (sw.js + manifest), e2e 22/22.

- [ ] **Step 2: Vérifier le dist de prod**

Run:
```bash
ls dist/assets/*.png dist/manifest.webmanifest dist/sw.js && rg -o '"name":"[^"]+"|"short_name":"[^"]+"' dist/manifest.webmanifest
```
Expected: PNG à dates fraîches, manifest avec `name: Rituel — cuisine & sport` et `short_name: Rituel`.

- [ ] **Step 3: Commit unique**

```bash
git add vite.config.ts index.html package.json public/ README.md AGENTS.md ai/
git commit -m "feat: renommage Rituel — nom PWA, titre, icône monogramme disque de fonte"
```

- [ ] **Step 4: Push (déclenche le déploiement Pages)**

Run: `git push origin main`
Expected: CI/Deploy verts. Le workflow Deploy rejouera `npm run e2e:preview` sur le build de prod.

---

## Récapitulatif des fichiers

| Action | Fichier |
|---|---|
| Modify | `vite.config.ts`, `index.html`, `package.json`, `public/icon-src.svg` (+ PNG régénérés) |
| Modify | `README.md`, `AGENTS.md`, `ai/context/*.md` (+ prompts `ai/agent/` si mention) |
| Intactes | clés `sportapp:*`, repo, URL Pages, `base`, workflows, tests |
