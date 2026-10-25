"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { formatTeamName } from "@/lib/teamDisplay";
import { validatePairings } from "@/lib/pairings";
import type { AdminGroup, AdminMatch } from "./types";

type Slot = { teamAId: string; teamBId: string };

/**
 * Lets the admin choose who meets who in a knockout round that hasn't
 * started. Each match gets two dropdowns; every team must be used exactly once.
 */
export function EditPairingsForm({
  tournamentId,
  stage,
  matches,
  groups,
  onCancel,
  onSaved,
}: {
  tournamentId: string;
  stage: string;
  matches: AdminMatch[];
  groups: AdminGroup[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [slots, setSlots] = useState<Record<string, Slot>>(() =>
    Object.fromEntries(
      matches.map((m) => [m.id, { teamAId: m.teamAId, teamBId: m.teamBId }])
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The teams in this round, with a readable name for the dropdowns.
  const teams = new Map<string, string>();
  for (const m of matches) {
    for (const t of [m.teamA, m.teamB]) {
      teams.set(t.id, formatTeamName(t.label, t.player1Name, t.player2Name));
    }
  }
  const groupOf = new Map<string, string>();
  for (const g of groups) for (const t of g.teams) groupOf.set(t.id, g.label);

  const pairings = matches.map((m) => ({ id: m.id, ...slots[m.id] }));
  const problem = validatePairings(
    matches.map((m) => ({ id: m.id, teamAId: m.teamAId, teamBId: m.teamBId })),
    pairings
  );
  // Not a blocker: teams from the same group already met in pool play.
  const rematches = pairings.filter((p) => {
    const a = groupOf.get(p.teamAId);
    return a !== undefined && a === groupOf.get(p.teamBId);
  });
  const unchanged = matches.every(
    (m) =>
      slots[m.id].teamAId === m.teamAId && slots[m.id].teamBId === m.teamBId
  );

  function setTeam(matchId: string, side: "teamAId" | "teamBId", teamId: string) {
    setSlots((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: teamId } }));
  }

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/pairings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, matches: pairings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-accent-500 p-3">
      <p className="mb-3 text-sm text-navy-600">
        Choose who plays who. Each team must be used exactly once. This is
        locked once a match in this round has a result.
      </p>
      <div className="flex flex-col gap-3">
        {matches.map((m, i) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-xs text-navy-500">
              Match {i + 1} · {m.court.name}
            </span>
            {(["teamAId", "teamBId"] as const).map((side, k) => (
              <div key={side} className="flex items-center gap-2">
                {k === 1 && <span className="text-sm text-navy-500">vs</span>}
                <Select
                  aria-label={`Match ${i + 1} team ${k === 0 ? "A" : "B"}`}
                  value={slots[m.id][side]}
                  onChange={(e) => setTeam(m.id, side, e.target.value)}
                  className="w-52"
                >
                  {[...teams.entries()].map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        ))}
      </div>

      {problem && !unchanged && (
        <p className="mt-3 text-sm text-red-600">{problem}</p>
      )}
      {!problem && rematches.length > 0 && (
        <p className="mt-3 text-sm text-navy-600">
          Heads up: {rematches.length === 1 ? "one pairing is" : "some pairings are"}{" "}
          between teams from the same group, who already played each other in
          pool play.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <Button onClick={handleSave} disabled={loading || !!problem || unchanged}>
          {loading ? "Saving..." : "Save pairings"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
