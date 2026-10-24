import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { setupBracketSchema } from "@/lib/validation";
import { knockoutTeamLabel } from "@/lib/knockout";

// Creates the teams (T1..Tn, numbered by bracket seed) for a knockout-only
// tournament. These tournaments have no groups.
export async function POST(
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
  if (tournament.format !== "KNOCKOUT_ONLY") {
    return NextResponse.json(
      { error: "This tournament uses groups — set up the groups instead" },
      { status: 400 }
    );
  }

  const existing = await prisma.team.count({ where: { tournamentId: id } });
  if (existing > 0) {
    return NextResponse.json(
      {
        error:
          "The bracket has already been set up. Delete the tournament and start over to change the number of teams.",
      },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = setupBracketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { teamCount } = parsed.data;
  await prisma.$transaction([
    prisma.tournament.update({
      where: { id },
      data: { playerCount: teamCount * 2 },
    }),
    prisma.team.createMany({
      data: Array.from({ length: teamCount }, (_, i) => ({
        label: knockoutTeamLabel(i + 1),
        tournamentId: id,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
