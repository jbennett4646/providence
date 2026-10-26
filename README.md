# Handoff: Providence Home Academy — K–12 classical homeschool platform

## Overview
Providence Home Academy (providence-home.academy) is a classical, parent-led homeschool program. Families teach from daily scripts, on screen or on paper, and the platform keeps their Georgia home-study records: 180 days, 4.5 hours a day, five required subjects, the Declaration of Intent and the annual progress report.

The prototype covers a public marketing site, FAQ, parent dashboard, daily teaching, course manuals, calendar and records. Grade 3 course data is fully loaded: 13 required courses and 2 electives.

**Your job:** turn the proof of concept into a working app.
1. Clean up and wire every interaction end to end.
2. Replace the demo seed data and localStorage with real persistence.
3. Add accounts and sign-in (one parent account per household; student logins from Grade 6).
4. Add Stripe subscriptions.

## About the design files
The files in `design/` are **design references built in HTML**. They are high-fidelity prototypes of the intended look and behavior, not production code. `index.html` is one ~2,700-line file: a template plus a logic class, run by `support.js`, a small in-house runtime.

**Recreate it in a real framework; do not extend `support.js`.** Recommended stack: Next.js (App Router) + TypeScript, Postgres via Prisma or Drizzle, Auth.js or Clerk, and Stripe. Any equivalent is fine.

The course JSON in `design/Grade 3/` **is** production content. Keep its schema, and load it into the database or serve it as static content.

The prototype files referred to here (`design/`) are kept outside this repository; the course JSON now lives in `content/`.

## Fidelity
**High fidelity.** Match the colors, type, spacing and copy exactly. All styling is inline in the prototype; extract it into components and tokens (see Design tokens below).

## Core domain rules (the important part)

### Grades and roles
- **K–5:** fully parent-led. There is no student login; the parent account sees everything.
- **Grade 6+:** students get their own login. In the prototype this is a locked "Student module" screen.
- One subscription covers a **household** (any number of children). A **parish/co-op** plan covers multiple unrelated families: a parish, neighborhood or co-op.

### The academic unit: course → terms → weeks → items
- A year is **36 weeks = 6 terms × 6 weeks**.
- Each child has a **position (week 1–36) per course**, stored as `pos[courseId]`. Example demo seed: `{ latin: 9, literature: 21, spelling: 27, … }`.
- Each course has one or two **tracks** (see `tracks` in the JSON):
  - `daily`: the *Daily core*, `perWeek: 5` items keyed `1`–`5`.
  - `queue`: the *Weekly queue*, `perWeek: 4` items keyed `A`–`D`.
  - Some courses are "split" (both tracks, e.g. Latin I); others have one.
- `orderRules`: strings stating ordering constraints within a week (e.g. "A before B and D; C any time after A"). Enforce them in the UI as soft guidance.
- A week is complete when every item in every track for that week is done. Then `pos` advances.

### Term gates
- At the end of each term (weeks 6, 12, 18, 24, 30, 36) there is a **term check** with a mastery line (e.g. Latin T1: 16 of 20 plus both chants said perfectly). The line is defined in each term's `glance` table, row "Mastery".
- The check is recorded as `gates[courseId][term] = { score, of, pass }`.
- **The next term's manual and content stay locked until the gate passes.** Paper families can't print the next term manual until it passes.

### The floor rule (grade certification)
- Compare **week positions**, never raw item counts. Daily courses (5 items a week) and queue courses (4 a week) must be comparable.
- **A child's certified grade level is set by the slowest required course**, never an average. The dashboard flags that course as **Floor**, and courses well ahead as **Ahead**.
- "Toward Grade N" card: shows the floor course, its progress, the courses still open, and the weeks remaining.
- **Electives (Workshop, Hearth) are optional per child** and are excluded from the floor rule and from grades. They are toggled per child (`electives[childIndex] = [ids]`); turning one on starts its `pos` at 1.

### Progress display
- Show **mastery and completion, never letter grades**. Example label: "Mastered — every scored term check so far met its mastery line".

### Paper vs screen (per child: `modes[childIndex] = 'screen' | 'paper'`)
- **Screen:** the Teaching screen shows course cards in a ledger layout, with separate **Daily core** and **Weekly queue** sections.
  - A **streak** tracks daily practice: `streak['YYYY-MM-DD'] = 'done' | 'sick'`.
  - A **week counter** tracks queue items: `weekDone[weekStartDate] = n`.
