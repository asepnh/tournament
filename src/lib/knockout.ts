/**
 * Knockout-only tournaments skip groups and pool play: the teams go straight
 * into a seeded elimination bracket. There are no byes, so the team count is
 * a power of 2, and 16 teams is the biggest bracket the stage list supports
 * (Round of 16).
 */
export const KNOCKOUT_TEAM_COUNTS = [2, 4, 8, 16];

export function isValidKnockoutTeamCount(n: number): boolean {
  return KNOCKOUT_TEAM_COUNTS.includes(n);
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
