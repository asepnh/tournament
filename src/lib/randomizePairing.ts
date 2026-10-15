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

// A placed team: second player is null while it still needs a random
// unseeded partner.
type Placed = Map<string, [string, string | null]>;

/**
 * Seeding layout used when there are exactly 4 groups (set by the
 * organizer). Each team row (A1-D1, then A2-D2, ...) is one "tier" that
 * consumes 2 x (number of groups) seeds as a snake: the first 4 go
 * forward across the groups in the order below, the next 4 come back in
 * reverse, so a tier's teams are 1+8, 2+7, 3+6, 4+5 (then 9+16, ...).
 * Every team in a row has the same strength total, and so does every
 * group.
 *
 * Values are group indexes (0 = A). Rows 1-3 are the organizer's table;
 * row 4 completes the rotation so no group repeats a draw position (only
 * reached with more than 24 seeds); rows 5+ cycle back to row 1.
 */
const FOUR_GROUP_TIER_ORDERS: number[][] = [
  [0, 2, 1, 3], // A, C, B, D
  [3, 1, 2, 0], // D, B, C, A
  [1, 3, 0, 2], // B, D, A, C
  [2, 0, 3, 1], // C, A, D, B
];

function placeSeedsByTable(seeds: string[], groups: GroupSlots[]): Placed {
  const placed: Placed = new Map();
  const maxRows = Math.max(...groups.map((g) => g.teamIds.length));
  let offset = 0;

  for (let row = 0; row < maxRows && offset < seeds.length; row++) {
    // Groups with fewer teams simply sit out the rows they don't have.
    const order = FOUR_GROUP_TIER_ORDERS[row % FOUR_GROUP_TIER_ORDERS.length]
      .filter((g) => groups[g].teamIds.length > row);
    const size = order.length;

    order.forEach((groupIndex, p) => {
      const forward = seeds[offset + p];
      if (forward === undefined) return;
      const mirror = seeds[offset + 2 * size - 1 - p];
      placed.set(groups[groupIndex].teamIds[row], [forward, mirror ?? null]);
    });

    offset += 2 * size;
  }

  return placed;
}

// 4 groups, fewer than 8 seeds: the seeds pair up high-low among
// themselves (1+5, 2+4 with 5 seeds; an odd one out gets an unseeded
// partner). Each team goes to the next group in the first row's order, so
// seeds are spread across the groups.
function placeFewSeedsByTable(seeds: string[], groups: GroupSlots[]): Placed {
  const placed: Placed = new Map();
  const order = FOUR_GROUP_TIER_ORDERS[0].filter(
    (g) => groups[g].teamIds.length > 0
  );

  for (let i = 0; i < Math.ceil(seeds.length / 2); i++) {
    const partner = seeds.length - 1 - i;
    placed.set(groups[order[i]].teamIds[0], [
      seeds[i],
      partner > i ? seeds[partner] : null,
    ]);
  }

  return placed;
}

// 4 groups, any other seed count (9-15, 17-23, ...): every seed gets its
// own team with a random unseeded partner. Seeds follow the table's group
// order row by row, which keeps every group's seed strength balanced.
function placeSoloSeedsByTable(seeds: string[], groups: GroupSlots[]): Placed {
  const placed: Placed = new Map();
  const maxRows = Math.max(...groups.map((g) => g.teamIds.length));
  let next = 0;

  for (let row = 0; row < maxRows && next < seeds.length; row++) {
    const order = FOUR_GROUP_TIER_ORDERS[row % FOUR_GROUP_TIER_ORDERS.length]
      .filter((g) => groups[g].teamIds.length > row);
    for (const groupIndex of order) {
      if (next >= seeds.length) break;
      placed.set(groups[groupIndex].teamIds[row], [seeds[next], null]);
      next += 1;
    }
  }

  return placed;
}

// Any other group count: each seed gets its own team (random unseeded
// partner), spread by cycling through the groups in order.
function placeSeedsByCycling(seeds: string[], groups: GroupSlots[]): Placed {
  const placed: Placed = new Map();
  const used = groups.map(() => 0);

  seeds.forEach((seed, i) => {
    let groupIndex = i % groups.length;
    while (used[groupIndex] >= groups[groupIndex].teamIds.length) {
      groupIndex = (groupIndex + 1) % groups.length;
    }
    placed.set(groups[groupIndex].teamIds[used[groupIndex]], [seed, null]);
    used[groupIndex] += 1;
  });

  return placed;
}

/**
 * Randomly pairs a roster of player names into teams and assigns them to
 * the given team slots (grouped by their existing group).
 *
 * `seedNames` is an optional ordered, priority-first list of players from
 * the roster. With exactly 4 groups, seeds partner each other (snake
 * table above) only when there are fewer than 8 or an exact multiple of 8;
 * any other count gives every seed its own team and a random unseeded
 * partner, placed in the table's group order. With other group counts each
 * seed gets a random unseeded partner and is spread across groups by
 * cycling. Everyone not placed by seeding is shuffled into the remaining
 * slots.
 */
export function randomizePairing(
  rosterNames: string[],
  seedNames: string[],
  groups: GroupSlots[]
): TeamAssignment[] {
  const totalTeams = groups.reduce((sum, g) => sum + g.teamIds.length, 0);
  const useTable = groups.length === 4;
  // With 4 groups, seeds only partner each other when there are fewer than
  // 8 or an exact multiple of 8; any other count gives each seed its own
  // team.
  const pairSeeds = seedNames.length < 8 || seedNames.length % 8 === 0;

  if ((!useTable || !pairSeeds) && seedNames.length > totalTeams) {
    throw new Error(
      `Too many seeds — there are only ${totalTeams} teams to assign them to`
    );
  }

  const pool = [...rosterNames];
  for (const seed of seedNames) {
    const idx = pool.indexOf(seed);
    if (idx === -1) {
      throw new Error(
        `Seed "${seed}" wasn't found in the roster (or was listed more than once)`
      );
    }
    pool.splice(idx, 1);
  }

  let placed: Placed;
  if (!useTable) {
    placed = placeSeedsByCycling(seedNames, groups);
  } else if (seedNames.length < 8) {
    placed = placeFewSeedsByTable(seedNames, groups);
  } else if (pairSeeds) {
    placed = placeSeedsByTable(seedNames, groups);
  } else {
    placed = placeSoloSeedsByTable(seedNames, groups);
  }

  const unseeded = shuffle(pool);
  for (const pair of placed.values()) {
    if (pair[1] === null) {
      pair[1] = unseeded.shift() ?? null;
    }
  }

  const emptySlots = shuffle(
    groups.flatMap((g) => g.teamIds).filter((id) => !placed.has(id))
  );
  if (unseeded.length !== emptySlots.length * 2) {
    throw new Error("Roster size doesn't match the number of team slots");
  }
  emptySlots.forEach((teamId, i) => {
    placed.set(teamId, [unseeded[i * 2], unseeded[i * 2 + 1]]);
  });

  return Array.from(placed.entries()).map(([teamId, [p1, p2]]) => ({
    teamId,
    player1Name: p1,
    player2Name: p2 as string,
  }));
}
