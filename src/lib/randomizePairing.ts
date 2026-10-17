export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export type GroupSlots = { teamIds: string[] };

export type TeamAssignment = {
  teamId: string;
  player1Name: string;
  player2Name: string;
};

/**
 * Seeding layout used when there are exactly 4 groups (set by the
 * organizer). Each team row (A1-D1, then A2-D2, ...) takes the next 4
 * seeds, one per group, in the order below. The order flips and rotates row
 * to row (a snake), so every group ends up with the same seed strength.
 *
 * Values are group indexes (0 = A). Rows 1-3 are the organizer's table;
 * row 4 completes the rotation so no group repeats a draw position (only
 * reached with more than 12 seeds); rows 5+ cycle back to row 1.
 */
const FOUR_GROUP_TIER_ORDERS: number[][] = [
  [0, 2, 1, 3], // A, C, B, D
  [3, 1, 2, 0], // D, B, C, A
  [1, 3, 0, 2], // B, D, A, C
  [2, 0, 3, 1], // C, A, D, B
];

// Seeds in priority order -> the team each one gets (its own team: seeds
// never share one).
type SeedPlacement = Map<string, string>;

function placeSeedsByTable(seeds: string[], groups: GroupSlots[]): SeedPlacement {
  const placed: SeedPlacement = new Map();
  const maxRows = Math.max(...groups.map((g) => g.teamIds.length));
  let next = 0;

  for (let row = 0; row < maxRows && next < seeds.length; row++) {
    // Groups with fewer teams simply sit out the rows they don't have.
    const order = FOUR_GROUP_TIER_ORDERS[row % FOUR_GROUP_TIER_ORDERS.length]
      .filter((g) => groups[g].teamIds.length > row);
    for (const groupIndex of order) {
      if (next >= seeds.length) break;
      placed.set(groups[groupIndex].teamIds[row], seeds[next]);
      next += 1;
    }
  }

  return placed;
}

// Any other group count: spread seeds by cycling through the groups in order.
function placeSeedsByCycling(seeds: string[], groups: GroupSlots[]): SeedPlacement {
  const placed: SeedPlacement = new Map();
  const used = groups.map(() => 0);

  seeds.forEach((seed, i) => {
    let groupIndex = i % groups.length;
    while (used[groupIndex] >= groups[groupIndex].teamIds.length) {
      groupIndex = (groupIndex + 1) % groups.length;
    }
    placed.set(groups[groupIndex].teamIds[used[groupIndex]], seed);
    used[groupIndex] += 1;
  });

  return placed;
}

/**
 * Pairs a roster of player names into teams and assigns them to the given
 * team slots (grouped by their existing group).
 *
 * `rosterNames` is in the organizer's listing order, earliest = strongest.
 * `seedNames` is an optional priority-first list of players from the roster.
 *
 * - Every seed gets a team of their own — seeds never partner each other.
 *   With exactly 4 groups they follow the snake table above; with any other
 *   group count they are spread by cycling through the groups.
 * - Each seed's partner is drawn at random from the next S unseeded names in
 *   roster order (S = number of seeds), so a seed is never paired with
 *   someone listed far down the roster.
 * - Everyone else is shuffled into the remaining slots.
 */
export function randomizePairing(
  rosterNames: string[],
  seedNames: string[],
  groups: GroupSlots[]
): TeamAssignment[] {
  const totalTeams = groups.reduce((sum, g) => sum + g.teamIds.length, 0);

  if (seedNames.length > totalTeams) {
    throw new Error(
      `Too many seeds — there are only ${totalTeams} teams, and seeds can't share a team`
    );
  }

  const unseeded = [...rosterNames];
  for (const seed of seedNames) {
    const idx = unseeded.indexOf(seed);
    if (idx === -1) {
      throw new Error(
        `Seed "${seed}" wasn't found in the roster (or was listed more than once)`
      );
    }
    unseeded.splice(idx, 1);
  }

  const placed =
    groups.length === 4
      ? placeSeedsByTable(seedNames, groups)
      : placeSeedsByCycling(seedNames, groups);

  // Partners: the first S unseeded names in roster order, dealt out randomly.
  const partners = shuffle(unseeded.slice(0, seedNames.length));
  const assignments: TeamAssignment[] = [];
  let partnerIndex = 0;
  for (const [teamId, seed] of placed) {
    assignments.push({
      teamId,
      player1Name: seed,
      player2Name: partners[partnerIndex++],
    });
  }

  const rest = shuffle(unseeded.slice(seedNames.length));
  const emptySlots = shuffle(
    groups.flatMap((g) => g.teamIds).filter((id) => !placed.has(id))
  );
  if (rest.length !== emptySlots.length * 2) {
    throw new Error("Roster size doesn't match the number of team slots");
  }
  emptySlots.forEach((teamId, i) => {
    assignments.push({
      teamId,
      player1Name: rest[i * 2],
      player2Name: rest[i * 2 + 1],
    });
  });

  return assignments;
}
