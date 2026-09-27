import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";

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
