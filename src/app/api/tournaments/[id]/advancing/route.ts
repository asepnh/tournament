import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { updateAdvancingSchema } from "@/lib/validation";
import { advancingOptions } from "@/lib/advancing";

// Changes how many teams advance to the elimination bracket. Allowed any
// time until the bracket has been generated.
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
  const parsed = updateAdvancingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const bracketMatches = await prisma.match.count({
    where: { tournamentId: id, stage: { not: "POOL" } },
  });
  if (bracketMatches > 0) {
    return NextResponse.json(
      { error: "The elimination bracket has already been generated" },
      { status: 409 }
    );
  }

  const groups = await prisma.group.findMany({
    where: { tournamentId: id },
    include: { _count: { select: { teams: true } } },
  });
  if (groups.length === 0) {
    return NextResponse.json(
      { error: "Set the player count first to create the groups" },
      { status: 400 }
    );
  }

  const options = advancingOptions(groups.map((g) => g._count.teams));
  const { advancingTeams } = parsed.data;
  if (!options.includes(advancingTeams)) {
    return NextResponse.json(
      { error: `Teams advancing must be one of: ${options.join(", ")}` },
      { status: 400 }
    );
  }

  await prisma.tournament.update({
    where: { id },
    data: { advancingTeams },
  });
  return NextResponse.json({ ok: true, advancingTeams });
}
