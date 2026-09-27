import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { setupGroupsSchema } from "@/lib/validation";
import { indexToLetters } from "@/lib/labels";

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

  const existingGroupCount = await prisma.group.count({
    where: { tournamentId: id },
  });
  if (existingGroupCount > 0) {
    return NextResponse.json(
      {
        error:
          "Groups have already been generated for this tournament. Delete the tournament and start over to change the player count.",
      },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = setupGroupsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { playerCount } = parsed.data;
  const teamCount = playerCount / 2;
  const groupCount = teamCount / 4;

  const groups = await prisma.$transaction(async (tx) => {
    await tx.tournament.update({
      where: { id },
      data: { playerCount },
    });

    const createdGroups = [];
    for (let g = 0; g < groupCount; g++) {
      const groupLabel = indexToLetters(g);
      const group = await tx.group.create({
        data: { label: groupLabel, tournamentId: id },
      });
      const teams = await Promise.all(
        Array.from({ length: 4 }, (_, t) =>
          tx.team.create({
            data: {
              label: `${groupLabel}${t + 1}`,
              groupId: group.id,
              tournamentId: id,
            },
          })
        )
      );
      createdGroups.push({ ...group, teams });
    }
    return createdGroups;
  });

  return NextResponse.json({ groups }, { status: 201 });
}
