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
      <p className="text-sm text-navy-300">
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
          const winnerIsA = m.winnerId !== null && decided;
          return (
            <div
              key={m.id}
              className="rounded-lg border border-navy-700 bg-navy-900/40 p-3"
            >
              <div className="mb-2 flex items-center justify-between text-xs text-navy-400">
                <span>
                  {m.courtName}
                  {m.groupLabel && <> · Group {m.groupLabel}</>}
                </span>
                <span>{decided ? "Final" : "Scheduled"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span
                  className={
                    winnerIsA ? "font-semibold text-accent-400" : "text-navy-100"
                  }
                >
                  {m.teamALabel}
                </span>
                <span className="text-navy-300">
                  {decided
                    ? m.teamAScores
                        .map((a, i) => `${a}-${m.teamBScores[i]}`)
                        .join(", ")
                    : "vs"}
                </span>
                <span
                  className={
                    decided && !winnerIsA
                      ? "font-semibold text-accent-400"
                      : "text-navy-100"
                  }
                >
                  {m.teamBLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
