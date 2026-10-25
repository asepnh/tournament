import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { setupBracketSchema } from "@/lib/validation";
import { knockoutTeamLabel, sortTeamsBySeed } from "@/lib/knockout";

// Sets the number of teams (T1..Tn, numbered by bracket seed) of a
// knockout-only tournament, creating or removing teams at the end as needed.
// These tournaments have no groups. The count can change any time until the
// bracket has been generated; the admin UI derives it from the roster size.
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

  const matchCount = await prisma.match.count({ where: { tournamentId: id } });
  if (matchCount > 0) {
    return NextResponse.json(
      {
        error:
          "The bracket has already been generated, so the number of teams can't change any more.",
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
  const existing = sortTeamsBySeed(
    await prisma.team.findMany({ where: { tournamentId: id } })
  );

  await prisma.$transaction([
    prisma.tournament.update({
      where: { id },
      data: { playerCount: teamCount * 2 },
    }),
    // More teams: add T(existing+1)..Tn. Fewer: drop the highest seeds. No
    // matches exist yet, so nothing references the removed teams.
    prisma.team.createMany({
      data: Array.from(
        { length: Math.max(0, teamCount - existing.length) },
        (_, i) => ({
          label: knockoutTeamLabel(existing.length + i + 1),
          tournamentId: id,
        })
      ),
    }),
    prisma.team.deleteMany({
      where: { id: { in: existing.slice(teamCount).map((t) => t.id) } },
    }),
  ]);

  const teams = sortTeamsBySeed(
    await prisma.team.findMany({ where: { tournamentId: id } })
  );
  return NextResponse.json({
    ok: true,
    teams: teams.map((t) => ({ id: t.id, label: t.label })),
  });
}
