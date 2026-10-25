"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import {
  knockoutByeCount,
  MAX_KNOCKOUT_TEAMS,
  MIN_KNOCKOUT_TEAMS,
} from "@/lib/knockout";

const TEAM_COUNT_OPTIONS = Array.from(
  { length: MAX_KNOCKOUT_TEAMS - MIN_KNOCKOUT_TEAMS + 1 },
  (_, i) => MIN_KNOCKOUT_TEAMS + i
);

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
        the number of teams (2 players each), from {MIN_KNOCKOUT_TEAMS} to{" "}
        {MAX_KNOCKOUT_TEAMS}. If it isn&apos;t a power of 2 (4, 8 or 16), the top
        seeds get a bye and skip the first round. Teams are labeled T1, T2, and
        so on, where the number is the bracket seed.
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
            {TEAM_COUNT_OPTIONS.map((n) => {
              const byes = knockoutByeCount(n);
              return (
                <option key={n} value={n}>
                  {n} teams ({n * 2} players
                  {byes > 0 ? `, ${byes} bye${byes === 1 ? "" : "s"}` : ""})
                </option>
              );
            })}
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
