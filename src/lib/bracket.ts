export type KnockoutStage =
  | "ROUND_OF_16"
  | "QUARTERFINAL"
  | "SEMIFINAL"
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
    case "FINAL":
      return null;
  }
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Builds the first knockout round's pairings from each group's top 2 teams.
 *
 * Seeding: group winners take seeds 1..G (in group-label order), runners-up
 * take seeds G+1..2G (same group-label order, not reversed). Because G is
 * always even here (groups come in 2/4/8 from the fixed 16/32/64 player
 * options), this guarantees every first-round match pairs a winner against
 * a runner-up from a *different* group — no team can face someone they
 * already played in pool play. (Later rounds are standard bracket
 * progression and could in principle reunite group-mates, same as most
 * real seeded tournaments — only round 1 is guaranteed rematch-free.)
 */
export function seedFirstRound(
  groupQualifiers: {
    groupLabel: string;
    winnerTeamId: string;
    runnerUpTeamId: string;
  }[]
): [string, string][] {
  const g = groupQualifiers.length;
  if (!isPowerOfTwo(g)) {
    throw new Error(
      `Elimination bracket needs a power-of-2 number of groups, got ${g}`
    );
  }

  const ordered = [...groupQualifiers].sort((a, b) =>
    a.groupLabel.localeCompare(b.groupLabel)
  );

  const seedToTeam = new Map<number, string>();
  ordered.forEach((q, i) => {
    seedToTeam.set(i + 1, q.winnerTeamId);
    seedToTeam.set(g + i + 1, q.runnerUpTeamId);
  });

  const order = seedOrder(g * 2);
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
