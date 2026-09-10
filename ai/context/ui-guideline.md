# UI Guidelines — Rituel

Complète `design-system.md` (les tokens) avec les règles d'usage. Source de vérité : les composants existants dans `src/components/`.

## Règles non négociables

1. **Thème clair unique** — jamais de dark mode, jamais de `prefers-color-scheme`, jamais de media query sombre
2. **Ultra visible** — tout élément interactif ≥ 48 px, tout texte ≥ 4,5:1 de contraste, hiérarchie claire au premier coup d'œil
3. **Fluide** — transitions 0,2 s (interactifs uniquement), `scale(0.97)` à l'activation, jamais de mouvement gratuit
4. **Français** dans toute l'UI (accents corrects : `Mélanie`, `Déjeuner`, `Dîner`)

## Structure d'écran

- `App.tsx` choisit : `Onboarding` (pas de profil) → shell 2 onglets OU écran `ProfilScreen` poussé. **Pas d'écran intermédiaire** : sans semaine en storage, la semaine d'exemple se charge automatiquement (fallback en mémoire dans `App.tsx`)
- Shell : `WeekBanner` (seul `h1`, + icône « Mon profil » à droite) → nav **segmented** sous la bannière (🛒 Cuisine / 🎯 Mon suivi) → vue active
- **Mon suivi est personnalisé** : `ProfileView` rendu avec le profil actif uniquement + accueil « Salut {prénom} 👋 » — jamais les données de l'autre
- Sections = `h3` dans des cartes (`section` + classe sémantique). États vides systématiques (`.muted`)
- Écran poussé (Profil) : bouton retour en haut, pas de nav segmented, sorties par retour ou action explicite

## Onboarding (premier lancement)

- 2 étapes obligatoires, lancées seulement si `sportapp:profile` absent ; style « grand écart fun » : dégradés saturés, émojis géants, CTA plein + **points de progression** en haut
- Étape 1 : deux grandes cartes profil (💪 Marc basilic / 🌿 Mélanie citron, tagline « Diet & sport » / « Keto & sport »)
- Étape 2 : « Salut {prénom} 👋 » + poids/âge/taille + objectifs (poids objectif, kcal/jour) avec bornes (30–250 kg, 10–100 ans, 120–230 cm), erreur inline `role="alert"`, CTA « C'est parti ! 🚀 », « ← Retour » vers l'étape 1
- Submit = `saveProfile` + première pesée datée du jour ; pas de bouton « passer » (l'app est inutilisable sans profil — c'est voulu)
- Accent unique Herbes partout : basilic = action/valeur principale, citron = surbrillance (jamais une couleur de texte)

## Écran Profil

- Mes infos (âge/taille, feedback « enregistrées ✓ » en `role="status"`), **changer de profil** (bordure `--danger`, `window.confirm` obligatoire — efface le choix, garde les données)
- Après changement : retour à l'onboarding (le sous-arbre suivi est démonté, les données restent en storage)

## Onglet Cuisine (Courses / Menu / Batch)

- **Pill du menu** : `.menu-pill` dans la bannière, à côté du `h1` — le menu courant reste visible sur les 3 sous-onglets (toujours un seul `h1`)
- **Menu v2 (réserve de recettes)** : 1 ligne repas = 1 occurrence cochable (`.menu-card`, coche « c'est fait »), aucun jour imposé — le .md reste la source, l'ordre du fichier est conseillé (batch/frigo d'abord, frais en dernier)
- **Fiches recettes dépliables** : état local par carte (plusieurs ouvertes possibles), `aria-expanded` sur le bouton ET sur les chips de bases
- **Tags de profil** : chaque repas porte un tag coloré (Marc / Mé / Famille / Batch) — jamais la couleur seule comme information
- **Courses** : compteurs d'items par rayon (`.rayon-cnt`) et encadré keto dédié en dernier — le rayon `Keto` n'est pas un rayon comme les autres
- **Batch** : rituel = timeline cochable (lignes ≥ 48px, coche barrée comme les checklists), micro-batch = carrousel horizontal (`overflow-x: auto` interne, scrollbar masquée — scroll natif du navigateur, jamais de carrousel JS)

## Composants — conventions

- **Présentatifs et minces** : props descendantes, la logique reste dans `src/lib/`
- **Classes sémantiques** (`.menu-card`, `.checklist`, `.done`) — pas de classes utilitaires, pas de style inline (exception : `style` dimensionnel sur les barres des StatCards)
- **Resynchronisation par prop** : pattern render-phase reset (`syncedSemaine`/`syncedProfile`) — voir `Checklist.tsx`. Interdit : `useEffect` de sync, `key` imposé au consommateur. **Une exception documentée** : `key={weightsBump}` sur `StatCards` dans `App.tsx` (relit les pesées au remount après une pesée ajoutée)
- **Rétrocompatibilité des props** : un composant existant ne change de signature qu'en ajoutant des props optionnelles (ex. `onChecksChange?` de Checklist)

## Formulaires

- Inputs avec `aria-label` explicite (pas de placeholder seul)
- Validation au submit (pas de nag à la frappe) ; erreur = `<p className="error" role="alert">`
- Après un submit valide : vider le champ valeur, conserver la date ; effacer l'erreur affichée

## Feedback utilisateur

- Coche = retour immédiat (état barré) + persistance instantanée en localStorage
- Images de rayons : `loading="lazy"`, `alt` = libellé du rayon (utile si la miniature ne charge pas), fallback `defaut.jpg` pour un rayon inconnu
- Confirmation avant toute action destructive (`window.confirm`)

## Interactions tactiles

- Zone de clic = toute la ligne du label (pas seulement la checkbox)
- Nav segmented : `aria-current="page"` sur l'actif, différenciation visuelle forte (pilule glissante `--surface` + ombre, actif encre vs inactif muted) ; animation = rebond élastique 0,32s (pilule), tuée par `prefers-reduced-motion`
- `:focus-visible` toujours visible (clavier = outline accent) ; `.sr-only` pour les inputs fonctionnellement cachés mais focusables

## À ne PAS faire

- ❌ Couleur hex en dur dans un composant (utiliser les tokens `var(--…)` ; sur basilic → texte blanc `#ffffff`, sur citron → texte encre `#26312b`)
- ❌ Montrer les données de l'autre profil dans Mon suivi
- ❌ Écran intermédiaire avant le contenu (pas de page « importer d'abord » — la semaine d'exemple suffit)
- ❌ Nouveau pattern de sync d'état (celui du repo suffit)
- ❌ Modal custom / lib de composants — `window.confirm` et les cartes suffisent
- ❌ Animations longues (> 0,25 s) ou décoratives
- ❌ Dark mode « parce qu'on peut » (le thème clair Herbes est le seul thème)
