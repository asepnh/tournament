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
 * builds a global schedule: every group's internal round-1 pairings are
 * queued first, then round-2, then round-3, and the queue is chunked into
 * courts-sized batches. Each batch is one global round; within a round each
 * match gets a distinct court. A court's next match only starts once the
 * current batch (round) is filled, matching "next match on a court = next round".
 */
export function buildGlobalSchedule(
  groups: { id: string; teamIds: string[] }[],
  courtIds: string[]
): { round: number; courtId: string; fixture: PoolFixture }[] {
  if (courtIds.length === 0) {
    throw new Error("At least one court is required to generate matches");
  }

  const queue: PoolFixture[] = [];
  const perGroupRounds = groups.map((g) => ({
    groupId: g.id,
    rounds: roundRobinPairsForFour(g.teamIds),
  }));

  const maxInternalRounds = 3;
  for (let r = 0; r < maxInternalRounds; r++) {
    for (const g of perGroupRounds) {
      for (const [teamAId, teamBId] of g.rounds[r]) {
        queue.push({ groupId: g.groupId, teamAId, teamBId });
      }
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
