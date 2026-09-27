"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MatchResultForm } from "./MatchResultForm";
import type { AdminCourt, AdminGroup, AdminMatch } from "./types";

export function MatchesPanel({
  tournamentId,
  matches,
  groups,
  courts,
  onChange,
}: {
  tournamentId: string;
  matches: AdminMatch[];
  groups: AdminGroup[];
  courts: AdminCourt[];
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rounds = useMemo(() => {
    const map = new Map<number, AdminMatch[]>();
    for (const m of matches) {
      if (!map.has(m.round)) map.set(m.round, []);
      map.get(m.round)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/generate-matches`,
        { method: "POST" }
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

  if (matches.length === 0) {
    const canGenerate = groups.length > 0 && courts.length > 0;
    return (
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-navy-900">Matches</h2>
        <p className="mb-4 text-sm text-navy-600">
          {canGenerate
            ? "Generate the pool play schedule across your courts."
            : "Add courts and set up groups first, then generate the match schedule."}
        </p>
        <Button onClick={handleGenerate} disabled={!canGenerate || loading}>
          {loading ? "Generating..." : "Generate matches"}
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy-900">Matches</h2>
      <div className="flex flex-col gap-6">
        {rounds.map(([round, roundMatches]) => (
          <div key={round}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-500">
              Round {round}
            </h3>
            <div className="flex flex-col gap-3">
              {roundMatches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-navy-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-navy-500">
                    <span>
                      {m.court.name}
                      {m.groupId && (
                        <>
                          {" "}
                          · Group{" "}
                          {groups.find((g) => g.id === m.groupId)?.label}
                        </>
                      )}
                    </span>
                    <span>{m.status === "COMPLETED" ? "Final" : "Scheduled"}</span>
                  </div>
                  <MatchResultForm
                    tournamentId={tournamentId}
                    match={m}
                    onSaved={onChange}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
