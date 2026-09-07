Design rules:

- always extract design tokens (colors, spacing, radius, typography)
- never hardcode repeated values
- group styles into reusable patterns

Component strategy:

- identify reusable components
- split UI into logical blocks
- avoid monolithic components

Spacing:

- use consistent spacing scale
- prefer multiples (4, 8, 16, 24...)

Colors:

- map colors to semantic names (primary, secondary, danger)
- avoid raw hex values in components

Typography:

- define hierarchy (title, subtitle, body)
- maintain consistency

Responsive:

- mobile-first approach
- adapt layout progressively

Tailwind rules:

- prefer utility classes
- extract reusable classes if repeated
- use config (tailwind.config.js) for tokens

UX:

- clear interaction states (hover, focus, active)
- accessible contrast
- intuitive layout

Performance:

- avoid unnecessary wrappers
- keep DOM light
