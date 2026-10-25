import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { renameCourtSchema } from "@/lib/validation";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, courtId } = await params;
  const tournament = await getOwnedTournament(id, session.user.id);
  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const matchCount = await prisma.match.count({
    where: { tournamentId: id, courtId },
  });
  if (matchCount > 0) {
    return NextResponse.json(
      { error: "Cannot remove a court that already has matches scheduled on it" },
      { status: 409 }
    );
  }

  await prisma.court.delete({ where: { id: courtId } });
  return NextResponse.json({ ok: true });
}

// Renaming only changes the label, so it is allowed at any time — including
// after matches have been generated or played on the court.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, courtId } = await params;
  const tournament = await getOwnedTournament(id, session.user.id);
  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = renameCourtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const court = await prisma.court.findFirst({
    where: { id: courtId, tournamentId: id },
  });
  if (!court) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  const updated = await prisma.court.update({
    where: { id: courtId },
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ court: updated });
}
