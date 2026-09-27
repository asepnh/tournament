import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { computeGroupStandings } from "@/lib/standings";
import { isPowerOfTwo, seedFirstRound, stageForTeamCount } from "@/lib/bracket";
import { createStageMatches } from "@/lib/bracket-progress";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tournament = await getOwnedTournament(id, session.user.id);
  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existingBracketMatches = await prisma.match.count({
    where: { tournamentId: id, stage: { not: "POOL" } },
  });
  if (existingBracketMatches > 0) {
    return NextResponse.json(
      { error: "The elimination bracket has already been generated" },
      { status: 409 }
    );
  }

  const [groups, poolMatches, courts] = await Promise.all([
    prisma.group.findMany({
      where: { tournamentId: id },
      orderBy: { label: "asc" },
      include: { teams: true },
    }),
    prisma.match.findMany({
      where: { tournamentId: id, stage: "POOL" },
    }),
    prisma.court.findMany({ where: { tournamentId: id } }),
  ]);

  if (groups.length === 0 || poolMatches.length === 0) {
    return NextResponse.json(
      { error: "Generate the pool play schedule first" },
      { status: 400 }
    );
  }
  if (!poolMatches.every((m) => m.status === "COMPLETED")) {
    return NextResponse.json(
      { error: "Complete every pool play match before generating the bracket" },
      { status: 400 }
    );
  }
  if (!isPowerOfTwo(groups.length)) {
    return NextResponse.json(
      {
        error: `Elimination bracket needs a power-of-2 number of groups (got ${groups.length})`,
      },
      { status: 400 }
    );
  }
  if (courts.length === 0) {
    return NextResponse.json(
      { error: "Add at least one court first" },
      { status: 400 }
    );
  }

  const groupQualifiers = groups.map((group) => {
    const standings = computeGroupStandings(
      group.teams.map((t) => t.id),
      poolMatches
        .filter((m) => m.groupId === group.id)
        .map((m) => ({
          groupId: m.groupId,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          teamAScores: m.teamAScores,
          teamBScores: m.teamBScores,
          winnerId: m.winnerId,
          status: m.status,
        }))
    );
    return {
      groupLabel: group.label,
      winnerTeamId: standings[0].teamId,
      runnerUpTeamId: standings[1].teamId,
    };
  });

  const pairs = seedFirstRound(groupQualifiers);
  const stage = stageForTeamCount(groups.length * 2);

  await prisma.$transaction(async (tx) => {
    await createStageMatches(
      tx,
      id,
      stage,
      pairs,
      courts.map((c) => c.id)
    );
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
