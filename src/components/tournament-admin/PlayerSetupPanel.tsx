"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
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
    return (
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-navy-900">
          Groups &amp; teams
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className="rounded-lg border border-navy-200 p-3">
              <p className="mb-2 font-semibold text-navy-900">Group {g.label}</p>
              <ul className="space-y-1 text-sm text-navy-600">
                {g.teams.map((t) => (
                  <li key={t.id}>{t.label}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-navy-900">
        Set up groups
      </h2>
      <p className="mb-4 text-sm text-navy-600">
        Doubles pool play with 4 teams per group. Enter the total number of
        players (must be a multiple of 8) and groups/teams will be created
        automatically, labeled A1–A4, B1–B4, and so on.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="playerCount">Total players</Label>
          <Input
            id="playerCount"
            type="number"
            min={8}
            step={8}
            required
            value={playerCount}
            onChange={(e) => setPlayerCount(e.target.value)}
            className="w-32"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating groups..." : "Create groups"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
