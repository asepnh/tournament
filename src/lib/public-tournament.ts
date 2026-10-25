import { prisma } from "@/lib/prisma";
import { computeGroupStandings } from "@/lib/standings";
import { STAGE_ORDER } from "@/lib/stageLabels";
import { formatTeamName } from "@/lib/teamDisplay";
import { buildKnockoutFirstRound } from "@/lib/bracket";
import { sortTeamsBySeed } from "@/lib/knockout";

export type PublicMatch = {
  id: string;
  courtName: string;
  groupLabel: string | null;
  teamALabel: string;
  teamBLabel: string;
  teamADisplay: string;
  teamBDisplay: string;
  teamAScores: number[];
  teamBScores: number[];
  winnerLabel: string | null;
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
    teamDisplay: string;
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
    format: "POOL_PLAY" | "KNOCKOUT_ONLY";
  };
  rounds: PublicRound[];
  groups: PublicGroupStanding[];
  /** How many teams from each group go through to the elimination round. */
  advancingPerGroup: number;
  /** Knockout-only: teams that skipped round 1 (display names). */
  byes: string[];
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
      teamADisplay: formatTeamName(
        match.teamA.label,
        match.teamA.player1Name,
        match.teamA.player2Name
      ),
      teamBDisplay: formatTeamName(
        match.teamB.label,
        match.teamB.player1Name,
        match.teamB.player2Name
      ),
      teamAScores: match.teamAScores,
      teamBScores: match.teamBScores,
      winnerLabel:
        match.winnerId === match.teamAId
          ? match.teamA.label
          : match.winnerId === match.teamBId
            ? match.teamB.label
            : null,
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

    const teamById = new Map(group.teams.map((t) => [t.id, t]));

    return {
      groupLabel: group.label,
      standings: standings.map((s) => {
        const team = teamById.get(s.teamId);
        return {
          teamLabel: team?.label ?? "?",
          teamDisplay: team
            ? formatTeamName(team.label, team.player1Name, team.player2Name)
            : "?",
          played: s.played,
          wins: s.wins,
          losses: s.losses,
          points: s.points,
          pointsFor: s.pointsFor,
          pointsAgainst: s.pointsAgainst,
          differential: s.differential,
        };
      }),
    };
  });

  // Knockout-only brackets with a team count that isn't a power of 2 give the
  // top seeds a bye; name them so spectators know where those teams are.
  let byes: string[] = [];
  if (tournament.format === "KNOCKOUT_ONLY" && matches.length > 0) {
    const teams = sortTeamsBySeed(
      await prisma.team.findMany({
        where: { tournamentId: tournament.id, groupId: null },
      })
    );
    if (teams.length >= 2) {
      const byTeam = new Map(teams.map((t) => [t.id, t]));
      byes = buildKnockoutFirstRound(teams.map((t) => t.id)).byes.map((b) => {
        const t = byTeam.get(b.teamId)!;
        return formatTeamName(t.label, t.player1Name, t.player2Name);
      });
    }
  }

  return {
    tournament: {
      name: tournament.name,
      description: tournament.description,
      slug: tournament.slug,
      status: tournament.status,
      format: tournament.format,
    },
    rounds,
    groups: groupStandings,
    // Older tournaments (no saved value) advance the top 2 from each group.
    advancingPerGroup:
      groups.length > 0
        ? (tournament.advancingTeams ?? groups.length * 2) / groups.length
        : 0,
    byes,
  };
}
