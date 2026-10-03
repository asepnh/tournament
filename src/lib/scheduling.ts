/**
 * Round-robin pairing for a 4-team group using the circle method.
 * Returns 3 internal rounds, each with 2 concurrent matches, covering
 * all 6 unique pairings exactly once.
 */
export function roundRobinPairsForFour(teamIds: string[]): [string, string][][] {
  if (teamIds.length !== 4) {
    throw new Error("roundRobinPairsForFour expects exactly 4 teams");
  }
  const [a, b, c, d] = teamIds;
  return [
    [
      [a, d],
      [b, c],
    ],
    [
      [a, c],
      [d, b],
    ],
    [
      [a, b],
      [c, d],
    ],
  ];
}

export type PoolFixture = {
  groupId: string;
  teamAId: string;
  teamBId: string;
};

/**
 * Given all groups (each with exactly 4 team ids) and a number of courts,
 * builds a global schedule, then chunks it into courts-sized batches — each
 * batch is one global round, and within a round each match gets a distinct
 * court (a court's next match only starts once the current batch is filled).
 *
 * The queue interleaves across groups round-robin style: every group's 1st
 * match comes before any group's 2nd match, which comes before any group's
 * 3rd, and so on. This keeps every group's number of *scheduled* matches
 * equal at any point in the schedule — group A doesn't play out its entire
 * round robin on the courts before group B's first match even appears.
 * (Each group's own 6 matches stay in their internal round-robin order —
 * tier 1's two matches, then tier 2's, then tier 3's — only the order
 * *across* groups is interleaved.)
 */
export function buildGlobalSchedule(
  groups: { id: string; teamIds: string[] }[],
  courtIds: string[]
): { round: number; courtId: string; fixture: PoolFixture }[] {
  if (courtIds.length === 0) {
    throw new Error("At least one court is required to generate matches");
  }

  const perGroupMatches = groups.map((g) => ({
    groupId: g.id,
    matches: roundRobinPairsForFour(g.teamIds).flat(),
  }));

  const matchesPerGroup = perGroupMatches[0]?.matches.length ?? 0;
  const queue: PoolFixture[] = [];
  for (let i = 0; i < matchesPerGroup; i++) {
    for (const g of perGroupMatches) {
      const [teamAId, teamBId] = g.matches[i];
      queue.push({ groupId: g.groupId, teamAId, teamBId });
    }
  }

  const schedule: { round: number; courtId: string; fixture: PoolFixture }[] = [];
  for (let i = 0; i < queue.length; i++) {
    const round = Math.floor(i / courtIds.length) + 1;
    const courtId = courtIds[i % courtIds.length];
    schedule.push({ round, courtId, fixture: queue[i] });
  }

  return schedule;
}
