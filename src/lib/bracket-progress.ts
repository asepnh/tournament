import type { Prisma, MatchStage } from "@prisma/client";
import { nextStage, type KnockoutStage } from "./bracket";

type Tx = Prisma.TransactionClient;

export async function createStageMatches(
  tx: Tx,
  tournamentId: string,
  stage: KnockoutStage,
  pairs: [string, string][],
  courtIds: string[]
) {
  if (courtIds.length === 0) {
    throw new Error("No courts available");
  }
  await tx.match.createMany({
    data: pairs.map(([teamAId, teamBId], i) => ({
      tournamentId,
      stage,
      round: 1,
      bracketPosition: i,
      courtId: courtIds[i % courtIds.length],
      teamAId,
      teamBId,
    })),
  });
}

/**
 * Call after a knockout match is marked COMPLETED. If every match in that
 * match's stage is now complete:
 * - Final complete -> tournament marked COMPLETED.
 * - Third Place complete -> nothing further (doesn't gate completion; the
 *   Final decides that independently).
 * - Semifinal complete -> generates both the Final (winners) and the Third
 *   Place match (losers of each semifinal play each other).
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

  if (stage === "FINAL") {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "COMPLETED" },
    });
    return;
  }

  if (stage === "THIRD_PLACE") {
    return;
  }

  const next = nextStage(stage as KnockoutStage);
  if (!next) return;

  const ordered = [...stageMatches].sort(
    (a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)
  );
  const winners = ordered.map((m) => m.winnerId as string);
  const losers = ordered.map((m) =>
    m.winnerId === m.teamAId ? m.teamBId : m.teamAId
  );

  const courts = await tx.court.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "asc" },
  });
  const courtIds = courts.map((c) => c.id);

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
      await createStageMatches(
        tx,
        tournamentId,
        "THIRD_PLACE",
        [[losers[0], losers[1]]],
        courtIds
      );
    }
  }
}
