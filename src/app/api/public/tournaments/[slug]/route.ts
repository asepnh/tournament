import { NextResponse } from "next/server";
import { getPublicTournamentData } from "@/lib/public-tournament";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = await getPublicTournamentData(slug);
  if (!data) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
