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
 * match's stage is now complete, either generates the next stage's matches
 * (pairing consecutive winners in bracket order) or, if the stage was the
 * Final, marks the tournament COMPLETED.
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

  const next = nextStage(stage as KnockoutStage);
  if (!next) {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "COMPLETED" },
    });
    return;
  }

  // Guard against generating the next stage twice if this runs concurrently
  // for two matches finishing at nearly the same time.
  const alreadyGenerated = await tx.match.count({
    where: { tournamentId, stage: next },
  });
  if (alreadyGenerated > 0) return;

  const ordered = [...stageMatches].sort(
    (a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)
  );
  const winners = ordered.map((m) => m.winnerId as string);

  const pairs: [string, string][] = [];
  for (let i = 0; i < winners.length; i += 2) {
    pairs.push([winners[i], winners[i + 1]]);
  }

  const courts = await tx.court.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "asc" },
  });

  await createStageMatches(
    tx,
    tournamentId,
    next,
    pairs,
    courts.map((c) => c.id)
  );
}
