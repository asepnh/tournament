# Handover Guide

For a developer (or future you) picking this project up cold. `README.md` covers
setup and features at a glance; this document explains **how the app thinks**,
why it was built this way, how to operate it, and what will bite you.

## 1. What this is

A web app for running **doubles pickleball tournaments**. An organizer ("admin")
registers, creates a tournament, and the app builds pool play, then a knockout
bracket. Anyone with the tournament's link can follow live results and standings
with no login.

- Live site: https://tournament.inovatek.app (public pages live at `/t/<slug>`)
- Repo: https://github.com/asepnh/tournament (`main` auto-deploys on Vercel)
- Two audiences: **admin** (authenticated, `/dashboard/...`) and **spectators**
  (anonymous, `/t/[slug]`, auto-refreshes every 5s).

## 2. Stack and repo map

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind 4 ·
Prisma **6** · PostgreSQL (Neon in prod) · Auth.js v5 beta (credentials/JWT) ·
SWR · zod. Exact versions are in `package.json`.

| Path | What lives there |
| --- | --- |
| `prisma/schema.prisma`, `prisma/migrations/` | Data model and migration history |
| `src/lib/` | **All the tournament logic** (pure functions, no UI). Start here. |
| `src/app/api/` | REST-style route handlers (admin routes check ownership) |
| `src/app/dashboard/` | Admin pages (server component fetches, client `TournamentManager` runs it) |
| `src/app/t/[slug]/` | Public tournament page |
| `src/components/tournament-admin/` | One panel per admin concern (courts, groups, names, matches, standings) |
| `src/components/public/` | Public views (match results with round tabs, group standings) |
| `src/components/ui/` | Small shared primitives (Button, Input/Select/Textarea, Card, Tabs) |
| `src/proxy.ts` | Auth gate for `/dashboard/*` (Next 16 renamed `middleware` to `proxy`) |
| `src/auth.ts` | Auth.js config (credentials provider, JWT sessions, no DB adapter) |

`src/lib/` map:

| File | Responsibility |
| --- | --- |
| `groupPlanning.ts` | Player count to group count/sizes |
| `scheduling.ts` | Round-robin pairs + global court/round schedule |
| `standings.ts` | Points / differential ranking |
| `bracket.ts` | Knockout seeding, stage names, stage chain |
| `bracket-progress.ts` | Auto-generates the next knockout stage (and 3rd place) |
| `randomizePairing.ts` | Allocate roster into teams/groups: snake-placed seeds, partners from the top of the roster, rest random |
| `public-tournament.ts` | Builds the whole public payload (used by page *and* API) |
| `validation.ts` | All zod schemas and the 8-96 player limits |
| `authz.ts` | `getOwnedTournament` ownership check |
| `stageLabels.ts`, `teamDisplay.ts`, `labels.ts`, `slug.ts` | Display/label helpers |

## 3. The mental model

**Lifecycle (admin does each step in order, on one page):**

1. Create tournament (gets a unique public slug).
2. Add courts: group stage courts (pool play) and, optionally, a separate
   elimination court list (empty = reuse the group stage courts).
3. Enter total players (even, 8-96) -> groups and **team slots** are created
   (`A1, A2, ... B1 ...`). No names yet.
4. (Optional) Enter player names, either per team or paste a roster and
   **Allocate Players** (pairs them into teams; optional seeds are placed by
   the seeding rules, everyone else is random).
5. Generate pool matches (round robin inside each group, spread over courts).
6. Enter scores. Standings recompute live.
7. When all pool matches are done, **Generate elimination bracket**. After that
   everything advances automatically; the Final and 3rd Place complete the tournament.

**Knockout-only variant** (`Tournament.format = KNOCKOUT_ONLY`, chosen at creation):
steps 3, 5 and 6 are replaced by `setup-bracket` (2/4/8/16 teams, labeled `T1..Tn`
= bracket seed, `Team.groupId = null`); the roster/seeding panel assigns seeds to
`T1..` in order (it reuses `randomizePairing` with a single "group" of all teams,
which places seed k on team k); **Generate elimination bracket** then seeds the
teams with `buildKnockoutFirstRound` (`bracket.ts`) and everything after is shared.
**Byes:** 2-16 teams are allowed; for a non-power-of-2 count the bracket size is the
next power of 2 and the top `size - n` seeds get byes. Only the real first-round
matches are created, each with `bracketPosition` = its slot in the *full* bracket
(0..size/2-1), so empty slots are the byes (recomputed from the seed order, nothing
extra is stored). `entrantsForNextStage` (`bracket-progress.ts`) fills round 2 slot
by slot: the winner of the match in that slot, else the bye team. With 3 teams
there is one semifinal match, hence no 3rd Place match (the existing
"two semifinal losers" guard handles that).
All of this is gated on `format`, so pool tournaments take the old paths unchanged;
`setup-groups`, `generate-matches` and `advancing` reject knockout-only tournaments.
Courts of a knockout-only tournament are forced to `ELIMINATION`. Max 16 teams
(Round of 16).

