"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AdminMatch } from "./types";

function playerNames(team: {
  player1Name: string | null;
  player2Name: string | null;
}): string | null {
  const names = [team.player1Name, team.player2Name].filter(
    (n): n is string => !!n && n.trim().length > 0
  );
  return names.length > 0 ? names.join(" & ") : null;
}

export function MatchResultForm({
  tournamentId,
  match,
  onSaved,
}: {
  tournamentId: string;
  match: AdminMatch;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(match.status !== "COMPLETED");
  const [scoreA, setScoreA] = useState(match.teamAScores[0] ?? 0);
  const [scoreB, setScoreB] = useState(match.teamBScores[0] ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${match.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamAScores: [scoreA],
            teamBScores: [scoreB],
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setEditing(false);
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    const winnerIsA = match.winnerId === match.teamAId;
    const namesA = playerNames(match.teamA);
    const namesB = playerNames(match.teamB);
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="inline-grid grid-cols-3 items-center justify-items-center gap-x-4 gap-y-0.5">
          <span className="flex flex-col items-center">
            <span
              className={`font-sans text-xl ${
                winnerIsA ? "font-bold text-navy-900" : "font-semibold text-navy-500"
              }`}
            >
              {match.teamA.label}
            </span>
            {namesA && (
              <span className="text-xs text-navy-400">{namesA}</span>
            )}
          </span>
          <span className="text-sm text-navy-400">vs</span>
          <span className="flex flex-col items-center">
            <span
              className={`font-mono text-xl ${
                !winnerIsA ? "font-bold text-navy-900" : "font-semibold text-navy-500"
              }`}
            >
              {match.teamB.label}
            </span>
            {namesB && (
              <span className="text-xs text-navy-400">{namesB}</span>
            )}
          </span>

          <span
            className={`text-base ${winnerIsA ? "font-semibold text-navy-900" : "text-navy-500"}`}
          >
            {match.teamAScores[0]}
          </span>
          <span className="text-sm text-navy-400">:</span>
          <span
            className={`text-base ${!winnerIsA ? "font-semibold text-navy-900" : "text-navy-500"}`}
          >
            {match.teamBScores[0]}
          </span>
        </div>
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    );
  }

  const editNamesA = playerNames(match.teamA);
  const editNamesB = playerNames(match.teamB);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid w-fit grid-cols-[6rem_6rem] items-end gap-x-2 gap-y-1">
        <span
          className="truncate text-center text-xs font-semibold text-navy-700"
          title={editNamesA ?? undefined}
        >
          {match.teamA.label}
          {editNamesA && (
            <span className="block truncate font-normal text-navy-400">
              {editNamesA}
            </span>
          )}
        </span>
        <span
          className="truncate text-center text-xs font-semibold text-navy-700"
          title={editNamesB ?? undefined}
        >
          {match.teamB.label}
          {editNamesB && (
            <span className="block truncate font-normal text-navy-400">
              {editNamesB}
            </span>
          )}
        </span>
        <Input
          type="number"
          min={0}
          value={scoreA}
          onChange={(e) => setScoreA(Number(e.target.value))}
          onFocus={(e) => e.target.select()}
          className="text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`${match.teamA.label} score`}
        />
        <Input
          type="number"
          min={0}
          value={scoreB}
          onChange={(e) => setScoreB(Number(e.target.value))}
          onFocus={(e) => e.target.select()}
          className="text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`${match.teamB.label} score`}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save result"}
        </Button>
        {match.status === "COMPLETED" && (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
