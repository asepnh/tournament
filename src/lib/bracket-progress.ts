import type { Prisma, MatchStage } from "@prisma/client";
import {
  buildKnockoutFirstRound,
  nextStage,
  stageForTeamCount,
  type KnockoutStage,
} from "./bracket";
import { eliminationCourtIds } from "./courts";
import { sortTeamsBySeed } from "./knockout";

type Tx = Prisma.TransactionClient;

export async function createStageMatches(
  tx: Tx,
  tournamentId: string,
  stage: KnockoutStage,
  pairs: [string, string][],
  courtIds: string[],
  /** Slot of each pair in the full bracket; defaults to 0, 1, 2, ... */
  positions?: number[]
) {
  if (courtIds.length === 0) {
    throw new Error("No courts available");
  }
  await tx.match.createMany({
    data: pairs.map(([teamAId, teamBId], i) => ({
      tournamentId,
      stage,
      round: 1,
      bracketPosition: positions?.[i] ?? i,
      courtId: courtIds[i % courtIds.length],
      teamAId,
      teamBId,
    })),
  });
}

/**
 * The teams entering the next stage, in bracket order. Normally that is the
 * winners of the stage just finished. In the first round of a knockout-only
 * bracket with byes, the first-round matches only fill some slots; the empty
 * slots belong to the bye teams, which join the winners here.
 */
async function entrantsForNextStage(
  tx: Tx,
  tournamentId: string,
  stage: MatchStage,
  ordered: { bracketPosition: number | null; winnerId: string | null }[]
): Promise<string[]> {
  const winners = ordered.map((m) => m.winnerId as string);

  const tournament = await tx.tournament.findUnique({
    where: { id: tournamentId },
    select: { format: true },
  });
  if (tournament?.format !== "KNOCKOUT_ONLY") return winners;

  const teams = sortTeamsBySeed(
    await tx.team.findMany({ where: { tournamentId } })
  );
  const first = buildKnockoutFirstRound(teams.map((t) => t.id));
  if (first.byes.length === 0 || stage !== stageForTeamCount(first.size)) {
    return winners;
  }

  const winnerAt = new Map(ordered.map((m) => [m.bracketPosition ?? 0, m.winnerId as string]));
  const byeAt = new Map(first.byes.map((b) => [b.position, b.teamId]));
  return Array.from(
    { length: first.size / 2 },
    (_, position) => (winnerAt.get(position) ?? byeAt.get(position)) as string
  );
}

/**
 * Call after a knockout match is marked COMPLETED. If every match in that
 * match's stage is now complete:
 * - Final or Third Place complete -> tournament marked COMPLETED once both
 *   have been played (when there is no Third Place match, i.e. a 2-team
 *   bracket, the Final alone ends it).
 * - Semifinal complete -> generates both the Final (winners) and the Third
 *   Place match (losers of each semifinal play each other), on different
 *   courts when there is more than one so they can run at the same time.
 * - Any earlier stage complete -> generates the next stage (winners only).
 */
export async function advanceBracketIfStageComplete(
  tx: Tx,
  tournamentId: string,
  stage: MatchStage
) {
  if (stage === "POOL") return;

  const stageMatches = await tx.match.findMany({
    where: { tournamentId, stage },
  });
  if (stageMatches.length === 0) return;
  if (!stageMatches.every((m) => m.status === "COMPLETED")) return;

  if (stage === "FINAL" || stage === "THIRD_PLACE") {
    // The tournament ends only when both the Final and the Third Place match
    // are done. Both are created together when the semifinals finish, so
    // anything still open here means we keep waiting.
    const unfinished = await tx.match.count({
      where: {
        tournamentId,
        stage: { in: ["FINAL", "THIRD_PLACE"] },
        status: { not: "COMPLETED" },
      },
    });
    if (unfinished === 0) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: "COMPLETED" },
      });
    }
    return;
  }

  const next = nextStage(stage as KnockoutStage);
  if (!next) return;

  const ordered = [...stageMatches].sort(
    (a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)
  );
  const winners = await entrantsForNextStage(tx, tournamentId, stage, ordered);
  const losers = ordered.map((m) =>
    m.winnerId === m.teamAId ? m.teamBId : m.teamAId
  );

  const courts = await tx.court.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "asc" },
  });
  const courtIds = eliminationCourtIds(courts);

  // Guard against generating a stage twice if this runs concurrently for
  // two matches finishing at nearly the same time.
  const alreadyGeneratedNext = await tx.match.count({
    where: { tournamentId, stage: next },
  });
  if (alreadyGeneratedNext === 0) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < winners.length; i += 2) {
      pairs.push([winners[i], winners[i + 1]]);
    }
    await createStageMatches(tx, tournamentId, next, pairs, courtIds);
  }

  if (stage === "SEMIFINAL" && losers.length === 2) {
    const alreadyGeneratedThirdPlace = await tx.match.count({
      where: { tournamentId, stage: "THIRD_PLACE" },
    });
    if (alreadyGeneratedThirdPlace === 0) {
      // Start from the second court so it doesn't share the Final's court
      // (the Final takes the first); with a single court they share it.
      const thirdPlaceCourtIds = [...courtIds.slice(1), courtIds[0]];
      await createStageMatches(
        tx,
        tournamentId,
        "THIRD_PLACE",
        [[losers[0], losers[1]]],
        thirdPlaceCourtIds
      );
    }
  }
}
