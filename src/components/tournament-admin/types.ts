export type AdminTournament = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "SETUP" | "IN_PROGRESS" | "COMPLETED";
  playerCount: number | null;
};

export type AdminCourt = {
  id: string;
  name: string;
};

export type AdminTeam = {
  id: string;
  label: string;
};

export type AdminGroup = {
  id: string;
  label: string;
  teams: AdminTeam[];
};

export type AdminMatch = {
  id: string;
  stage: "POOL" | "ROUND_OF_16" | "QUARTERFINAL" | "SEMIFINAL" | "FINAL";
  round: number;
  groupId: string | null;
  courtId: string;
  court: { id: string; name: string };
  teamAId: string;
  teamBId: string;
  teamA: { id: string; label: string };
  teamB: { id: string; label: string };
  teamAScores: number[];
  teamBScores: number[];
  winnerId: string | null;
  status: "SCHEDULED" | "COMPLETED";
};

export type TournamentDetail = {
  tournament: AdminTournament;
  courts: AdminCourt[];
  groups: AdminGroup[];
  matches: AdminMatch[];
};