- **Paper:**
  - Print the **year plan once**, then each **term manual** as it comes due, gated as above. Track printing in `printed['courseId:plan' | 'courseId:tN' | 'courseId:rN']`.
  - Each week the parent does a **one-tap check-in** per course ("Done" or follow-up), recorded in `checkins[]`.
  - In the prototype, printing is a print-CSS booklet via `printBooklet(docs)`. In production, generate PDFs server-side.

### Georgia compliance (O.C.G.A. § 20-2-690)
- **180 school days**, each **≥ 4.5 hours**.
  - Attendance is stored as `att['YYYY-MM-DD'] = { routine: minutes, extra: [{label, mins}] }`.
  - Records show: total days, average hours, and days under 4½ hours.
- The **five required subjects** map to courses as follows:
  - **Reading:** Literature, Memory Work & Recitation
  - **Language Arts:** Grammar & Composition, Spelling & Vocabulary, Penmanship
  - **Mathematics:** Arithmetic
  - **Social Studies:** History & Geography
  - **Science:** Science
  - Latin, Bible, Fine Arts, PE and Virtue Formation go beyond the requirement.
- **Documents we generate:**
  - **Declaration of Intent:** due within 30 days of starting, then by Sept 1 each year. Prefill it from household and child data; the family signs and files it (online or by mail).
  - **Annual progress report:** prefill it from progress and records; the family keeps it.
  - Not yet built. Generate both as PDFs.
- **Other states:** families anywhere may enroll. Compliance tooling is Georgia-only for now, and the FAQ invites families to request their state. Design the compliance layer as per-state config: required days, hours, subjects and forms.

### Calendar
- The school year starts on the family's start date: `calStart`, demo `2026-08-10`. The calendar lays out 36 school weeks from there.
- School days are set per household. `schoolDays: 'mf'` means Mon–Fri; the alternative is a custom set of days.
- **US federal holidays** are days off by default. The family can choose to teach on one: `holTeach[date] = true`.
- **Family breaks** are a list of `calBreaks: [{id, label, from, to}]`. Seeds: Thanksgiving week, Christmas break, spring break.
- The plan shifts around breaks. Only days actually taught count toward 180.
- **Midyear joining:** the year starts on the day they start. They can enter prior days taught elsewhere so the 180 count is correct. A **placement check per subject** sets each course's starting term.

## Screens
`screen` is the only routing state in the prototype; each value should become a real route. Top bar (46px, `#1F1B15`) nav: Home · Parent · Teaching · Student · Records · FAQ.

1. **Landing** (`landing`, public): hero with a "One nine-year-old, this week" sample, the paideia pillars (I–IV), a curriculum preview, pacing by subject ("Certified through Grade 3"), the seven virtues, and pricing.
   - Household plan: $100/mo. Parish/co-op plan: $500/mo. Tutoring: greyed out, "pricing to come".
   - Footer note: "Per household, not per child. Cancel in any month."
2. **FAQ** (`faq`, public): five groups (Joining, The school day, Records & Georgia law, Other states, Tuition). Each group has a 220px label column and a Q&A column. Copy is final.
3. **Parent dashboard** (`parent`):
   - 238px dark sidebar nav.
   - Child tabs.
   - Subject table: name, grade label, Floor/Ahead badges, progress, term and week.
   - Review cards.
   - A daily Latin *sententia*: rotates daily from a fixed list of 17, and every child sees the same line that day.
   - Week note.
   - "Toward Grade N" floor card.
   - School-year card and attendance card.
   - Electives switches.
4. **Teaching today** (`teaching`): the per-child day.
   - Screen mode: the ledger described above, with lesson steps of kind `read`, `choices` (with an answer and an explanation shown after), `task` (a checklist) and `upload` (a field-notebook photo).
   - Paper mode: print queue, check-ins and term-gate forms.
   - Off days show "a federal holiday / part of a planned break."
5. **Course manual** (`course`): kicker "Grade 3 · Course NN · {child}", then the year plan, Term 1–6 tabs with their weeks, reference pages, and answer keys (toggle `showKeys`). Split courses show "Daily drill · Weekly lesson".
6. **Student module** (`student`): a locked placeholder for Grade 6+.
7. **Calendar** (`calendar`): 36 weeks, holidays and breaks; add or remove a break; "teach on this holiday"; reset.
8. **Records** (`records`): printable attendance, subjects and mastery, Georgia summary.

**Not built yet (design and build):**
- Settings: school days, holidays and flex-day limit, household preferences, children, plan and billing.
- Sign-up, sign-in and onboarding: household → children → grade → placement → start date → paper/screen.
- Declaration of Intent and annual report generation.
- Grades K–2 and 4–12 content (same JSON schema).

