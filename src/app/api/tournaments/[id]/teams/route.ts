import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { updateTeamNamesSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
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

  const body = await request.json().catch(() => null);
  const parsed = updateTeamNamesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { teams } = parsed.data;
  const existingCount = await prisma.team.count({
    where: { id: { in: teams.map((t) => t.id) }, tournamentId: id },
  });
  if (existingCount !== teams.length) {
    return NextResponse.json(
      { error: "One or more teams don't belong to this tournament" },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    teams.map((t) =>
      prisma.team.update({
        where: { id: t.id },
        data: { player1Name: t.player1Name, player2Name: t.player2Name },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
