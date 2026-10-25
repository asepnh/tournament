/**
 * Knockout-only tournaments skip groups and pool play: the teams go straight
 * into a seeded elimination bracket. When the team count isn't a power of 2
 * the top seeds get byes (see buildKnockoutFirstRound in bracket.ts). 16 teams
 * is the biggest bracket the stage list supports (Round of 16).
 */
export const MIN_KNOCKOUT_TEAMS = 2;
export const MAX_KNOCKOUT_TEAMS = 16;

export function isValidKnockoutTeamCount(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_KNOCKOUT_TEAMS && n <= MAX_KNOCKOUT_TEAMS;
}

/** Number of byes for a team count (0 when it is a power of 2). */
export function knockoutByeCount(teamCount: number): number {
  let size = 1;
  while (size < teamCount) size *= 2;
  return size - teamCount;
}

/** Teams are labeled T1..Tn, where the number is the bracket seed. */
export function knockoutTeamLabel(seed: number): string {
  return `T${seed}`;
}

export function seedFromLabel(label: string): number {
  return Number(label.replace(/^\D+/, "")) || 0;
}

export function sortTeamsBySeed<T extends { label: string }>(teams: T[]): T[] {
  return [...teams].sort((a, b) => seedFromLabel(a.label) - seedFromLabel(b.label));
}
