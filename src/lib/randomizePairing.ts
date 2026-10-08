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
 * Randomly pairs up a roster of player names into teams and assigns them
 * to the given team slots (grouped by their existing group).
 *
 * If `seedNames` is non-empty (an ordered, priority-first list of player
 * names drawn from `rosterNames`), each seeded player is paired with a
 * random *unseeded* partner, and that pair is placed into a different
 * group than every other seed, cycling through the groups in order (so
 * with more seeds than groups, extras wrap around and start doubling up
 * rather than clustering into just the first group). Everyone else is
 * shuffled and filled into whatever team slots remain, same as plain
 * randomization.
 */
export function randomizePairing(
  rosterNames: string[],
  seedNames: string[],
  groups: GroupSlots[]
): TeamAssignment[] {
  const totalTeams = groups.reduce((sum, g) => sum + g.teamIds.length, 0);
  if (seedNames.length > totalTeams) {
    throw new Error(
      `Too many seeds — there are only ${totalTeams} teams to assign them to`
    );
  }

  const pool = [...rosterNames];
  const seedPlayers: string[] = [];
  for (const seed of seedNames) {
    const idx = pool.indexOf(seed);
    if (idx === -1) {
      throw new Error(
        `Seed "${seed}" wasn't found in the roster (or was listed more than once)`
      );
    }
    seedPlayers.push(seed);
    pool.splice(idx, 1);
  }

  const shuffledPool = shuffle(pool);
  const seedTeams: [string, string][] = seedPlayers.map((seed, i) => [
    seed,
    shuffledPool[i],
  ]);
  const remainingPlayers = shuffledPool.slice(seedPlayers.length);

  const remainingTeams: [string, string][] = [];
  for (let i = 0; i < remainingPlayers.length; i += 2) {
    remainingTeams.push([remainingPlayers[i], remainingPlayers[i + 1]]);
  }

  const assignments = new Map<string, [string, string]>();
  const nextSlotIndex = groups.map(() => 0);

  seedTeams.forEach((pair, i) => {
    const groupIndex = i % groups.length;
    const slotIndex = nextSlotIndex[groupIndex];
    const teamId = groups[groupIndex].teamIds[slotIndex];
    assignments.set(teamId, pair);
    nextSlotIndex[groupIndex] += 1;
  });

  const remainingSlots: string[] = [];
  groups.forEach((g, gi) => {
    for (let s = nextSlotIndex[gi]; s < g.teamIds.length; s++) {
      remainingSlots.push(g.teamIds[s]);
    }
  });

  shuffle(remainingSlots).forEach((teamId, i) => {
    const pair = remainingTeams[i];
    if (pair) {
      assignments.set(teamId, pair);
    }
  });

  return Array.from(assignments.entries()).map(([teamId, [p1, p2]]) => ({
    teamId,
    player1Name: p1,
    player2Name: p2,
  }));
}
