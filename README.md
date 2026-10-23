# Providence Home Academy

The working app for Providence Home Academy, a classical, parent-led K–12 homeschool platform. It is built from the design handoff in `design_handoff_providence_home_academy/` (read its `README.md` for the domain rules and screens).

- `src/`: the Next.js (App Router) + TypeScript app.
- `design_handoff_providence_home_academy/`: the prototype and production course content (`design/Grade 3/*.json`).
- `site/`: the static prototype demo, published to GitHub Pages by `.github/workflows/static.yml`.

## Develop

```sh
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm test
npm run build
```

## Layout

- `src/app/globals.css`: design tokens (colors, type, layout widths) as CSS custom properties, and the print rules.
- `src/app/layout.tsx`: fonts (EB Garamond and Libre Franklin via `next/font`) and the 46px top bar.
- `src/lib/nav.ts`: top-bar and parent-sidebar navigation, with the active-route rule.
- `src/components/`: `TopNav`, `ParentSidebar`, `MarketingHeader`, `Crest`, `Screen`.

Each prototype `screen` is a route: `/` (landing), `/faq`, `/parent`, `/teaching`, `/course`, `/student`, `/calendar` and `/records`, plus `/settings`. Apart from the shell, screens are placeholders until they are ported.
