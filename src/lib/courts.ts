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

/**
 * Courts a match of the given stage can be moved to: group stage courts for
 * pool matches, the elimination courts (or the group stage courts when none
 * were set up) for knockout matches.
 */
export function courtsForStage<T extends CourtLike>(stage: string, courts: T[]): T[] {
  if (stage === "POOL") return courts.filter((c) => c.phase === "POOL");
  const ids = new Set(eliminationCourtIds(courts));
  return courts.filter((c) => ids.has(c.id));
}
