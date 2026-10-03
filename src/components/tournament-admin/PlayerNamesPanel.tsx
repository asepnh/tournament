"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
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

export function PlayerNamesPanel({
  tournamentId,
  groups,
  onChange,
}: {
  tournamentId: string;
  groups: AdminGroup[];
  onChange: () => void;
}) {
  const [names, setNames] = useState<NameState>(() => buildInitialState(groups));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  if (groups.length === 0) {
    return null;
  }

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
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams }),
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

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-navy-900">
        Player names
      </h2>
      <p className="mb-4 text-sm text-navy-600">
        Optional — add each team&apos;s two player names. Shown on the
        public results page (e.g. &ldquo;A1 (John &amp; Jane)&rdquo;) once
        saved; teams without names just show their label.
      </p>
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
