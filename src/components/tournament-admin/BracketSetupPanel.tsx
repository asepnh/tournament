"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { KNOCKOUT_TEAM_COUNTS } from "@/lib/knockout";

export function BracketSetupPanel({
  tournamentId,
  hasTeams,
  onChange,
}: {
  tournamentId: string;
  hasTeams: boolean;
  onChange: () => void;
}) {
  const [teamCount, setTeamCount] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (hasTeams) {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/setup-bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      onChange();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-navy-900">
        Set up bracket
      </h2>
      <p className="mb-4 text-sm text-navy-600">
        Doubles knockout, straight into the bracket with no group stage. Pick
        the number of teams (2 players each); the bracket has no byes, so it
        is 2, 4, 8 or 16 teams. Teams are labeled T1, T2, and so on, where the
        number is the bracket seed.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="teamCount">Number of teams</Label>
          <Select
            id="teamCount"
            value={teamCount}
            onChange={(e) => setTeamCount(Number(e.target.value))}
            className="w-56"
          >
            {KNOCKOUT_TEAM_COUNTS.map((n) => (
              <option key={n} value={n}>
                {n} teams ({n * 2} players)
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create bracket"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
