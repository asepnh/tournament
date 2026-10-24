import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { buildGlobalSchedule } from "@/lib/scheduling";
import { poolCourtIds } from "@/lib/courts";

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

  if (tournament.format === "KNOCKOUT_ONLY") {
    return NextResponse.json(
      { error: "Knockout-only tournaments have no pool play schedule" },
      { status: 400 }
    );
  }

  const existingMatchCount = await prisma.match.count({
    where: { tournamentId: id },
  });
  if (existingMatchCount > 0) {
    return NextResponse.json(
      { error: "Matches have already been generated for this tournament" },
      { status: 409 }
    );
  }

  const [groups, courts] = await Promise.all([
    prisma.group.findMany({
      where: { tournamentId: id },
      include: { teams: true },
      orderBy: { label: "asc" },
    }),
    prisma.court.findMany({
      where: { tournamentId: id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (groups.length === 0) {
    return NextResponse.json(
      { error: "Set the player count first to generate groups and teams" },
      { status: 400 }
    );
  }
  const courtIds = poolCourtIds(courts);
  if (courtIds.length === 0) {
    return NextResponse.json(
      { error: "Add at least one group stage court before generating matches" },
      { status: 400 }
    );
  }
  if (groups.some((g) => g.teams.length < 3 || g.teams.length > 6)) {
    return NextResponse.json(
      { error: "Every group must have between 3 and 6 teams" },
      { status: 400 }
    );
  }

  const schedule = buildGlobalSchedule(
    groups.map((g) => ({ id: g.id, teamIds: g.teams.map((t) => t.id) })),
    courtIds
  );

  await prisma.$transaction([
    prisma.match.createMany({
      data: schedule.map((s) => ({
        tournamentId: id,
        groupId: s.fixture.groupId,
        stage: "POOL" as const,
        round: s.round,
        courtId: s.courtId,
        teamAId: s.fixture.teamAId,
        teamBId: s.fixture.teamBId,
      })),
    }),
    prisma.tournament.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    }),
  ]);

  return NextResponse.json({ ok: true, matchCount: schedule.length });
}
