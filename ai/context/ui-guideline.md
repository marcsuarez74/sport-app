# UI Guidelines — sport-app

Complète `design-system.md` (les tokens) avec les règles d'usage. Source de vérité : les composants existants dans `src/components/`.

## Règles non négociables

1. **Dark mode only** — jamais de media query light, jamais de blanc en fond de page
2. **Ultra visible** — tout élément interactif ≥ 48 px, tout texte ≥ 4,5:1 de contraste, hiérarchie claire au premier coup d'œil
3. **Fluide** — transitions 0,2 s (interactifs uniquement), `scale(0.97)` à l'activation, jamais de mouvement gratuit
4. **Français** dans toute l'UI (accents corrects : `Mélanie`, `Déjeuner`, `Dîner`)

## Structure d'écran

- `App.tsx` choisit : `ImportScreen` (pas de semaine) OU shell (bannière + onglets + vue active)
- Bannière = seul `h1` de la page. Sections = `h3` dans des cartes. Profil = `h2`
- Une carte par bloc (`section` + classe sémantique), jamais de div sans rôle
- États vides systématiques et explicites (`.muted`), ex. « Aucune course pour cette semaine. »

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

- ❌ Couleur hex en dur dans un composant (utiliser les tokens `var(--…)`)
- ❌ Nouveau pattern de sync d'état (celui du repo suffit)
- ❌ Modal custom / lib de composants — `window.confirm` et les cartes suffisent
- ❌ Animations longues (> 0,25 s) ou décoratives
- ❌ Light mode « parce qu'on peut »