**Vocabulary that matters:**

- **Team slot / label** (`A1`): the permanent identity of a team. Matches and
  results reference the slot's id. Player names are just two nullable strings
  *on* the slot, so renaming never breaks anything, but it also rewrites how
  past matches display.
- **Group:** a pool; the top k advance (k = `Tournament.advancingTeams` / group count, default 2). 3-6 teams each.
- **Stage:** `POOL`, `ROUND_OF_16`, `QUARTERFINAL`, `SEMIFINAL`, `THIRD_PLACE`,
  `FINAL`.
- **Round:** in `POOL`, one "wave" of simultaneous matches (one per court). In
  knockout stages every match is `round = 1`; the stage itself is the round.
- **Scoring:** one game per match (a single score each side, no ties). Win = 3
  points, loss = 0.

## 4. Data model (`prisma/schema.prisma`)

`User` -> `Tournament` -> `Court`, `Group` -> `Team`, `Match`.

- `Tournament`: `slug` (public URL, unique), `status` (`SETUP`/`IN_PROGRESS`/
  `COMPLETED`), `playerCount`. `format` exists but only has `POOL_PLAY`.
- `Team`: `label`, `player1Name?`, `player2Name?`, belongs to a `Group`.
- `Match`: `stage`, `round`, `court`, `teamA`/`teamB`, `teamAScores[]`/
  `teamBScores[]` (arrays so multi-set is possible later; validation currently
  forces length 1), `winnerId?`, `status`, `groupId?` (null for knockout),
  `bracketPosition?` (order within a knockout stage; pairs the next stage).
- Everything cascades from `Tournament`, so deleting a tournament cleans up.

Migrations so far: `init`, `add_bracket_position`, `add_third_place_stage`,
`add_advancing_teams` (`Tournament.advancingTeams`, nullable: null on older
tournaments means top 2 per group), `add_user_super_admin` (`User.isSuperAdmin`,
default false), `add_court_phase` (`Court.phase`, default `POOL`; courts used for the
bracket are the `ELIMINATION` ones, else all courts — see `src/lib/courts.ts`),
`add_knockout_only_format` (`TournamentFormat.KNOCKOUT_ONLY` + `Team.groupId` now
nullable; existing rows are untouched).
The player-count rewrite, player names, allocation and seeding needed **no**
migrations (`Team.player1Name/player2Name` existed from day one).

## 5. How the core logic works

### Group planning (`groupPlanning.ts`)
Constraint: the **number of groups must be a power of 2** (each group sends 2
teams, so the bracket then has 2, 4, 8 or 16 teams and never needs byes).
Product decision: each group has **3-6 teams**. Pick the smallest power-of-2 `G`
with `3G <= teams <= 6G`, then spread teams evenly (`teams % G` groups get one
extra). These windows tile with no gaps, so every even count 8-96 works
(verified exhaustively). 96 is a hard ceiling: it's 8 groups x 6 teams x 2, and
8 groups (16 qualifiers) is the largest bracket the stage enum supports
(`ROUND_OF_16`). More would need a `ROUND_OF_32` stage + migration.

### Round robin + court schedule (`scheduling.ts`)
- `roundRobinPairs`: circle method for any group size. Odd sizes add a bye slot,
  so each team sits out exactly one round. **5-team groups are the exception:**
  they use a fixed 10-match order (`FIVE_TEAM_ORDER`) in which no team plays twice
  in a row (breaks are 1 or 2 rounds). It was found by brute force over all 10!
  orders: only 240 qualify, all with the same rest pattern, so only the *role*
  assignment is free, and teams are shuffled into the roles at random each time
  the schedule is generated. 3- and 4-team groups can't avoid back-to-back games
  (minimum 2); 6-team groups could (an order exists) but it isn't wired up.
