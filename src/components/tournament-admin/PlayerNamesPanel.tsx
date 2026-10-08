"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { randomizePairing } from "@/lib/randomizePairing";
import type { AdminGroup } from "./types";

type NameState = Record<string, { player1Name: string; player2Name: string }>;

function buildInitialState(groups: AdminGroup[]): NameState {
  const initial: NameState = {};
  for (const g of groups) {
    for (const t of g.teams) {
      initial[t.id] = {
        player1Name: t.player1Name ?? "",
        player2Name: t.player2Name ?? "",
      };
    }
  }
  return initial;
}

function buildInitialRosterText(groups: AdminGroup[]): string {
  const names: string[] = [];
  for (const g of groups) {
    for (const t of g.teams) {
      if (t.player1Name) names.push(t.player1Name);
      if (t.player2Name) names.push(t.player2Name);
    }
  }
  return names.join("\n");
}

function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function PlayerNamesPanel({
  tournamentId,
  groups,
  onChange,
}: {
  tournamentId: string;
  groups: AdminGroup[];
  onChange: () => void;
}) {
  const orderedTeams = groups.flatMap((g) => g.teams);
  const expectedCount = orderedTeams.length * 2;

  const [names, setNames] = useState<NameState>(() => buildInitialState(groups));
  const [roster, setRoster] = useState<string>(() => buildInitialRosterText(groups));
  const [seeds, setSeeds] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  if (groups.length === 0) {
    return null;
  }

  const rosterCount = parseLines(roster).length;

  function updateName(
    teamId: string,
    field: "player1Name" | "player2Name",
    value: string
  ) {
    setNames((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: value },
    }));
    setSaved(false);
  }

  async function saveTeams(
    teams: { id: string; player1Name: string; player2Name: string }[]
  ) {
    const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teams }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Something went wrong");
    }
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const teams = Object.entries(names).map(([id, n]) => ({
        id,
        player1Name: n.player1Name,
        player2Name: n.player2Name,
      }));
      await saveTeams(teams);
      setSaved(true);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleRandomize() {
    setError(null);
    setSaved(false);

    const rosterLines = parseLines(roster);
    const seedLines = parseLines(seeds);

    if (rosterLines.length !== expectedCount) {
      setError(
        `Enter exactly ${expectedCount} names (one per line) — you entered ${rosterLines.length}`
      );
      return;
    }
    const tooLong = rosterLines.find((l) => l.length > 60);
    if (tooLong) {
      setError("Names must be 60 characters or fewer");
      return;
    }

    setLoading(true);
    try {
      const groupSlots = groups.map((g) => ({
        teamIds: g.teams.map((t) => t.id),
      }));
      const assignments = randomizePairing(rosterLines, seedLines, groupSlots);
      await saveTeams(
        assignments.map((a) => ({
          id: a.teamId,
          player1Name: a.player1Name,
          player2Name: a.player2Name,
        }))
      );

      const nextNames: NameState = {};
      for (const a of assignments) {
        nextNames[a.teamId] = {
          player1Name: a.player1Name,
          player2Name: a.player2Name,
        };
      }
      setNames(nextNames);
      setSaved(true);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-navy-900">
        Player names
      </h2>
      <p className="mb-4 text-sm text-navy-600">
        Shown on the public results page (e.g. &ldquo;A1 (John &amp;
        Jane)&rdquo;) once saved; teams without names just show their label.
      </p>

      <div className="mb-6 rounded-lg border border-navy-200 p-3">
        <p className="mb-2 text-sm font-semibold text-navy-900">
          Randomize pairing
        </p>
        <p className="mb-2 text-sm text-navy-600">
          Paste or type all {expectedCount} players, one name per line, then
          randomly pair them into teams and assign them across the groups.
        </p>
        <Textarea
          rows={6}
          value={roster}
          onChange={(e) => setRoster(e.target.value)}
          placeholder={`Player 1\nPlayer 2\nPlayer 3\n...`}
        />
        <div className="mt-1 text-xs text-navy-400">
          {rosterCount} / {expectedCount} names entered
        </div>

        <div className="mt-3">
          <p className="mb-1 text-sm font-medium text-navy-700">
            Seeded players (optional)
          </p>
          <p className="mb-2 text-xs text-navy-500">
            List a few names from the roster above, one per line, in
            priority order (first = seed 1). Each seed is paired with a
            random unseeded partner and spread into a different group from
            the other seeds.
          </p>
          <Textarea
            rows={3}
            value={seeds}
            onChange={(e) => setSeeds(e.target.value)}
            placeholder={`Top player\nSecond-best player\n...`}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <Button onClick={handleRandomize} disabled={loading} variant="secondary">
            {loading ? "Randomizing..." : "Randomize Pairing"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {groups.map((g) => (
          <div key={g.id}>
            <p className="mb-2 font-semibold text-navy-900">Group {g.label}</p>
            <div className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-x-3 gap-y-2">
              {g.teams.map((t) => (
                <Fragment key={t.id}>
                  <span className="text-sm font-semibold text-navy-700">
                    {t.label}
                  </span>
                  <Input
                    placeholder="Player 1 name"
                    value={names[t.id]?.player1Name ?? ""}
                    onChange={(e) =>
                      updateName(t.id, "player1Name", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Player 2 name"
                    value={names[t.id]?.player2Name ?? ""}
                    onChange={(e) =>
                      updateName(t.id, "player2Name", e.target.value)
                    }
                  />
                </Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {saved && !error && (
        <p className="mt-3 text-sm text-navy-600">Saved.</p>
      )}

      <Button onClick={handleSave} disabled={loading} className="mt-4">
        {loading ? "Saving..." : "Save names"}
      </Button>
    </Card>
  );
}
