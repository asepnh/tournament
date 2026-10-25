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

export function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

export type KnockoutFirstRound = {
  /** Bracket size: the next power of 2 at or above the team count. */
  size: number;
  /** Real first-round matches; `position` is the slot in the full bracket. */
  matches: { position: number; pair: [string, string] }[];
  /** Teams skipping round 1 (the top seeds), with their slot in the bracket. */
  byes: { position: number; teamId: string }[];
};

/**
 * First round of a knockout-only tournament. Teams are in seed order (best
 * first) and go into the standard seeded bracket for the next power of 2
 * (seed 1 plays the last seed, 2 the second to last, ...). When the team
 * count isn't a power of 2, the seeds that would play a nonexistent team get
 * a bye: the top `size - n` seeds skip round 1 and wait in the next round.
 */
export function buildKnockoutFirstRound(
  teamIdsInSeedOrder: string[]
): KnockoutFirstRound {
  const n = teamIdsInSeedOrder.length;
  if (n < 2) {
    throw new Error(`Knockout bracket needs at least 2 teams, got ${n}`);
  }
  const size = nextPowerOfTwo(n);
  const order = seedOrder(size);
  const matches: KnockoutFirstRound["matches"] = [];
  const byes: KnockoutFirstRound["byes"] = [];

  for (let position = 0; position < size / 2; position++) {
    const seedA = order[position * 2];
    const seedB = order[position * 2 + 1];
    const a = seedA <= n ? teamIdsInSeedOrder[seedA - 1] : null;
    const b = seedB <= n ? teamIdsInSeedOrder[seedB - 1] : null;
    if (a && b) {
      matches.push({ position, pair: [a, b] });
    } else if (a || b) {
      byes.push({ position, teamId: (a ?? b) as string });
    }
  }
  return { size, matches, byes };
}
