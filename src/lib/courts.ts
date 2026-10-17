type CourtLike = { id: string; phase: "POOL" | "ELIMINATION" };

/** Courts used by the group stage schedule. */
export function poolCourtIds(courts: CourtLike[]): string[] {
  return courts.filter((c) => c.phase === "POOL").map((c) => c.id);
}

/**
 * Courts used by the elimination bracket: the ones set up for it, or the
 * group stage courts when none were (older tournaments, or an organizer who
 * wants the same courts for both).
 */
export function eliminationCourtIds(courts: CourtLike[]): string[] {
  const elimination = courts.filter((c) => c.phase === "ELIMINATION");
  return (elimination.length > 0 ? elimination : courts).map((c) => c.id);
}
