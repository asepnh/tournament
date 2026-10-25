import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { updateMatchCourtSchema } from "@/lib/validation";
import { courtsForStage } from "@/lib/courts";

// Moves one match to another court. It only changes where the match is
// played, so it works whether or not the match has been played yet. The new
// court must be one of the courts used for the match's part of the tournament.
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

  const match = await prisma.match.findFirst({
    where: { id: matchId, tournamentId: id },
  });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateMatchCourtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const courts = await prisma.court.findMany({ where: { tournamentId: id } });
  const allowed = courtsForStage(match.stage, courts);
  if (!allowed.some((c) => c.id === parsed.data.courtId)) {
    return NextResponse.json(
      { error: "That court isn't available for this part of the tournament" },
      { status: 400 }
    );
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { courtId: parsed.data.courtId },
    include: { court: true },
  });
  return NextResponse.json({ match: updated });
}
