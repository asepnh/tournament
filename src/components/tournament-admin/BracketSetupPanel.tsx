"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import {
  isValidKnockoutTeamCount,
  knockoutByeCount,
  MAX_KNOCKOUT_TEAMS,
  MIN_KNOCKOUT_TEAMS,
} from "@/lib/knockout";
import type { AdminTeam } from "./types";

/**
 * Creates a knockout-only tournament's bracket: the admin types the number of
 * teams in an empty field. The same field stays on the page afterwards, so
 * teams can be added or removed until the bracket (the matches) is generated.
 */
export function BracketSetupPanel({
  tournamentId,
  teams,
  locked,
  onChange,
}: {
  tournamentId: string;
  /** Current teams, in seed order (empty before the bracket is created). */
  teams: AdminTeam[];
  /** The matches have been generated, so the number of teams is fixed. */
  locked: boolean;
  onChange: () => void;
}) {
  const current = teams.length;
  const [value, setValue] = useState(current > 0 ? String(current) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const count = Number(value);
  const valid = value !== "" && isValidKnockoutTeamCount(count);
  const byes = valid ? knockoutByeCount(count) : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    setSaved(false);

    // Lowering the count removes the highest seeds; warn if that drops names.
    const removed = teams.slice(count);
    const namedRemoved = removed.filter((t) => t.player1Name || t.player2Name);
    if (
      namedRemoved.length > 0 &&
      !confirm(
        `Removing ${removed.length} team${removed.length === 1 ? "" : "s"} (${removed
          .map((t) => t.label)
          .join(", ")}) also deletes their player names. Continue?`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/setup-bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCount: count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setSaved(true);
      onChange();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (locked) {
    return (
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-navy-900">Bracket</h2>
        <p className="text-sm text-navy-600">
          {current} teams ({current * 2} players). The number of teams is fixed
          because the bracket has been generated.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-navy-900">
        {current === 0 ? "Create bracket" : "Bracket"}
      </h2>
      <p className="mb-4 text-sm text-navy-600">
        Doubles knockout, straight into the bracket with no group stage. Enter
        the number of teams (2 players each), from {MIN_KNOCKOUT_TEAMS} to{" "}
        {MAX_KNOCKOUT_TEAMS}. If it isn&apos;t a power of 2 (4, 8 or 16), the
        top seeds get a bye and skip the first round. Teams are labeled T1, T2,
        and so on, where the number is the bracket seed.
        {current > 0 &&
          " You can add or remove teams any time until the bracket is generated."}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="teamCount">Number of teams</Label>
          <Input
            id="teamCount"
            type="number"
            inputMode="numeric"
            min={MIN_KNOCKOUT_TEAMS}
            max={MAX_KNOCKOUT_TEAMS}
            step={1}
            placeholder={`${MIN_KNOCKOUT_TEAMS}-${MAX_KNOCKOUT_TEAMS}`}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            className="w-28"
          />
        </div>
        <Button type="submit" disabled={loading || !valid || count === current}>
          {loading
            ? "Saving..."
            : current === 0
              ? "Create bracket"
              : "Update teams"}
        </Button>
      </form>
      {value !== "" && !valid && (
        <p className="mt-2 text-sm text-red-600">
          Enter a whole number from {MIN_KNOCKOUT_TEAMS} to {MAX_KNOCKOUT_TEAMS}.
        </p>
      )}
      {valid && (
        <p className="mt-3 text-sm text-navy-600">
          {count} teams = {count * 2} players
          {byes > 0 ? `, ${byes} bye${byes === 1 ? "" : "s"}` : ""}
        </p>
      )}
      {saved && !error && <p className="mt-2 text-sm text-navy-600">Saved.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
