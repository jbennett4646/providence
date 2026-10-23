# Developing Providence Home Academy

The working app for Providence Home Academy, a classical, parent-led K–12 homeschool platform. It is built from the design handoff in `design_handoff_providence_home_academy/` (the root `README.md` is the handoff brief, with the domain rules and screens).

- `src/`: the Next.js (App Router) + TypeScript app.
- `design_handoff_providence_home_academy/`: the prototype and production course content (`design/Grade 3/*.json`).
- `site/`: the static prototype demo, published to GitHub Pages by `.github/workflows/static.yml`.

## Develop

```sh
npm install
npm run db:setup   # apply migrations and import the course catalog
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm test
npm run build
```

Without `DATABASE_URL`, development uses an embedded Postgres (PGlite) stored in `.data/`, so nothing else needs installing. Set `DATABASE_URL` (see `.env.example`) to use a real Postgres; production requires it. Tests run on an in-memory PGlite; set `TEST_DATABASE_URL` to run the database tests against a real Postgres, as CI does.

## Data

- **Course content** is static and versioned with the code: `content/grade-N/` holds `index.json` and one file per course, in the handoff's schema (copied from `design_handoff_providence_home_academy/design/Grade 3/`). `src/lib/content/` loads and validates it; `content.test.ts` checks every file's structure.
- **Database** (Postgres via Drizzle): `src/db/schema.ts` defines households, children, enrollments (each child's week per course), term checks, item records, attendance, streak, check-ins, printed booklets, family breaks and holidays taught. A `courses` catalog is imported from the content by `npm run db:setup`.
- After changing `schema.ts`, run `npm run db:generate` to write a migration to `drizzle/`, and commit it. CI fails if the schema and migrations disagree.

## Layout

- `src/app/globals.css`: design tokens (colors, type, layout widths) as CSS custom properties, and the print rules.
- `src/app/layout.tsx`: fonts (EB Garamond and Libre Franklin via `next/font`) and the 46px top bar.
- `src/lib/nav.ts`: top-bar and parent-sidebar navigation, with the active-route rule.
- `src/components/`: `TopNav`, `ParentSidebar`, `MarketingHeader`, `Crest`, `Screen`.
- `src/lib/content/`: the course content loader, schema and year arithmetic (weeks, terms, gate weeks).
- `src/db/`: schema, connection, catalog import and household queries.

Each prototype `screen` is a route: `/` (landing), `/faq`, `/parent`, `/teaching`, `/course`, `/student`, `/calendar` and `/records`, plus `/settings`. Apart from the shell, screens are placeholders until they are ported.
