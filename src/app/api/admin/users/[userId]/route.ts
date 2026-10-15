import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superAdmin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isSuperAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "You can't delete your own account" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.isSuperAdmin) {
    return NextResponse.json(
      { error: "Super admin accounts can't be deleted here" },
      { status: 400 }
    );
  }

  // Tournaments, courts, groups, teams and matches cascade from the user.
  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
