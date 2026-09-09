Design rules:

- always extract design tokens (colors, spacing, radius, typography)
- never hardcode repeated values
- group styles into reusable patterns

Project constraints (sport-app — override any generic habit):

- dark mode ONLY, no light theme, no prefers-color-scheme logic
- plain CSS in a single file (src/index.css), semantic classes — NO Tailwind, no CSS-in-JS
- tokens live as CSS variables on :root — map every color/spacing/radius to var(--token)
- touch targets >= 48px, contrast >= 4.5:1 ("ultra visible" is a product requirement)
- texts in French

Component strategy:

- identify reusable components
- split UI into logical blocks
- avoid monolithic components

Spacing:

- use consistent spacing scale
- prefer multiples (4, 8, 16, 24...)

Colors:

- map colors to semantic CSS variables (see ai/context/design-system.md)
- avoid raw hex values in components (dark text #272932 on light accent fills is the one accepted literal, per design-system.md)

Typography:

- define hierarchy (h1 22px/600, h2 20px/600, h3 17px/600, body 16px, font Poppins 400/500/600/700)
- maintain consistency

Responsive:

- mobile-first, content capped at 560px
- respect iOS safe areas (env(safe-area-inset-*))

UX:

- clear interaction states (hover, focus, active)
- accessible contrast
- transitions 0.2s on interactive elements only + prefers-reduced-motion kill switch

Performance:

- avoid unnecessary wrappers
- keep DOM light
