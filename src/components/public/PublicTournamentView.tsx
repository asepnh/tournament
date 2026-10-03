"use client";

import { useState } from "react";
import useSWR from "swr";
import { Tabs } from "@/components/ui/Tabs";
import { MatchResultsView } from "./MatchResultsView";
import { GroupStandingsView } from "./GroupStandingsView";
import type { PublicTournamentData } from "@/lib/public-tournament";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_LABEL: Record<string, string> = {
  SETUP: "Setting up",
  IN_PROGRESS: "Live",
  COMPLETED: "Completed",
};

export function PublicTournamentView({
  slug,
  initial,
}: {
  slug: string;
  initial: PublicTournamentData;
}) {
  const { data } = useSWR<PublicTournamentData>(
    `/api/public/tournaments/${slug}`,
    fetcher,
    { fallbackData: initial, refreshInterval: 5000 }
  );

  const [tab, setTab] = useState<"results" | "standings">("results");
  const current = data ?? initial;

  const finalMatch = current.rounds
    .find((r) => r.stage === "FINAL")
    ?.matches.find((m) => m.winnerLabel);
  const champion = finalMatch
    ? finalMatch.winnerLabel === finalMatch.teamALabel
      ? finalMatch.teamADisplay
      : finalMatch.teamBDisplay
    : null;

  const thirdPlaceMatch = current.rounds
    .find((r) => r.stage === "THIRD_PLACE")
    ?.matches.find((m) => m.winnerLabel);
  const thirdPlace = thirdPlaceMatch
    ? thirdPlaceMatch.winnerLabel === thirdPlaceMatch.teamALabel
      ? thirdPlaceMatch.teamADisplay
      : thirdPlaceMatch.teamBDisplay
    : null;

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col px-4 py-6">
      <header className="mb-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">
            {current.tournament.name}
          </h1>
          <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-700">
            {STATUS_LABEL[current.tournament.status] ?? current.tournament.status}
          </span>
        </div>
        {current.tournament.description && (
          <p className="text-sm text-navy-600">
            {current.tournament.description}
          </p>
        )}
        {champion && (
          <p className="mt-2 text-sm font-semibold text-navy-700">
            Champion: {champion}
          </p>
        )}
        {thirdPlace && (
          <p className="text-sm text-navy-500">3rd place: {thirdPlace}</p>
        )}
      </header>

      <Tabs
        tabs={[
          { id: "results", label: "Match Results" },
          { id: "standings", label: "Group Standings" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as "results" | "standings")}
      />

      <div className="mt-4">
        {tab === "results" ? (
          <MatchResultsView rounds={current.rounds} />
        ) : (
          <GroupStandingsView groups={current.groups} />
        )}
      </div>
    </main>
  );
}
