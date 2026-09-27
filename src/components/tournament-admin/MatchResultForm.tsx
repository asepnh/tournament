"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AdminMatch } from "./types";

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
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className={winnerIsA ? "font-semibold text-navy-900" : "text-navy-500"}>
            {match.teamA.label} {match.teamAScores.join("-")}
          </span>
          <span className="text-navy-400">vs</span>
          <span className={!winnerIsA ? "font-semibold text-navy-900" : "text-navy-500"}>
            {match.teamBScores.join("-")} {match.teamB.label}
          </span>
        </div>
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid w-fit grid-cols-[4.5rem_4.5rem] items-center gap-x-2 gap-y-1">
        <span className="truncate text-center text-xs font-semibold text-navy-700">
          {match.teamA.label}
        </span>
        <span className="truncate text-center text-xs font-semibold text-navy-700">
          {match.teamB.label}
        </span>
        <Input
          type="number"
          min={0}
          value={scoreA}
          onChange={(e) => setScoreA(Number(e.target.value))}
          className="text-center"
          aria-label={`${match.teamA.label} score`}
        />
        <Input
          type="number"
          min={0}
          value={scoreB}
          onChange={(e) => setScoreB(Number(e.target.value))}
          className="text-center"
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
