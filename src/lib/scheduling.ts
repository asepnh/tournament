/**
 * Round-robin pairing for a group of any size (3-6 teams) using the
 * standard "circle method": fix one team, rotate the rest each round. For
 * an odd team count, a "bye" slot is added to make the rotation even —
 * whichever real team lands on the bye in a given round just sits out that
 * round (every team gets exactly one bye across the full schedule, since
 * there are N rounds and each team plays in N-1 of them).
 *
 * Returns the matches in round order (only real matches — bye slots are
 * dropped), covering all C(N,2) unique pairings exactly once.
 */
export function roundRobinPairs(teamIds: string[]): [string, string][] {
  const n = teamIds.length;
  if (n < 2) {
    throw new Error("roundRobinPairs needs at least 2 teams");
  }

  const hasBye = n % 2 !== 0;
  const slots: (string | null)[] = hasBye ? [...teamIds, null] : [...teamIds];
  const slotCount = slots.length;
  const numRounds = slotCount - 1;
  const half = slotCount / 2;

  const matches: [string, string][] = [];
  let arr = slots;
  for (let r = 0; r < numRounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[slotCount - 1 - i];
      if (a !== null && b !== null) {
        matches.push([a, b]);
      }
    }
    // Rotate: keep slot 0 fixed, rotate everyone else by one position.
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr = [fixed, ...rest];
  }

  return matches;
}

export type PoolFixture = {
  groupId: string;
  teamAId: string;
  teamBId: string;
};

/**
 * Given all groups (each with 3-6 team ids) and a number of courts, builds
 * a global schedule, then chunks it into courts-sized batches — each batch
 * is one global round, and within a round each match gets a distinct court
 * (a court's next match only starts once the current batch is filled).
 *
 * The queue interleaves across groups round-robin style: every group
 * contributes its next unscheduled match, in turn, for as long as it still
 * has matches left — so a group's matches stay roughly in lockstep with
 * every other group's, rather than one group's entire round robin playing
 * out before another group's first match even appears. Groups with fewer
 * matches (smaller groups) simply drop out of the rotation once they're
 * done, while larger groups keep going — there's no way around a smaller
 * group finishing its pool play sooner.
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
    matches: roundRobinPairs(g.teamIds),
  }));

  const queue: PoolFixture[] = [];
  const indices = perGroupMatches.map(() => 0);
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (let gi = 0; gi < perGroupMatches.length; gi++) {
      const g = perGroupMatches[gi];
      if (indices[gi] < g.matches.length) {
        const [teamAId, teamBId] = g.matches[indices[gi]];
        queue.push({ groupId: g.groupId, teamAId, teamBId });
        indices[gi]++;
        remaining = true;
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
