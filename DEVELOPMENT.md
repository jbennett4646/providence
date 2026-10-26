# Developing Providence Home Academy

The working app for Providence Home Academy, a classical, parent-led K–12 homeschool platform. It was built from a design handoff (a prototype and brief, kept outside the repository); the root `README.md` is that brief, with the domain rules and screens.

- `src/`: the Next.js (App Router) + TypeScript app.

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

- **Course content** is static and versioned with the code: `content/grade-N/` holds `index.json` and one file per course, in the handoff's schema. `src/lib/content/` loads and validates it; `content.test.ts` checks every file's structure.
- **Database** (Postgres via Drizzle): `src/db/schema.ts` defines households, children, enrollments (each child's week per course), term checks, item records, attendance, streak, check-ins, printed booklets, family breaks and holidays taught. A `courses` catalog is imported from the content by `npm run db:setup`.
- After changing `schema.ts`, run `npm run db:generate` to write a migration to `drizzle/`, and commit it. CI fails if the schema and migrations disagree.

## Layout

- `src/app/globals.css`: design tokens (colors, type, layout widths) as CSS custom properties, and the print rules.
- `src/app/layout.tsx`: fonts (EB Garamond and Libre Franklin via `next/font`) and the 46px top bar.
- `src/lib/nav.ts`: top-bar and parent-sidebar navigation, with the active-route rule.
- `src/components/`: `TopNav`, `ParentSidebar`, `MarketingHeader`, `Crest`, `Screen`.
- `src/lib/content/`: the course content loader, schema and year arithmetic (weeks, terms, gate weeks).
- `src/db/`: schema, connection, catalog import and household queries.

## Screens

Each prototype `screen` is a route:

- Public: `/` (landing), `/faq`, `/student` (locked until Grade 6).
- `/start`: sign-up and onboarding: household and parent account → children and grades → placement (each course's starting term, electives) → first day and days taught elsewhere → screen or paper. This replaces the prototype's demo seeds.
- `/sign-in`, `/forgot`, `/reset`: parents sign in with email, students (Grade 6+) with a username.
- `/billing`: plans, Stripe Checkout and the billing portal, and joining a parish or co-op by invite code.
- `/records/forms`: the state forms. The details the Declaration of Intent needs (instructing parent, home-study address and county, each child's date of birth), the parent's assessment per required subject for the annual progress report, and the date the declaration was filed. The PDFs come from `/api/forms/declaration` and `/api/forms/report?child=…`.
- `/parent` (dashboard), `/teaching`, `/course/[courseId]` (manuals; `?tab=0` year plan, `?tab=1..6` terms, `&item=glance|refN|wN|afterN`), `/calendar`, `/records` (`?tab=log|portfolio|transcript`), `/settings`.
- `/print?child=…&docs=3:latin:plan,3:latin:t1`: a booklet laid out for printing, which records the booklets as printed.

## State forms

`src/server/forms/` builds the Declaration of Intent and the annual progress report from the record (`model.ts`) and renders them server-side with `@react-pdf/renderer` (`pdf.tsx`), embedding EB Garamond and Libre Franklin from `assets/fonts/` (SIL Open Font License; the licence files are alongside). The Georgia rules (due dates, the 12-month school year, ages, what the declaration must list) are in `src/lib/domain/forms.ts`. Other states get the progress report organised by Georgia's five subjects until their own rules are added to `compliance.ts`.

## Grade guides

A guide is reading for the parent that sits beside a grade's courses without being one: it has no position, no floor rule and no term check. Each is a JSON file in `content/grade-N/guides/`, validated by `src/lib/content/guide.ts` (paragraphs with `**bold**` and `*italic*`, lists, tables, the two-week plan, question groups, the answer sheet and key) and listed in `GUIDES` there. The first is Grade 3 Test Readiness (`test-readiness.json`), converted from the academy's Word document with only "Providence Academy" changed to "Providence Home Academy".

- `/guides/grade-3/test-readiness` shows it to signed-in families, with the answer key behind the same switch as the manuals, and it is linked from each Grade 3 course's manual picker.
- `/api/guides/grade-3/test-readiness` is the printable booklet (`src/server/guides/pdf.tsx`). EB Garamond has no ⅕, so every vulgar fraction is set in a small subset of DejaVu Serif (`assets/fonts/DejaVuSerif-Fractions.ttf`, licence alongside). Keep `lineHeight` off the `Page` style: react-pdf re-multiplies an inherited line height on every page for the fixed page-number footer until the number overflows.
- On Teaching, the plan follows the **school calendar**, not course positions (`src/lib/domain/readiness.ts`): the calendar's planned days split into 36 school weeks, a reminder to order the test from week 30, one 15–20 minute session a day in weeks 34–35 (ten in all, taken in order; each adds 18 minutes to the day's attendance), and the test in week 36. On paper, the check-in has a "Week done" row and the usual day counts the practice. Sessions are in `guide_sessions`; the date the test was given (only the date, never scores) is in `test_records`.
- Georgia's testing rule (a national standardized test at the end of Grades 3, 6, 9 and 12, results kept by the family) is `GEORGIA.testing` in `compliance.ts`, shown in the Records summary, on the State forms page, on the dashboard's Reporting card and on the annual progress report.

## Accounts and billing

- One parent account per household; from Grade 6 a child can have a student login (Settings), which sees only `/student`.
- Passwords are hashed with scrypt; sessions are random tokens in an httpOnly cookie, stored hashed (`src/server/auth/`). Password-reset links last two hours and work once. Failed sign-ins are rate-limited per login in memory (per server).
- Email goes through Resend when `RESEND_API_KEY` is set, otherwise to the server log (`src/server/mail.ts`).
- Billing is off until `STRIPE_SECRET_KEY` is set; then a household needs an active plan (or its parish's) to open the app. To set it up:
  1. `STRIPE_SECRET_KEY=sk_test_… npm run stripe:setup` creates the $100 and $500 monthly prices and prints `STRIPE_PRICE_HOUSEHOLD` and `STRIPE_PRICE_PARISH`.
  2. In Stripe, add a webhook endpoint at `<SITE_URL>/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.*`, and set `STRIPE_WEBHOOK_SECRET`.
  3. Turn on the customer portal in Stripe (Settings → Billing → Customer portal) so families can change cards and cancel.
- The parish plan's household gets an invite code (shown on its billing page); up to 25 households join with it and are covered while that plan is active.

See `.env.example` for every variable.

## Where the logic lives

- `src/lib/domain/`: pure, tested rules: dates, federal holidays, the 180-day calendar, course helpers and mastery lines, term-check transitions and term locking, the floor rule, attendance, the streak, the daily sententia, and per-state compliance config (`compliance.ts`, Georgia only for now).
- `src/server/mutations.ts`: every change as a database operation (recording items, undo, term checks, review weeks, paper check-ins, attendance, calendar, settings). `src/app/actions.ts` wraps each as a server action that checks the child belongs to the household.
- `src/server/teaching.ts`, `views.ts`, `state.ts`: what each screen shows, built from the record and the course content.
