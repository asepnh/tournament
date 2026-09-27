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

// Fixed choices so the resulting group count (2, 4, or 8) is always a power
// of 2 — the elimination bracket (Phase 2) relies on that to avoid byes.
export const PLAYER_COUNT_OPTIONS = [16, 32, 64] as const;

export const setupGroupsSchema = z.object({
  playerCount: z.union([z.literal(16), z.literal(32), z.literal(64)], {
    message: "Choose 16, 32, or 64 players",
  }),
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
