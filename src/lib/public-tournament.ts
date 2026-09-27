import { prisma } from "@/lib/prisma";
import { computeGroupStandings } from "@/lib/standings";

const STAGE_ORDER: Record<string, number> = {
  POOL: 0,
  ROUND_OF_16: 1,
  QUARTERFINAL: 2,
  SEMIFINAL: 3,
  FINAL: 4,
};

export type PublicMatch = {
  id: string;
  courtName: string;
  groupLabel: string | null;
  teamALabel: string;
  teamBLabel: string;
  teamAScores: number[];
  teamBScores: number[];
  winnerId: string | null;
  status: string;
};

export type PublicRound = {
  stage: string;
  round: number;
  matches: PublicMatch[];
};

export type PublicGroupStanding = {
  groupLabel: string;
  standings: {
    teamLabel: string;
    played: number;
    wins: number;
    losses: number;
    points: number;
    pointsFor: number;
    pointsAgainst: number;
    differential: number;
  }[];
};

export type PublicTournamentData = {
  tournament: {
    name: string;
    description: string | null;
    slug: string;
    status: string;
  };
  rounds: PublicRound[];
  groups: PublicGroupStanding[];
};

export async function getPublicTournamentData(
  slug: string
): Promise<PublicTournamentData | null> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return null;

  const [groups, matches] = await Promise.all([
    prisma.group.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { label: "asc" },
      include: { teams: { orderBy: { label: "asc" } } },
    }),
    prisma.match.findMany({
      where: { tournamentId: tournament.id },
      orderBy: [{ stage: "asc" }, { round: "asc" }, { court: { name: "asc" } }],
      include: { teamA: true, teamB: true, court: true, group: true },
    }),
  ]);

  const roundsMap = new Map<string, PublicRound>();
  for (const match of matches) {
    const key = `${match.stage}-${match.round}`;
    if (!roundsMap.has(key)) {
      roundsMap.set(key, { stage: match.stage, round: match.round, matches: [] });
    }
    roundsMap.get(key)!.matches.push({
      id: match.id,
      courtName: match.court.name,
      groupLabel: match.group?.label ?? null,
      teamALabel: match.teamA.label,
      teamBLabel: match.teamB.label,
      teamAScores: match.teamAScores,
      teamBScores: match.teamBScores,
      winnerId: match.winnerId,
      status: match.status,
    });
  }

  const rounds = Array.from(roundsMap.values()).sort((a, b) => {
    const stageDiff = STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
    if (stageDiff !== 0) return stageDiff;
    return a.round - b.round;
  });

  const groupStandings: PublicGroupStanding[] = groups.map((group) => {
    const standings = computeGroupStandings(
      group.teams.map((t) => t.id),
      matches
        .filter((m) => m.groupId === group.id)
        .map((m) => ({
          groupId: m.groupId,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          teamAScores: m.teamAScores,
          teamBScores: m.teamBScores,
          winnerId: m.winnerId,
          status: m.status,
        }))
    );

    const teamLabelById = new Map(group.teams.map((t) => [t.id, t.label]));

    return {
      groupLabel: group.label,
      standings: standings.map((s) => ({
        teamLabel: teamLabelById.get(s.teamId) ?? "?",
        played: s.played,
        wins: s.wins,
        losses: s.losses,
        points: s.points,
        pointsFor: s.pointsFor,
        pointsAgainst: s.pointsAgainst,
        differential: s.differential,
      })),
    };
  });

  return {
    tournament: {
      name: tournament.name,
      description: tournament.description,
      slug: tournament.slug,
      status: tournament.status,
    },
    rounds,
    groups: groupStandings,
  };
}
