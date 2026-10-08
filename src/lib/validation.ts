import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createTournamentSchema = z.object({
  name: z.string().trim().min(1, "Tournament name is required").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const addCourtSchema = z.object({
  name: z.string().trim().min(1, "Court name is required").max(60),
});

// Groups end up with 3-6 teams each, and the group count is always chosen to
// be a power of 2 (the elimination bracket relies on that to avoid byes) —
// see src/lib/groupPlanning.ts. That scheme covers every even player count
// from MIN to MAX with no gaps; 96 is a real ceiling, not arbitrary: it's the
// most players 8 groups (the max the bracket's Round-of-16-down-to-Final
// chain supports) can hold at 6 teams/group.
export const MIN_PLAYER_COUNT = 8;
export const MAX_PLAYER_COUNT = 96;

export const setupGroupsSchema = z.object({
  playerCount: z
    .number()
    .int()
    .min(MIN_PLAYER_COUNT, `Must be at least ${MIN_PLAYER_COUNT} players`)
    .max(MAX_PLAYER_COUNT, `Must be at most ${MAX_PLAYER_COUNT} players`)
    .refine((n) => n % 2 === 0, { message: "Player count must be even" }),
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
