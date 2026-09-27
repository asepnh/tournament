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
  const initialSets: [number, number][] =
    match.teamAScores.length > 0
      ? match.teamAScores.map((a, i) => [a, match.teamBScores[i]])
      : [
          [0, 0],
          [0, 0],
        ];
  const [sets, setSets] = useState<[number, number][]>(initialSets);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateSet(index: number, team: 0 | 1, value: string) {
    const next: [number, number][] = sets.map((set, i) =>
      i === index
        ? ([
            team === 0 ? Number(value) : set[0],
            team === 1 ? Number(value) : set[1],
          ] as [number, number])
        : set
    );
    setSets(next);
  }

  function addSet() {
    setSets([...sets, [0, 0]]);
  }

  function removeSet(index: number) {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, i) => i !== index));
  }

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
            teamAScores: sets.map((s) => s[0]),
            teamBScores: sets.map((s) => s[1]),
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
          <span className={winnerIsA ? "font-semibold text-accent-400" : "text-navy-200"}>
            {match.teamA.label} {match.teamAScores.join("-")}
          </span>
          <span className="text-navy-500">vs</span>
          <span className={!winnerIsA ? "font-semibold text-accent-400" : "text-navy-200"}>
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
      <div className="flex flex-wrap items-center gap-2">
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              value={set[0]}
              onChange={(e) => updateSet(i, 0, e.target.value)}
              className="w-14 text-center"
              aria-label={`${match.teamA.label} set ${i + 1} score`}
            />
            <span className="text-navy-500">–</span>
            <Input
              type="number"
              min={0}
              value={set[1]}
              onChange={(e) => updateSet(i, 1, e.target.value)}
              className="w-14 text-center"
              aria-label={`${match.teamB.label} set ${i + 1} score`}
            />
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(i)}
                className="ml-1 text-navy-400 hover:text-red-400"
                aria-label={`Remove set ${i + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addSet}
          className="text-sm text-accent-400 hover:underline"
        >
          + set
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

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
