# Profile tooling

- Edit `content.json` for profile copy, stack, and certifications.
- Edit `tokens.mjs` for the shared design colors.
- Vector logo sources live in `icons/` and are embedded by the generator.
- `npm run build` regenerates the desktop/mobile SVGs, README, and local previews.
- `npm run check` validates generated content, layout, contrast, vector assets, and accessibility rules.
- Fonts are vendored in `fonts/`; their OFL licenses are stored beside them.
- Technology icons are adapted from Devicon; its MIT license is stored in `icons/`.
- Preview renders are local-only under `preview/`.
- Do not commit reference images.
