/**
 * How many teams can advance from pool play to the elimination bracket.
 *
 * The bracket has no byes, so the advancing total is a power of 2. The group
 * count is also a power of 2 (see groupPlanning.ts), so the total always
 * works out to the same number of teams from every group (1, 2, 4, ...) —
 * no wildcard ranking across groups is ever needed.
 */

// The bracket's biggest stage is the Round of 16.
export const MAX_ADVANCING_TEAMS = 16;

/**
 * Valid advancing totals for a set of groups. Each group sends at least its
 * winner, no more than the bracket can hold, and always fewer teams than its
 * smallest group so that pool play still eliminates someone.
 */
export function advancingOptions(groupSizes: number[]): number[] {
  const groupCount = groupSizes.length;
  const smallestGroup = Math.min(...groupSizes);
  const options: number[] = [];

  for (let perGroup = 1; perGroup < smallestGroup; perGroup *= 2) {
    const total = perGroup * groupCount;
    if (total > MAX_ADVANCING_TEAMS) break;
    if (total >= 2) options.push(total);
  }
  return options;
}

/** Top 2 from every group (the original behavior) when that is allowed. */
export function defaultAdvancing(groupSizes: number[]): number {
  const options = advancingOptions(groupSizes);
  const topTwo = groupSizes.length * 2;
  return options.includes(topTwo) ? topTwo : options[options.length - 1];
}