## Course data schema (`Grade 3/*.json`)
- **`index.json`:** an array of `{ id, course, dash, file, number }`, in display order (01–15).
- **Course file:** `{ id, course, dash, grade, number, cadence, tracks[], orderRules[], plan, terms[] }`.
  - `tracks[]`: `{ track: 'daily'|'queue', label, perWeek, items: [{ key, label, what, time }] }`
  - `plan`: the year-plan content.
  - `terms[]`: `{ term, title, weeksRange: [start, end], glance: Block[], reference: [{ title, subs, blocks: Block[] }], … weeks and answer keys }`.
  - `Block`: `{ kind: 'p', text }` or `{ kind: 'table', head: [], rows: [[]] }`. Add more kinds as needed.
- Read `Latin I.json` first; it was the verified reference course. Every other course follows the same shape.

## State to persist (prototype key `pa-paper-demo-v2` → database)
Per household:
- children (name, grade, mode, electives)
- `schoolDays`, `calStart`, `calBreaks`, `holTeach`
- plan and subscription

Per child:
- `pos` (week per course), `gates`, `review`, `followUps`
- `att`, `streak`, `weekDone`, `checkins`, `printed`
- `rec`: record notes

Current clean-up issues:
- Demo seeds (`seedAtt`, `seedStreak`, `startPos`, the child "Thomas", hard-coded "today" dates around 2026-10-21) are mixed into the logic. Remove them and derive "today" from the real date.
- The sample `lessons` array in the logic class is placeholder content. Real daily items come from the course JSON.

## Design tokens
**Colors**
- `#1F1B15`: ink. Dark backgrounds and body text.
- `#26221B`: raised dark panel.
- `#2A251D`: dark-panel hover.
- `#EFE7D7`: parchment. Main light background and light text on dark.
- `#F4EDDF`: light header band.
- `#FBF7EF`: card.
- `#E6DCC6`: teaching-screen background.
- `#E5DAC4`, `#DBCFB6`, `#D2C4A8`, `#CFC1A4`, `#C9BB9E`: rules and borders, light to dark.
- `#EDE4D2`: table row divider.
- `#A87C3D`: accent gold (`--pa-accent`). Kickers, numerals, active nav underline.
- `#7B2D26`: deep oxblood (`--pa-deep`). Links, Floor badge. Hover: `#5E211C`.
- `#33503F`: green (`--pa-green`). Ahead and Approved. Badge border: `#A9BEAE`.
- Text greys: `#3E382E`, `#4A4337`, `#5E5648`, `#6B6154`, `#7A7161`, `#8A8071`, `#8C8172`.
- On dark: `#BFB49E` (muted), `#E9DEC6`.

**Type**
- Display and headings: **EB Garamond** 400/500. Hero 54px/1.05, H2 22–29px, letter-spacing −.01em.
- UI and body: **Libre Franklin** 400/500/600. Body 14–16px/1.6–1.7.
- Kickers: 10.5–12px, uppercase, letter-spacing .09–.24em.

**Shape**
- Square corners throughout (radius 0).
- 1px hairline borders, with no shadows except business-card mockups.
- Dashed border = unavailable (e.g. tutoring).
- Layout max widths: 1180px (marketing), 1240px (app), 1000px (FAQ). Side padding 40px.

## Assets
- No raster images.
- The crest is an inline SVG shield with a cross, stroked `#A87C3D` (see `business-card.html`).
- Fonts come from Google Fonts.

## Files
`design/`:
- `index.html`: the full prototype (all screens and logic). The logic class begins around line 1750.
- `support.js`: the prototype runtime. Reference only.
- `Grade 3/`: production course content.

`marketing/`: brand and copy reference. `.dc.html` files render with `support.js` from `design/`.
- Main deck (9 slides).
- Grade 3 parent deck (7 slides).
- Booklet (8 pages).
- Folded card. Its copy is outdated.
- Business card.

## Suggested first tasks for Claude Code
1. Scaffold the app, port the design tokens, and build the layout shell and top nav.
2. Model the data (Household, Child, Enrollment/pos, Gate, AttendanceDay, Break, Checkin) and import the Grade 3 JSON.
3. Port each screen, wiring every button. Remove the demo seeds.
4. Implement the floor rule, term gates, calendar maths and the 180-day / 4.5-hour checks, with unit tests.
5. Add auth, onboarding and Stripe (household $100/mo, parish/co-op $500/mo, cancel any time).
6. Generate the Declaration of Intent and progress report PDFs.
