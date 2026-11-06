import { z } from "zod";
import {
  isValidKnockoutTeamCount,
  MAX_KNOCKOUT_TEAMS,
  MIN_KNOCKOUT_TEAMS,
} from "@/lib/knockout";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createTournamentSchema = z.object({
  name: z.string().trim().min(1, "Tournament name is required").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // "Groups, then knockout" (default) or straight into a knockout bracket.
  format: z.enum(["POOL_PLAY", "KNOCKOUT_ONLY"]).default("POOL_PLAY"),
  // Players per team: 1 (singles) or 2 (doubles). Fixed once set — see the
  // note on Tournament.teamSize in schema.prisma.
  teamSize: z.union([z.literal(1), z.literal(2)]).default(2),
});

export const setupBracketSchema = z.object({
  teamCount: z
    .number()
    .int()
    .refine(isValidKnockoutTeamCount, {
      message: `Number of teams must be between ${MIN_KNOCKOUT_TEAMS} and ${MAX_KNOCKOUT_TEAMS}`,
    }),
});

export const renameCourtSchema = z.object({
  name: z.string().trim().min(1, "Court name is required").max(60),
});

export const updateMatchCourtSchema = z.object({
  courtId: z.string().min(1, "Choose a court"),
});

export const addCourtSchema = z.object({
  name: z.string().trim().min(1, "Court name is required").max(60),
  // Group stage vs elimination round; omitted = group stage.
  phase: z.enum(["POOL", "ELIMINATION"]).default("POOL"),
});

// Groups end up with 3-6 teams each, and the group count is always chosen to
// be a power of 2 (the elimination bracket relies on that to avoid byes) —
// see src/lib/groupPlanning.ts. That scheme covers every team count from MIN
// to MAX with no gaps; 48 is a real ceiling, not arbitrary: it's the most
// teams 8 groups (the max the bracket's Round-of-16-down-to-Final chain
// supports) can hold at 6 teams/group. These bounds are in teams, not
// players, so they apply the same way whether teamSize is 1 or 2.
export const MIN_TEAM_COUNT = 4;
export const MAX_TEAM_COUNT = 48;

export function minPlayerCount(teamSize: number): number {
  return MIN_TEAM_COUNT * teamSize;
}

export function maxPlayerCount(teamSize: number): number {
  return MAX_TEAM_COUNT * teamSize;
}

export const setupGroupsSchema = z.object({
  // Checked against the tournament's teamSize in the route, since the right
  // bounds and divisibility depend on it.
  playerCount: z.number().int().min(1).max(MAX_TEAM_COUNT * 2),
  // Teams that advance to the elimination bracket. Which values are valid
  // depends on the group split, so the route checks it (see advancing.ts);
  // omitted = top 2 per group.
  advancingTeams: z.number().int().optional(),
});

export const updateAdvancingSchema = z.object({
  advancingTeams: z.number().int(),
});

export const updatePairingsSchema = z.object({
  stage: z.enum(["ROUND_OF_16", "QUARTERFINAL", "SEMIFINAL"]),
  matches: z
    .array(
      z.object({
        id: z.string().min(1),
        teamAId: z.string().min(1),
        teamBId: z.string().min(1),
      })
    )
    .min(1),
});

const playerNameField = z
  .string()
  .trim()
  .max(60, "Name must be 60 characters or fewer")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

export const updateTeamNamesSchema = z.object({
  teams: z
    .array(
      z.object({
        id: z.string().min(1),
        player1Name: playerNameField,
        player2Name: playerNameField,
      })
    )
    .min(1),
});

const setScoreSchema = z.number().int().min(0).max(99);

// Phase 1 is single-game matches only (one score per side). Phase 4 will let
// the admin configure a best-of-N format and this will allow more sets.
export const enterResultSchema = z
  .object({
    teamAScores: z.array(setScoreSchema).length(1),
    teamBScores: z.array(setScoreSchema).length(1),
  })
  .refine(
    (data) => data.teamAScores.every((score, i) => score !== data.teamBScores[i]),
    { message: "The game cannot end in a tie" }
  );
