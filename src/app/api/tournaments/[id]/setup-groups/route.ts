import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { setupGroupsSchema } from "@/lib/validation";
import { indexToLetters } from "@/lib/labels";
import { planGroupSizes } from "@/lib/groupPlanning";

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
  const groupSizes = planGroupSizes(teamCount);

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.tournament.update({
          where: { id },
          data: { playerCount },
        });

        // Groups are created sequentially (each needs its own id before we
        // can attach teams to it) but teams are batch-inserted in a single
        // query instead of one create() per team — with larger tournaments
        // (e.g. 64+ players / 8+ groups) doing 30+ individual inserts inside
        // one interactive transaction was slow enough to hit the timeout.
        const groups = [];
        for (let g = 0; g < groupSizes.length; g++) {
          groups.push(
            await tx.group.create({
              data: { label: indexToLetters(g), tournamentId: id },
            })
          );
        }

        await tx.team.createMany({
          data: groups.flatMap((group, g) =>
            Array.from({ length: groupSizes[g] }, (_, t) => ({
              label: `${group.label}${t + 1}`,
              groupId: group.id,
              tournamentId: id,
            }))
          ),
        });
      },
      { timeout: 15000 }
    );
  } catch (err) {
    console.error("setup-groups failed", err);
    return NextResponse.json(
      { error: "Failed to create groups. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