- `buildGlobalSchedule`: builds one queue by taking each group's next match in
  turn (so groups progress in lockstep; smaller groups simply finish earlier),
  then chunks the queue into batches of `courts.length`. One batch = one global
  round, each match on a distinct court. A court's next match is therefore the
  next round. With as many courts as groups (and equal sizes) each group ends up
  on one court, as a side effect of the interleaving, not a rule.
- **Known limitation:** the no-back-to-back guarantee for 5-team groups only holds
  when courts <= groups. With more courts than groups a team can play two rounds
  in a row, and with mixed sizes (e.g. 6+5 groups on 3-4 courts) the 6-team
  group's order can put the same team in two matches of the *same* round (this
  predates the 5-team change; the old scheduler did it too).

### Standings (`standings.ts`)
Rank by points, then point differential (points scored minus conceded), then
points scored. There is **no head-to-head tiebreak** (by decision). Only
`COMPLETED` matches count. If teams tie on all three, order is arbitrary.

### Knockout bracket (`bracket.ts`, `bracket-progress.ts`)
- Teams advancing is chosen at group setup (`setup-groups`) and can be changed
  until the bracket exists (`PATCH .../advancing`, `AdvancingPanel`; the standings tables bold the top k rows, with
  k = advancingTeams / groups, via `advancingPerGroup` in the public payload), validated against
  `advancingOptions(groupSizes)` in `advancing.ts`: a power of 2, >= 2, <= 16,
  and each group sends fewer teams than its smallest group. Because the group
  count is also a power of 2 this is always the same k teams per group, so no
  wildcard ranking exists. `generate-bracket` takes `standings.slice(0, k)` per
  group.
- `seedFirstRound(qualifiers, N)`: winners get seeds 1..G, second place G+1..2G,
  and so on (each in group order); pair with the standard seeded-bracket order
  (`seedOrder`). With an even G this guarantees **round 1 never rematches two
  teams from the same group**. Later rounds can reunite group-mates (same as real tournaments).
- `advanceBracketIfStageComplete` runs inside the same transaction as every
  knockout result save. When a stage's matches are all complete it pairs
  *consecutive winners by `bracketPosition`* into the next stage.
- Semifinal completion creates **both** the Final and the **3rd Place** match
  (losers), the Final on the first elimination court and 3rd Place on the second
  (the same one if there is only one court), so they can run at the same time.
  The tournament becomes `COMPLETED` only when *both* are done, in either order
  (a 2-team bracket has no 3rd Place match, so the Final alone ends it). The
  champion / 3rd place banners follow the match results, not the status.

### Player allocation + seeding (`randomizePairing.ts`, runs in the browser; the UI button is "Allocate Players")
Roster must match the team count exactly, and **roster order matters**: earliest
= strongest. Seeds are an optional, priority-ordered list of roster names
(first = seed 1).

- **Seeds never partner each other.** Every seed gets a team of their own
  (more seeds than teams throws).
