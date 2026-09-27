import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createTournamentSchema } from "@/lib/validation";
import { slugify, randomSuffix } from "@/lib/slug";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournaments = await prisma.tournament.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const base = slugify(parsed.data.name);
  let slug = `${base}-${randomSuffix()}`;
  // Extremely unlikely to collide, but guard anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.tournament.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${base}-${randomSuffix()}`;
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      slug,
      ownerId: session.user.id,
    },
  });

  return NextResponse.json({ tournament }, { status: 201 });
}
