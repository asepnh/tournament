import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { addCourtSchema } from "@/lib/validation";

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

  const body = await request.json().catch(() => null);
  const parsed = addCourtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Group stage courts lock once the pool schedule exists; elimination
  // courts stay editable until the bracket has been generated.
  const { name } = parsed.data;
  // A knockout-only tournament only has elimination courts.
  const phase =
    tournament.format === "KNOCKOUT_ONLY" ? "ELIMINATION" : parsed.data.phase;
  const lockedStage =
    phase === "POOL" ? { stage: "POOL" as const } : { stage: { not: "POOL" as const } };
  const lockedMatches = await prisma.match.count({
    where: { tournamentId: id, ...lockedStage },
  });
  if (lockedMatches > 0) {
    return NextResponse.json(
      {
        error:
          phase === "POOL"
            ? "Group stage courts are locked once matches have been generated"
            : "Elimination courts are locked once the bracket has been generated",
      },
      { status: 409 }
    );
  }

  const court = await prisma.court.create({
    data: { name, phase, tournamentId: id },
  });

  return NextResponse.json({ court }, { status: 201 });
}