- **Placement, exactly 4 groups (the organizer's snake table):** each team *row*
  (A1-D1, A2-D2, ...) takes the next 4 seeds, one per group, in the order set in
  `FOUR_GROUP_TIER_ORDERS`: row 1 A,C,B,D / row 2 D,B,C,A / row 3 B,D,A,C /
  row 4 C,A,D,B (our own completion of the rotation, only reached with >12
  seeds) / rows 5+ cycle. Groups with fewer teams skip the rows they don't
  have. **Any other group count:** seeds are spread by cycling through the groups
  (seed 1 -> A, 2 -> B, ... wrapping).
- **Partners:** after the seeds are removed from the roster, the first S
  unseeded names in roster order (S = number of seeds) are dealt out to the
  seeds at random. This keeps players listed far down the roster from being
  paired with a top seed. Everyone left is shuffled into the remaining slots.

To support another group count, add its tier orders and branch on
`groups.length` in `randomizePairing`. Seeds are **not stored**; they only exist
for the click. Saves via `PATCH /api/tournaments/[id]/teams`. Verified with the
real module (no copy): exact snake placement for 4/8/12/20 seeds, partners only
from the next S unseeded names, seeds scattered through the roster, every player
used once, plus uneven-group edge cases.

## 6. API map

All admin routes require a session and check `getOwnedTournament`.

| Route | Purpose |
| --- | --- |
| `POST /api/register` | Create admin account (bcrypt hash) |
| `/api/auth/[...nextauth]` | Auth.js handlers |
| `GET/POST /api/tournaments` | List / create |
| `GET/DELETE /api/tournaments/[id]` | Full admin detail / delete |
| `POST .../courts` (`phase`: `POOL`/`ELIMINATION`), `DELETE .../courts/[courtId]` | Courts. Add is 409 for POOL once pool matches exist, for ELIMINATION once the bracket exists; delete blocked once matches use the court |
| `POST .../setup-groups` | Create groups/teams from player count (409 if already done) |
| `PATCH .../teams` | Bulk save player names |
| `POST .../setup-bracket` | Knockout-only: create teams `T1..Tn` (n = 2/4/8/16; 409 if already done) |
| `PATCH .../advancing` | Change teams advancing (validated like setup; 409 once the bracket exists) |
| `POST .../generate-matches` | Build pool schedule (409 if matches exist) |
| `PATCH .../matches/[matchId]` | Save score; triggers bracket advancement |
| `POST .../generate-bracket` | First knockout stage (needs all pool matches done) |
| `DELETE /api/admin/users/[userId]` | Super admin only (403 otherwise): delete an account and, by cascade, its tournaments. Refuses self and other super admins |
| `GET /api/public/tournaments/[slug]` | Public payload, no auth, `no-store` |

## 7. Frontend structure

- **Admin:** `dashboard/tournaments/[id]/page.tsx` loads data server-side and
  hands it to the client `TournamentManager`, which owns all state. Every panel
  gets an `onChange` that calls `refresh()` (refetches `GET /api/tournaments/[id]`).
  Panels: Courts, Groups setup (disappears once groups exist), Player names,
  Matches (grouped by stage + round), Standings.
- **Public:** `t/[slug]/page.tsx` renders server-side for first paint;
  `PublicTournamentView` then polls the public API every 5s via SWR. Two tabs
  (Match Results with a sub-tab per round/stage, Group Standings).
- **Design:** white page; navy (`navy-*` tokens in `globals.css`) used **only**
  for the top nav and tab bars; amber accent for primary buttons/active tab.
  Mobile-first. Completed matches render as a borderless 2x3 grid (team names
  above scores; team A sans, team B mono; names 25% larger than scores). Score
  inputs have no spinners and select-on-focus.

## 8. Decision log (why things are the way they are)

- **Single game per match for now.** Multi-set is deferred to the format phase;
  DB already stores score arrays.
- **Groups of 3-6, power-of-2 group count.** Avoids bye logic in the bracket
  while still supporting any even player count; user chose 3-6 over a strict
  3-4 (which leaves gaps such as 22 players).
- **No head-to-head tiebreak;** differential instead (user decision).
- **Polling, not websockets.** 5s polling is plenty for results and trivial on
  Vercel.
- **Prisma pinned to 6.x.** Prisma 7 requires `prisma.config.ts` and driver
  adapters even for plain Postgres. Don't bump without planning that migration.
- **Auth: credentials + JWT, no adapter.** Simplest thing that works; there is
  no password reset, email verification, or account deletion.
- **Seeds are ephemeral;** names are *not* snapshotted per match (renames are
  retroactive). Both are deliberate simplifications.
- **Admin score-entry grid shows labels only, not player names** (kept compact
  for fast entry); names appear in the completed view, standings and public page.

## 9. Environments and operations

### Local development
1. `npm install` (runs `prisma generate`).
2. Database: `npx prisma dev` starts a local Postgres (ports 51213-51216). Put
   `DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"`
   in **`.env`** (the Prisma CLI only reads `.env`, not `.env.local`).
3. `.env.local`: `AUTH_SECRET=<any dev string>`; `NEXT_PUBLIC_APP_URL` (not read
   by code today). `.env*` is gitignored except `.env.example`.
4. `npx prisma migrate deploy` (or `migrate dev`), then `npm run dev`.

### Production
- **Vercel** project `tournament`, **Neon** Postgres via the Vercel Storage
  integration (custom env prefix `DATABASE`), domain `tournament.inovatek.app`.
- Env vars in Vercel: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`,
  `NEXT_PUBLIC_APP_URL`.
- **Migrations do NOT run on deploy.** After deploying any change that adds a
  migration, run it yourself:
  ```bash
  DATABASE_URL="<direct/unpooled connection string>" npx prisma migrate deploy
  ```
  Vercel marks the integration's variables "Sensitive" (can't be viewed or pulled,
  even with `vercel env pull`). Get the direct string from the **Neon Console**
  (Vercel > Storage > database > Open in Neon Console > Connection Details, with
  *Pooled connection* switched off).
- Code-only changes: just push to `main`.
- **Super admin:** `User.isSuperAdmin` unlocks a Users page (`/dashboard/users`,
  link in the header) that lists every account and can delete them (with their
  tournaments). It is checked against the database on every request
  (`src/lib/superAdmin.ts`), not stored in the JWT, so changes apply
  immediately. There is deliberately no in-app way to grant it. Register the
  account normally, then in the Neon console's SQL Editor run:
  ```sql
  UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'you@example.com';
  ```
- Housekeeping: production holds a leftover test account
  (`claude-live-test@example.com`, no tournaments). A super admin can now
  delete it from the Users page.

## 10. Gotchas (read before debugging)

- **This is Next 16, not the Next you know.** `AGENTS.md` says to read
  `node_modules/next/dist/docs/` first. Notable: `middleware` is now `proxy.ts`;
  route `params` and page `params` are Promises you must `await`.
- **Local dev DB is flaky.** `prisma dev` stops between sessions
  (`npx prisma dev ls` shows `not_running`; restart with
  `npx prisma dev start default -d`). Errors like `prepared statement "s0"
  already exists` mean its proxy is in a bad state: `npx prisma dev stop default`
  then start again, and restart `next dev` too. The login page shows the generic
  "Invalid email or password" even when the real cause is the DB being down.
- **`prisma migrate dev` can fail on the shadow DB** (`type "..." already
  exists`). Workaround that has been used: hand-write
  `prisma/migrations/<timestamp>_<name>/migration.sql`, apply it with
  `npx prisma db execute --file <path> --schema prisma/schema.prisma`, then
  `npx prisma migrate resolve --applied <folder>` and `npx prisma generate`.
- **Don't use `Promise.all` on a `tx` inside `prisma.$transaction(async tx => ...)`.**
  It's unreliable and caused a timeout at 64 players. Use `createMany`, or the
  array form `prisma.$transaction([...])`.
- **Court display order is alphabetical** (`orderBy court.name`), so "Court 10"
  sorts before "Court 2". Name courts `Court 01` etc. if you'll have 10+.
- Group/team labels come from `indexToLetters` (A..Z, AA..); fine for the 8-group cap.
- Each deploy needs a green `npm run build`; `npm run lint` is clean too.
- There are **no automated tests.** Logic was verified with throwaway scripts
  and manual end-to-end runs. The pure functions in `src/lib/` are the obvious
  place to start adding tests (group planning, round robin, seeding, randomize).

## 11. Known limitations

- **Editing a completed result does not re-propagate.** Changing a saved pool
  score after the bracket exists won't change seeding; changing a knockout
  result after the next stage exists won't regenerate it (next-stage generation
  is guarded to run once). Only edit results before the next stage is created,
  or delete and re-create.
- **No withdrawal/forfeit handling.** Names can be edited any time (including
  after matches exist), so substitutions work; but a team that simply can't play
  leaves matches pending and blocks standings/bracket. No walkover feature.
- No duplicate-name warning, no swap-players tool, names not unique-checked.
- Public API is unauthenticated and uncached (`no-store`); fine at this scale,
  there's no rate limiting on register/login.
- 8-96 players only; bracket maxes out at Round of 16.
- Groups/player count can't be changed after creation (delete the tournament).

## 12. Not built yet (planned "Phase 4")

Admin-chosen **format** (pool play / elimination only / round robin only),
**singles vs doubles**, custom group count/size and number advancing, and
**best-of-N** scoring. Where it will touch the code: `TournamentFormat` enum
(only `POOL_PLAY`), the `enterResultSchema` single-score constraint
(`validation.ts`), the "2 per group, power-of-2 groups" assumptions in
`groupPlanning.ts`/`bracket.ts`, and the "exactly two names per team" display
logic (`teamDisplay.ts`, names panel).

## 13. Common changes: where to go

| I want to... | Touch |
| --- | --- |
| Change allowed player range | `MIN/MAX_PLAYER_COUNT` in `validation.ts`; check `groupPlanning.ts` still tiles |
| Change group size limits | `groupPlanning.ts` (the 3 and 6) and the range check in `generate-matches/route.ts` |
| Change ranking/tiebreaks | `standings.ts` (used by admin panel, public payload, and bracket generation) |
| Add a knockout stage | `MatchStage` enum + migration, `bracket.ts` (`stageForTeamCount`/`nextStage`), `stageLabels.ts`, `types.ts` |
| Change what spectators see | `public-tournament.ts` (payload) then `components/public/*` |
| Change theme colors | tokens at the top of `globals.css` |
