"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PLAYER_COUNT_OPTIONS } from "@/lib/validation";
import type { AdminGroup } from "./types";

export function PlayerSetupPanel({
  tournamentId,
  groups,
  onChange,
}: {
  tournamentId: string;
  groups: AdminGroup[];
  onChange: () => void;
}) {
  const [playerCount, setPlayerCount] = useState(String(PLAYER_COUNT_OPTIONS[0]));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/setup-groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerCount: Number(playerCount) }),
        }
      );
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

  if (groups.length > 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-navy-900">
        Set up groups
      </h2>
      <p className="mb-4 text-sm text-navy-600">
        Doubles pool play with 4 teams per group. Choose the total number of
        players and groups/teams will be created automatically, labeled
        A1–A4, B1–B4, and so on. (16 players = 2 groups, 32 = 4 groups,
        64 = 8 groups — kept to powers of 2 so the elimination bracket
        works cleanly later.)
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="playerCount">Total players</Label>
          <Select
            id="playerCount"
            required
            value={playerCount}
            onChange={(e) => setPlayerCount(e.target.value)}
            className="w-36"
          >
            {PLAYER_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} players
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating groups..." : "Create groups"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
