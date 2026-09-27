"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { roundTabLabel, STAGE_ORDER } from "@/lib/stageLabels";
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
  const [bracketError, setBracketError] = useState<string | null>(null);
  const [bracketLoading, setBracketLoading] = useState(false);

  const stageRounds = useMemo(() => {
    const map = new Map<string, { stage: string; round: number; matches: AdminMatch[] }>();
    for (const m of matches) {
      const key = `${m.stage}-${m.round}`;
      if (!map.has(key)) map.set(key, { stage: m.stage, round: m.round, matches: [] });
      map.get(key)!.matches.push(m);
    }
    return Array.from(map.values()).sort((a, b) => {
      const stageDiff = STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
      if (stageDiff !== 0) return stageDiff;
      return a.round - b.round;
    });
  }, [matches]);

  const poolMatches = useMemo(
    () => matches.filter((m) => m.stage === "POOL"),
    [matches]
  );
  const bracketMatches = useMemo(
    () => matches.filter((m) => m.stage !== "POOL"),
    [matches]
  );
  const poolComplete =
    poolMatches.length > 0 && poolMatches.every((m) => m.status === "COMPLETED");
  const canGenerateBracket = poolComplete && bracketMatches.length === 0;

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

  async function handleGenerateBracket() {
    setBracketError(null);
    setBracketLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/generate-bracket`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setBracketError(data.error ?? "Something went wrong");
        return;
      }
      onChange();
    } catch {
      setBracketError("Something went wrong. Please try again.");
    } finally {
      setBracketLoading(false);
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
        {stageRounds.map(({ stage, round, matches: roundMatches }) => (
          <div key={`${stage}-${round}`}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-500">
              {roundTabLabel(stage, round)}
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

      {canGenerateBracket && (
        <div className="mt-6 border-t border-navy-200 pt-4">
          <p className="mb-3 text-sm text-navy-600">
            Pool play is complete. Generate the elimination bracket from the
            top 2 teams in each group.
          </p>
          <Button onClick={handleGenerateBracket} disabled={bracketLoading}>
            {bracketLoading ? "Generating..." : "Generate elimination bracket"}
          </Button>
          {bracketError && (
            <p className="mt-2 text-sm text-red-600">{bracketError}</p>
          )}
        </div>
      )}
    </Card>
  );
}
