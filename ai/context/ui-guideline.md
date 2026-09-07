# UI Guidelines — sport-app

Complète `design-system.md` (les tokens) avec les règles d'usage. Source de vérité : les composants existants dans `src/components/`.

## Règles non négociables

1. **Dark mode only** — jamais de media query light, jamais de blanc en fond de page
2. **Ultra visible** — tout élément interactif ≥ 48 px, tout texte ≥ 4,5:1 de contraste, hiérarchie claire au premier coup d'œil
3. **Fluide** — transitions 0,2 s (interactifs uniquement), `scale(0.97)` à l'activation, jamais de mouvement gratuit
4. **Français** dans toute l'UI (accents corrects : `Mélanie`, `Déjeuner`, `Dîner`)

## Structure d'écran

- `App.tsx` choisit : `Onboarding` (pas de profil) → `ImportScreen` (profil mais pas de semaine) → shell 2 onglets OU écran `ProfilScreen` poussé
- Shell : `WeekBanner` (seul `h1`, + icône « Mon profil » à droite) → `TabBar` (🛒 Cuisine / 🎯 Mon suivi) → vue active
- **Mon suivi est personnalisé** : `ProfileView` rendu avec le profil actif uniquement + accueil « Salut {prénom} 👋 » — jamais les données de l'autre
- Sections = `h3` dans des cartes (`section` + classe sémantique). États vides systématiques (`.muted`)
- Écran poussé (Profil) : bouton retour en haut, pas de tabbar, sorties par retour ou action explicite

## Onboarding (premier lancement)

- 2 étapes obligatoires, lancées seulement si `sportapp:profile` absent ; style « grand écart fun » : dégradés saturés, émojis géants, CTA plein + **points de progression** en haut
- Étape 1 : deux grandes cartes profil (💪 Marc orange / 🌿 Mélanie vert, tagline « Diet & sport » / « Keto & sport »)
- Étape 2 : « Salut {prénom} 👋 » + poids/âge/taille avec bornes (30–250 kg, 10–100 ans, 120–230 cm), erreur inline `role="alert"`, CTA « C'est parti ! 🚀 », « ← Retour » vers l'étape 1
- Submit = `saveProfile` + première pesée datée du jour ; pas de bouton « passer » (l'app est inutilisable sans profil — c'est voulu)
- Le fond de l'étape 2 se teinte de la couleur choisie (`data-profile` local sur `.onboarding`)

## Écran Profil

- Mes infos (âge/taille, feedback « enregistrées ✓ » en `role="status"`), importer un autre .md, **changer de profil** (bordure `--danger`, `window.confirm` obligatoire — efface le choix, garde les données)
- Après changement : retour à l'onboarding, `data-profile` retiré de `<html>`

## Composants — conventions

- **Présentatifs et minces** : props descendantes, la logique reste dans `src/lib/`
- **Classes sémantiques** (`.menu-day`, `.checklist`, `.done`) — pas de classes utilitaires, pas de style inline (exception : `style` dimensionnel sur le SVG Sparkline)
- **Resynchronisation par prop** : pattern render-phase reset (`syncedSemaine`/`syncedProfile`) — voir `Checklist.tsx`. Interdit : `useEffect` de sync, `key` imposé au consommateur
- **Rétrocompatibilité des props** : un composant existant ne change de signature qu'en ajoutant des props optionnelles (ex. `onChecksChange?` de Checklist)

## Formulaires

- Inputs avec `aria-label` explicite (pas de placeholder seul)
- Validation au submit (pas de nag à la frappe) ; erreur = `<p className="error" role="alert">`
- Après un submit valide : vider le champ valeur, conserver la date ; effacer l'erreur affichée

## Feedback utilisateur

- Coche = retour immédiat (état barré) + persistance instantanée en localStorage
- Import : erreurs bloquantes en `role="alert"` (l'ancienne semaine survit), avis ambre `.warn-line` pour les lignes ignorées, `role="status"`
- Confirmation avant remplacement d'une semaine différente (`window.confirm`)

## Interactions tactiles

- Zone de clic = toute la ligne du label (pas seulement la checkbox)
- Onglets : `aria-current="page"` sur l'actif, différenciation visuelle forte (pill + barre accent par onglet)
- `:focus-visible` toujours visible (clavier = outline accent) ; `.sr-only` pour les inputs fonctionnellement cachés mais focusables

## À ne PAS faire

- ❌ Couleur hex en dur dans un composant (utiliser les tokens `var(--…)` ; texte blanc sur fond coloré → `--accent-strong`)
- ❌ Montrer les données de l'autre profil dans Mon suivi
- ❌ Nouveau pattern de sync d'état (celui du repo suffit)
- ❌ Modal custom / lib de composants — `window.confirm` et les cartes suffisent
- ❌ Animations longues (> 0,25 s) ou décoratives
- ❌ Light mode « parce qu'on peut »
