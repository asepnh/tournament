"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { roundTabLabel } from "@/lib/stageLabels";
import type { PublicRound } from "@/lib/public-tournament";

export function MatchResultsView({ rounds }: { rounds: PublicRound[] }) {
  const roundTabs = rounds.map((r) => ({
    id: `${r.stage}-${r.round}`,
    label: roundTabLabel(r.stage, r.round),
  }));
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const activeRound =
    selectedRound && roundTabs.some((t) => t.id === selectedRound)
      ? selectedRound
      : (roundTabs[0]?.id ?? "");

  if (rounds.length === 0) {
    return (
      <p className="text-sm text-navy-600">
        Matches haven&apos;t been scheduled yet — check back soon.
      </p>
    );
  }

  const current = rounds.find(
    (r) => `${r.stage}-${r.round}` === activeRound
  );

  return (
    <div className="flex flex-col gap-4">
      <Tabs tabs={roundTabs} active={activeRound} onChange={setSelectedRound} size="sm" />

      <div className="flex flex-col gap-3">
        {current?.matches.map((m) => {
          const decided = m.status === "COMPLETED";
          const winnerIsA = decided && m.winnerLabel === m.teamALabel;
          return (
            <div
              key={m.id}
              className="rounded-lg border border-navy-200 bg-white p-3"
            >
              <div className="mb-2 flex items-center justify-between text-xs text-navy-500">
                <span>
                  {m.courtName}
                  {m.groupLabel && <> · Group {m.groupLabel}</>}
                </span>
                <span>{decided ? "Final" : "Scheduled"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span
                  className={`min-w-0 ${
                    winnerIsA ? "font-semibold text-navy-900" : "text-navy-600"
                  }`}
                >
                  {m.teamADisplay}
                </span>
                <span className="shrink-0 text-navy-500">
                  {decided
                    ? m.teamAScores
                        .map((a, i) => `${a}-${m.teamBScores[i]}`)
                        .join(", ")
                    : "vs"}
                </span>
                <span
                  className={`min-w-0 text-right ${
                    decided && !winnerIsA
                      ? "font-semibold text-navy-900"
                      : "text-navy-600"
                  }`}
                >
                  {m.teamBDisplay}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
