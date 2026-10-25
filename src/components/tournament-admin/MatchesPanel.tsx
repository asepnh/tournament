"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { roundTabLabel, STAGE_ORDER } from "@/lib/stageLabels";
import { knockoutByeCount } from "@/lib/knockout";
import { EDITABLE_PAIRING_STAGES } from "@/lib/pairings";
import { EditPairingsForm } from "./EditPairingsForm";
import { MatchCourtEditor } from "./MatchCourtEditor";
import { MatchResultForm } from "./MatchResultForm";
import type { AdminCourt, AdminGroup, AdminMatch } from "./types";

export function MatchesPanel({
  tournamentId,
  matches,
  groups,
  courts,
  advancingTeams,
  knockoutOnly = false,
  teamCount = 0,
  byeTeams = [],
  onChange,
}: {
  tournamentId: string;
  matches: AdminMatch[];
  groups: AdminGroup[];
  courts: AdminCourt[];
  /** Teams that make the bracket; null = top 2 per group (older tournaments). */
  advancingTeams: number | null;
  /** Knockout-only: no pool play, the bracket is generated straight away. */
  knockoutOnly?: boolean;
  /** Teams in a knockout-only bracket. */
  teamCount?: number;
  /** Knockout-only: names of the teams that skipped round 1. */
  byeTeams?: string[];
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bracketError, setBracketError] = useState<string | null>(null);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);

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
  const bracketTeams = advancingTeams ?? groups.length * 2;

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

  if (matches.length === 0 && knockoutOnly) {
    const canGenerateKnockout = teamCount > 0 && courts.length > 0;
    return (
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-navy-900">Matches</h2>
        <p className="mb-4 text-sm text-navy-600">
          {canGenerateKnockout
            ? `Generate the ${teamCount}-team bracket. Seed 1 plays the lowest seed, 2 plays the second lowest, and so on.${
                knockoutByeCount(teamCount) > 0
                  ? ` The top ${knockoutByeCount(teamCount)} seed${knockoutByeCount(teamCount) === 1 ? "" : "s"} get a bye.`
                  : ""
              }`
            : "Add courts and set up the bracket first, then generate it."}
        </p>
        <Button
          onClick={handleGenerateBracket}
          disabled={!canGenerateKnockout || bracketLoading}
        >
          {bracketLoading ? "Generating..." : "Generate elimination bracket"}
        </Button>
        {bracketError && (
          <p className="mt-2 text-sm text-red-600">{bracketError}</p>
        )}
      </Card>
    );
  }

  if (matches.length === 0) {
    const canGenerate =
      groups.length > 0 && courts.some((c) => c.phase === "POOL");
    return (
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-navy-900">Matches</h2>
        <p className="mb-4 text-sm text-navy-600">
          {canGenerate
            ? "Generate the pool play schedule across your courts."
            : "Add group stage courts and set up groups first, then generate the match schedule."}
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
      {byeTeams.length > 0 && (
        <p className="mb-4 text-sm text-navy-600">
          Bye to the next round: {byeTeams.join(", ")}
        </p>
      )}
      <div className="flex flex-col gap-6">
        {stageRounds.map(({ stage, round, matches: roundMatches }) => {
          // Pairings of a knockout round can be changed until it has started.
          const canEditPairings =
            EDITABLE_PAIRING_STAGES.includes(stage) &&
            roundMatches.every(
              (m) => m.status !== "COMPLETED" && m.teamAScores.length === 0
            );
          return (
          <div key={`${stage}-${round}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                {roundTabLabel(stage, round)}
              </h3>
              {canEditPairings && editingStage !== stage && (
                <button
                  type="button"
                  onClick={() => setEditingStage(stage)}
                  className="text-sm font-medium text-navy-600 underline hover:text-navy-900"
                >
                  Edit pairings
                </button>
              )}
            </div>
            {canEditPairings && editingStage === stage ? (
              <EditPairingsForm
                tournamentId={tournamentId}
                stage={stage}
                matches={roundMatches}
                groups={groups}
                onCancel={() => setEditingStage(null)}
                onSaved={() => {
                  setEditingStage(null);
                  onChange();
                }}
              />
            ) : (
            <div className="flex flex-col gap-3">
              {roundMatches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-navy-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-navy-500">
                    <span>
                      <MatchCourtEditor
                        tournamentId={tournamentId}
                        match={m}
                        courts={courts}
                        roundMatches={roundMatches}
                        onSaved={onChange}
                      />
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
            )}
          </div>
          );
        })}
      </div>

      {canGenerateBracket && (
        <div className="mt-6 border-t border-navy-200 pt-4">
          <p className="mb-3 text-sm text-navy-600">
            Pool play is complete. Generate the elimination bracket from the
            top {bracketTeams / Math.max(groups.length, 1)} team
            {bracketTeams / Math.max(groups.length, 1) === 1 ? "" : "s"} in
            each group ({bracketTeams} teams).
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
