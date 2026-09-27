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

export const setupGroupsSchema = z.object({
  playerCount: z
    .number()
    .int()
    .positive()
    .refine((n) => n % 8 === 0, {
      message: "Player count must be a multiple of 8 (4 doubles teams per group)",
    }),
});

const setScoreSchema = z.number().int().min(0).max(99);

export const enterResultSchema = z
  .object({
    teamAScores: z.array(setScoreSchema).min(1).max(5),
    teamBScores: z.array(setScoreSchema).min(1).max(5),
  })
  .refine((data) => data.teamAScores.length === data.teamBScores.length, {
    message: "Both teams must have the same number of sets entered",
  })
  .refine(
    (data) => data.teamAScores.every((score, i) => score !== data.teamBScores[i]),
    { message: "A set cannot end in a tie" }
  );
