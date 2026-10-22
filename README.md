# Pickleball Tournaments

A web app for running pickleball tournaments: register as an admin, create a
tournament, set up doubles pool play, generate the match schedule across your
courts, and share one public link where anyone can follow live results and
group standings — no sign-in required.

New to the project? Read [HANDOVER.md](HANDOVER.md) for the concepts,
architecture, decisions, operations runbook and known gotchas.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma** ORM + **PostgreSQL** (Neon / Vercel Postgres in production)
- **Auth.js (NextAuth v5)** — email/password admin accounts
- **Tailwind CSS** — navy blue theme, mobile-first
- **SWR** — polling for live public results

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up a Postgres database and put its connection string in `.env`
   (used by the Prisma CLI) — for local development without installing
   Postgres yourself, you can use Prisma's local dev server:

   ```bash
   npx prisma dev
   ```

   This prints a `postgres://...` connection string — put it in `.env` as
   `DATABASE_URL`. Copy `.env.example` to `.env.local` for the rest of the
   variables (`AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`).

3. Run migrations:

   ```bash
   npx prisma migrate dev
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

## How it works

### Phase 1 — pool play

- An admin registers, creates a tournament, and gets a public link
  (`/t/<slug>`) that anyone can view live, with no login.
- The admin adds courts and enters the total player count — any even
  number from 8 to 96 (doubles). The app picks a power-of-2 number of
  groups (so the bracket in Phase 2 never needs byes) with 3-6 teams per
  group, and spreads the teams across them as evenly as possible — see
  `planGroupSizes` in `src/lib/groupPlanning.ts`. The app automatically
  creates the groups and labels every team (A1–A4, B1–B6, …).
- The admin generates the match schedule: each group plays full round robin,
  matches are distributed across courts (5-team groups are ordered so no team plays twice in a row), and a "round" is one wave of
  matches — a court's next match only becomes the next round once every
  court has a match in the current round.
- Courts are set up in two lists: **group stage courts** (pool play) and
  **elimination courts** (knockout rounds), so e.g. 4 courts for pool play and
  3 for the bracket. Leave the elimination list empty to reuse the group stage
  courts. Group stage courts lock once the schedule is generated; elimination
  courts stay editable until the bracket is generated.
- The admin enters a single game score per match (e.g. 11-7); winners and
  group standings (points, wins/losses, point differential) are computed
  automatically. Best-of-N / multi-set scoring is planned for Phase 4, when
  the admin can configure the match format.
- The public page has two tabs — **Match Results** (with a sub-tab per
  round) and **Group Standings** — both auto-refreshing every few seconds.

### Phase 2 — elimination bracket

- Once every pool match is complete, the admin can generate the elimination
  bracket from a button on the Matches panel.
- The admin chooses how many teams advance when creating the groups (the
  "Teams advancing" dropdown next to the player count). The choices are the
  powers of 2 the groups allow, e.g. 4, 8 or 16 teams for 4 groups — which
  works out to the same number of teams from every group (top 1, 2 or 4).
  Default is the top 2 per group. See `src/lib/advancing.ts`. It can be changed
  from the **Teams advancing** card at any time until the bracket is generated.
- First-round seeding gives all group winners seeds 1..G, second place
  G+1..2G, and so on, then pairs seed s against seed N+1-s (see
  `seedFirstRound` in `src/lib/bracket.ts`), so no team can face an
  opponent they already played in pool play, in round 1.
- Bracket size is always a power of 2 (the group count and the advancing
  count both are), so there's never a need for byes.
- Once every match in a knockout stage (Semifinal, Quarterfinal, Round of
  16) is complete, the app **automatically** generates the next stage by
  pairing consecutive winners in bracket order (`src/lib/bracket-progress.ts`)
  — no extra admin action needed between rounds. When the Semifinal completes,
  it generates *both* the Final (winners) and a 3rd Place match (the two
  semifinal losers play each other). When the Final completes, the
  tournament is marked `COMPLETED` and the champion (and 3rd place, once
  that match is also done) is shown on both the admin and public pages.
  The 3rd Place match doesn't gate tournament completion — only the Final
  does.
- Player names: once groups exist, the admin can enter each team's two
  player names (optional, editable any time). Once set, they show up
  anywhere a team label appears on the public page and in the admin match
  views, e.g. "A1 (John & Jane)" — falling back to just the label
  otherwise.

### Phase 3 — bulk roster + player allocation

- On the Player names panel, the admin can paste the full player roster
  (one name per line — must exactly match the tournament's player count)
  and click **Allocate Players** to pair everyone into teams and assign
  them across all the existing team slots in one action (saves
  immediately; click again anytime to re-shuffle the unseeded players).
  The manual per-team name fields still work for touch-ups afterward
  (fixing a typo, swapping one pair) without re-allocating everyone.
- Optional seeding: alongside the roster, the admin can list player names
  in priority order (first = seed 1). **Seeds never partner each other** —
  every seed gets a team of their own. With exactly 4 groups, seeds fill the
  team rows snake-style: seeds 1-4 go in row 1 (groups A, C, B, D), 5-8 in
  row 2 (D, B, C, A), 9-12 in row 3 (B, D, A, C), and so on, so every group
  has the same seed strength. With any other group count, seeds are spread
  across groups by cycling. Each seed's partner is picked at random from the
  next S unseeded names in roster order (S = number of seeds), so the roster
  order matters: list stronger players first and nobody far down the list is
  paired with a seed. Everyone else is shuffled into the remaining slots.
  See `randomizePairing` in `src/lib/randomizePairing.ts`. Seeding is
  ephemeral — it's only used at the moment Allocate Players is clicked,
  not saved anywhere, so re-allocating later means re-listing the seeds.

### Super admin

One or more accounts can be marked super admin (a database flag, set by hand —
see [HANDOVER.md](HANDOVER.md)). They get a **Users** page listing every admin
account, with the ability to delete accounts (and their tournaments).

Configurable formats (singles/doubles, custom group sizes, round robin
only, choice of scoring format, etc.) are planned for a later phase; see
`prisma/schema.prisma`.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Create a Postgres database (Vercel Postgres or Neon) and set
   `DATABASE_URL` in the Vercel project's environment variables.
3. Set `AUTH_SECRET` (generate with `openssl rand -base64 32`) and
   `NEXT_PUBLIC_APP_URL` (your production URL, e.g.
   `https://tournament.inovatek.app`) in Vercel's environment variables.
4. Run `npx prisma migrate deploy` against the production database (e.g. via
   a Vercel build step or manually) before or during the first deploy.
5. Point your custom domain (`tournament.inovatek.app`) at the Vercel
   project. Each tournament gets its own path-based link
   (`tournament.inovatek.app/t/<slug>`) — no per-tournament subdomain setup
   needed.
