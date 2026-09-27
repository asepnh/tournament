import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { enterResultSchema } from "@/lib/validation";
import { advanceBracketIfStageComplete } from "@/lib/bracket-progress";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, matchId } = await params;
  const tournament = await getOwnedTournament(id, session.user.id);
  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.tournamentId !== id) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = enterResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { teamAScores, teamBScores } = parsed.data;
  const aSets = teamAScores.filter((s, i) => s > teamBScores[i]).length;
  const bSets = teamAScores.length - aSets;

  if (aSets === bSets) {
    return NextResponse.json(
      { error: "The game cannot end in a tie — correct the scores" },
      { status: 400 }
    );
  }

  const winnerId = aSets > bSets ? match.teamAId : match.teamBId;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.match.update({
      where: { id: matchId },
      data: {
        teamAScores,
        teamBScores,
        winnerId,
        status: "COMPLETED",
      },
    });
    await advanceBracketIfStageComplete(tx, id, result.stage);
    return result;
  });

  return NextResponse.json({ match: updated });
}
