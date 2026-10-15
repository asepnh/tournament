"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { MIN_PLAYER_COUNT, MAX_PLAYER_COUNT } from "@/lib/validation";
import { planGroupSizes } from "@/lib/groupPlanning";
import { advancingOptions, defaultAdvancing } from "@/lib/advancing";
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
  const [playerCount, setPlayerCount] = useState("");
  const [advancing, setAdvancing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The valid "teams advancing" choices depend on how the players split into
  // groups, so work them out live from the player count being typed.
  const count = Number(playerCount);
  const validCount =
    Number.isInteger(count) &&
    count >= MIN_PLAYER_COUNT &&
    count <= MAX_PLAYER_COUNT &&
    count % 2 === 0;
  const groupSizes = validCount ? planGroupSizes(count / 2) : null;
  const advancingChoices = groupSizes ? advancingOptions(groupSizes) : [];
  const advancingTeams = groupSizes
    ? advancingChoices.includes(Number(advancing))
      ? Number(advancing)
      : defaultAdvancing(groupSizes)
    : null;

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
          body: JSON.stringify({
            playerCount: Number(playerCount),
            advancingTeams: advancingTeams ?? undefined,
          }),
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
        Doubles pool play. Enter the total number of players — any even
        number from {MIN_PLAYER_COUNT} to {MAX_PLAYER_COUNT} — and
        groups/teams will be created automatically, labeled A1–A4, B1–B6,
        and so on. Groups end up with 3–6 teams each (the exact split
        depends on the count, kept to a power-of-2 number of groups so the
        elimination bracket works cleanly later). Also choose how many teams
        advance to the elimination round.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="playerCount">Total players</Label>
          <Input
            id="playerCount"
            type="number"
            min={MIN_PLAYER_COUNT}
            max={MAX_PLAYER_COUNT}
            step={2}
            required
            value={playerCount}
            onChange={(e) => setPlayerCount(e.target.value)}
            className="w-28"
          />
        </div>
        <div>
          <Label htmlFor="advancingTeams">Teams advancing</Label>
          <Select
            id="advancingTeams"
            disabled={advancingTeams === null}
            value={advancingTeams ?? ""}
            onChange={(e) => setAdvancing(e.target.value)}
            className="w-56"
          >
            {advancingTeams === null && (
              <option value="">Enter players first</option>
            )}
            {groupSizes &&
              advancingChoices.map((n) => (
                <option key={n} value={n}>
                  {n} teams (top {n / groupSizes.length} per group)
                </option>
              ))}
          </Select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating groups..." : "Create groups"}
        </Button>
      </form>
      {groupSizes && (
        <p className="mt-3 text-sm text-navy-600">
          {count / 2} teams in {groupSizes.length} group
          {groupSizes.length === 1 ? "" : "s"}; the best {advancingTeams} go
          through to the elimination round.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
