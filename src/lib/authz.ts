import { prisma } from "@/lib/prisma";

export async function getOwnedTournament(tournamentId: string, userId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament || tournament.ownerId !== userId) {
    return null;
  }
  return tournament;
}
