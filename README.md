# Pickleball Tournaments

A web app for running pickleball tournaments: register as an admin, create a
tournament, set up doubles pool play, generate the match schedule across your
courts, and share one public link where anyone can follow live results and
group standings — no sign-in required.

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

## How it works (Phase 1)

- An admin registers, creates a tournament, and gets a public link
  (`/t/<slug>`) that anyone can view live, with no login.
- The admin adds courts and enters the total player count (must be a
  multiple of 8 — doubles, 4 teams of 2 players per group). The app
  automatically creates groups and labels every team (A1–A4, B1–B4, …).
- The admin generates the match schedule: each group plays full round robin,
  matches are distributed across courts, and a "round" is one wave of
  matches — a court's next match only becomes the next round once every
  court has a match in the current round.
- The admin enters full set scores per match; winners and group standings
  (points, wins/losses, point differential) are computed automatically.
- The public page has two tabs — **Match Results** (with a sub-tab per
  round) and **Group Standings** — both auto-refreshing every few seconds.

Player names, the elimination bracket, and configurable formats
(singles/doubles, custom group sizes, round robin only, etc.) are planned
for later phases; see the schema (`prisma/schema.prisma`) and
`MatchStage` enum, which already anticipate the knockout rounds.

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
