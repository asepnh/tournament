import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";

export async function GET(
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

  const [courts, groups, matches] = await Promise.all([
    prisma.court.findMany({
      where: { tournamentId: id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.group.findMany({
      where: { tournamentId: id },
      orderBy: { label: "asc" },
      include: { teams: { orderBy: { label: "asc" } } },
    }),
    prisma.match.findMany({
      where: { tournamentId: id },
      orderBy: [{ stage: "asc" }, { round: "asc" }, { court: { name: "asc" } }],
      include: { teamA: true, teamB: true, court: true, winner: true },
    }),
  ]);

  return NextResponse.json({ tournament, courts, groups, matches });
}

export async function DELETE(
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

  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
