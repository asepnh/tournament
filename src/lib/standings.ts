export type StandingsMatch = {
  groupId: string | null;
  teamAId: string;
  teamBId: string;
  teamAScores: number[];
  teamBScores: number[];
  winnerId: string | null;
  status: "SCHEDULED" | "COMPLETED";
};

export type TeamStanding = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  differential: number;
};

/**
 * Computes standings for one group: 3 points per win, 0 per loss,
 * ranked by points then point (game score) differential.
 */
export function computeGroupStandings(
  teamIds: string[],
  matches: StandingsMatch[]
): TeamStanding[] {
  const table = new Map<string, TeamStanding>();
  for (const teamId of teamIds) {
    table.set(teamId, {
      teamId,
      played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      differential: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== "COMPLETED" || !match.winnerId) continue;

    const a = table.get(match.teamAId);
    const b = table.get(match.teamBId);
    if (!a || !b) continue;

    const aFor = sum(match.teamAScores);
    const bFor = sum(match.teamBScores);

    a.played += 1;
    b.played += 1;
    a.pointsFor += aFor;
    a.pointsAgainst += bFor;
    b.pointsFor += bFor;
    b.pointsAgainst += aFor;

    if (match.winnerId === match.teamAId) {
      a.wins += 1;
      a.points += 3;
      b.losses += 1;
    } else {
      b.wins += 1;
      b.points += 3;
      a.losses += 1;
    }
  }

  for (const standing of table.values()) {
    standing.differential = standing.pointsFor - standing.pointsAgainst;
  }

  return Array.from(table.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.differential !== x.differential) return y.differential - x.differential;
    return y.pointsFor - x.pointsFor;
  });
}

function sum(scores: number[]): number {
  return scores.reduce((total, s) => total + s, 0);
}
