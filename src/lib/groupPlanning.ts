/**
 * Decides how many groups to create and how many teams go in each, for a
 * given number of teams.
 *
 * Constraints:
 * - The elimination bracket needs the number of *groups* to be a power of 2
 *   (each group sends its top 2 forward; see src/lib/bracket.ts), so it
 *   never needs byes.
 * - Each group should have between 3 and 6 teams (set by product decision —
 *   not too small to be a meaningful pool, not so large the round robin
 *   takes forever).
 *
 * These two constraints tile perfectly: group-size windows [3*2^k, 6*2^k]
 * are contiguous with no gaps (each window's top, 6*2^k, is exactly the
 * next window's bottom, 3*2^(k+1)), so for any team count >= 3 there is
 * always a power-of-2 group count G with 3*G <= teams <= 6*G.
 *
 * Once G is chosen, teams are spread as evenly as possible: `teams % G`
 * groups get one extra team over the rest, which — given the 3*G..6*G
 * window — always keeps every group's size within [3, 6].
 */
export function planGroupSizes(teamCount: number): number[] {
  if (teamCount < 3) {
    throw new Error("Need at least 3 teams to form a group");
  }

  let groupCount = 1;
  while (!(3 * groupCount <= teamCount && teamCount <= 6 * groupCount)) {
    groupCount *= 2;
  }

  const base = Math.floor(teamCount / groupCount);
  const remainder = teamCount % groupCount;

  return Array.from({ length: groupCount }, (_, i) =>
    i < remainder ? base + 1 : base
  );
}
