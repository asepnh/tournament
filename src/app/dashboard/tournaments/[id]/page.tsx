import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedTournament } from "@/lib/authz";
import { DashboardNav } from "@/components/DashboardNav";
import { TournamentManager } from "@/components/tournament-admin/TournamentManager";

export default async function TournamentAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const { id } = await params;
  const tournament = await getOwnedTournament(id, session.user.id);
  if (!tournament) {
    notFound();
  }

  const [courts, groups, matches] = await Promise.all([
    prisma.court.findMany({
      where: { tournamentId: id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.group.findMany({
      where: { tournamentId: id },
      orderBy: { label: "asc" },
      include: { teams: { orderBy: { label: "asc" } } },
    }),
    prisma.match.findMany({
      where: { tournamentId: id },
      orderBy: [{ stage: "asc" }, { round: "asc" }, { court: { name: "asc" } }],
      include: { teamA: true, teamB: true, court: true, winner: true },
    }),
  ]);

  return (
    <div className="min-h-svh">
      <DashboardNav userName={session.user.name} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <TournamentManager
          initial={{ tournament, courts, groups, matches }}
        />
      </main>
    </div>
  );
}
