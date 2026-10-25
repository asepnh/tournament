/**
 * Manual re-pairing of a knockout round: the admin decides who meets who
 * before any match in the round has been played.
 *
 * The Final and 3rd Place match are not editable — they are decided by the
 * semifinal results.
 */
export const EDITABLE_PAIRING_STAGES = ["ROUND_OF_16", "QUARTERFINAL", "SEMIFINAL"];

export type Pairing = { id: string; teamAId: string; teamBId: string };

/**
 * Checks that `next` is a valid rearrangement of `current`: the same matches,
 * the same teams, every team in exactly one match, nobody playing themselves.
 * Returns an error message, or null when it is valid.
 */
export function validatePairings(current: Pairing[], next: Pairing[]): string | null {
  const currentIds = new Set(current.map((m) => m.id));
  if (
    next.length !== current.length ||
    new Set(next.map((m) => m.id)).size !== next.length ||
    next.some((m) => !currentIds.has(m.id))
  ) {
    return "The pairings must cover every match in this round";
  }

  const currentTeams = new Set(current.flatMap((m) => [m.teamAId, m.teamBId]));
  const nextTeams = next.flatMap((m) => [m.teamAId, m.teamBId]);
  if (next.some((m) => m.teamAId === m.teamBId)) {
    return "A team can't play itself";
  }
  if (new Set(nextTeams).size !== nextTeams.length) {
    return "Each team must appear exactly once";
  }
  if (nextTeams.some((t) => !currentTeams.has(t))) {
    return "Only the teams already in this round can be paired";
  }
  return null;
}
