export type KnockoutStage =
  | "ROUND_OF_16"
  | "QUARTERFINAL"
  | "SEMIFINAL"
  | "THIRD_PLACE"
  | "FINAL";

/**
 * Standard single-elimination seeding order (1-indexed) for a bracket of
 * size n (must be a power of 2). e.g. seedOrder(8) => [1,8,4,5,2,7,3,6],
 * which pairs into first-round matches 1v8, 4v5, 2v7, 3v6 — the classic
 * seeded-bracket layout that keeps the top seeds apart as long as possible.
 */
export function seedOrder(n: number): number[] {
  if (n === 1) return [1];
  const prev = seedOrder(n / 2);
  const result: number[] = [];
  for (const s of prev) {
    result.push(s, n + 1 - s);
  }
  return result;
}

export function stageForTeamCount(n: number): KnockoutStage {
  switch (n) {
    case 16:
      return "ROUND_OF_16";
    case 8:
      return "QUARTERFINAL";
    case 4:
      return "SEMIFINAL";
    case 2:
      return "FINAL";
    default:
      throw new Error(`Unsupported bracket size: ${n} teams`);
  }
}

export function nextStage(stage: KnockoutStage): KnockoutStage | null {
  switch (stage) {
    case "ROUND_OF_16":
      return "QUARTERFINAL";
    case "QUARTERFINAL":
      return "SEMIFINAL";
    case "SEMIFINAL":
      return "FINAL";
    case "THIRD_PLACE":
    case "FINAL":
      return null;
  }
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Builds the first knockout round's pairings from each group's advancing
 * teams.
 *
 * `advancingTeams` (a power of 2, a whole multiple of the group count) is how
 * many teams make the bracket, so every group sends k = advancingTeams /
 * groups teams, in finishing order.
 *
 * Seeding: all group winners take seeds 1..G (in group-label order), second
 * place takes seeds G+1..2G (same group-label order, not reversed), and so
 * on. Round 1 pairs seed s with seed N+1-s (the standard seeded-bracket
 * order). Because G is even whenever k > 1, those two seeds are always from
 * different groups — no team can face someone they already played in pool
 * play. (Later rounds are standard bracket progression and could in
 * principle reunite group-mates, same as most real seeded tournaments —
 * only round 1 is guaranteed rematch-free.)
 */
export function seedFirstRound(
  groupQualifiers: {
    groupLabel: string;
    /** Advancing team ids in finishing order (best first). */
    rankedTeamIds: string[];
  }[],
  advancingTeams: number
): [string, string][] {
  const g = groupQualifiers.length;
  if (!isPowerOfTwo(g)) {
    throw new Error(
      `Elimination bracket needs a power-of-2 number of groups, got ${g}`
    );
  }
  if (advancingTeams < 2 || !isPowerOfTwo(advancingTeams)) {
    throw new Error(
      `Elimination bracket needs a power-of-2 number of teams, got ${advancingTeams}`
    );
  }
  if (advancingTeams % g !== 0) {
    throw new Error(
      `${advancingTeams} advancing teams can't be split evenly across ${g} groups`
    );
  }
  const perGroup = advancingTeams / g;

  const ordered = [...groupQualifiers].sort((a, b) =>
    a.groupLabel.localeCompare(b.groupLabel)
  );

  const seedToTeam = new Map<number, string>();
  ordered.forEach((q, i) => {
    for (let rank = 0; rank < perGroup; rank++) {
      const teamId = q.rankedTeamIds[rank];
      if (!teamId) {
        throw new Error(`Group ${q.groupLabel} has fewer than ${perGroup} teams`);
      }
      seedToTeam.set(rank * g + i + 1, teamId);
    }
  });

  const order = seedOrder(advancingTeams);
  const pairs: [string, string][] = [];
  for (let i = 0; i < order.length; i += 2) {
    const a = seedToTeam.get(order[i]);
    const b = seedToTeam.get(order[i + 1]);
    if (!a || !b) {
      throw new Error("Failed to build bracket seeding");
    }
    pairs.push([a, b]);
  }
  return pairs;
}

/**
 * First-round pairings for a knockout-only tournament: teams in seed order
 * (best first) go straight into the standard seeded bracket, so seed 1 plays
 * the last seed, 2 plays the second to last, and so on, and the top seeds
 * stay apart as long as possible. The team count must be a power of 2.
 */
export function seedKnockoutBracket(teamIdsInSeedOrder: string[]): [string, string][] {
  const n = teamIdsInSeedOrder.length;
  if (n < 2 || !isPowerOfTwo(n)) {
    throw new Error(`Knockout bracket needs a power-of-2 number of teams, got ${n}`);
  }
  const order = seedOrder(n);
  const pairs: [string, string][] = [];
  for (let i = 0; i < order.length; i += 2) {
    pairs.push([
      teamIdsInSeedOrder[order[i] - 1],
      teamIdsInSeedOrder[order[i + 1] - 1],
    ]);
  }
  return pairs;
}
