import { NextResponse } from "next/server";
import type { MatchStage } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { updatePairingsSchema } from "@/lib/validation";
import { validatePairings } from "@/lib/pairings";
import { STAGE_ORDER } from "@/lib/stageLabels";

// Lets the organizer change who meets who in a knockout round, as long as no
// match in that round has a result yet.
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
  const parsed = updatePairingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { stage, matches: next } = parsed.data;

  const current = await prisma.match.findMany({
    where: { tournamentId: id, stage },
  });
  if (current.length === 0) {
    return NextResponse.json(
      { error: "That round hasn't been generated yet" },
      { status: 400 }
    );
  }
  if (current.some((m) => m.status === "COMPLETED" || m.teamAScores.length > 0)) {
    return NextResponse.json(
      { error: "This round has already started — pairings are locked" },
      { status: 409 }
    );
  }
  const laterStages = Object.entries(STAGE_ORDER)
    .filter(([, order]) => order > STAGE_ORDER[stage])
    .map(([name]) => name);
  const laterMatches = await prisma.match.count({
    where: { tournamentId: id, stage: { in: laterStages as MatchStage[] } },
  });
  if (laterMatches > 0) {
    return NextResponse.json(
      { error: "A later round has already been generated" },
      { status: 409 }
    );
  }

  const problem = validatePairings(current, next);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  await prisma.$transaction(
    next.map((m) =>
      prisma.match.update({
        where: { id: m.id },
        data: { teamAId: m.teamAId, teamBId: m.teamBId },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
