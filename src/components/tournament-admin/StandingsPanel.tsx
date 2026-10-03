"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { computeGroupStandings } from "@/lib/standings";
import { formatTeamName } from "@/lib/teamDisplay";
import type { AdminGroup, AdminMatch } from "./types";

export function StandingsPanel({
  groups,
  matches,
}: {
  groups: AdminGroup[];
  matches: AdminMatch[];
}) {
  const standingsByGroup = useMemo(() => {
    return groups.map((g) => {
      const teamById = new Map(g.teams.map((t) => [t.id, t]));
      const standings = computeGroupStandings(
        g.teams.map((t) => t.id),
        matches
          .filter((m) => m.groupId === g.id)
          .map((m) => ({
            groupId: m.groupId,
            teamAId: m.teamAId,
            teamBId: m.teamBId,
            teamAScores: m.teamAScores,
            teamBScores: m.teamBScores,
            winnerId: m.winnerId,
            status: m.status,
          }))
      );
      return {
        group: g,
        rows: standings.map((s) => {
          const team = teamById.get(s.teamId);
          return {
            ...s,
            label: team
              ? formatTeamName(team.label, team.player1Name, team.player2Name)
              : "?",
          };
        }),
      };
    });
  }, [groups, matches]);

  if (groups.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy-900">
        Group standings
      </h2>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {standingsByGroup.map(({ group, rows }) => (
          <div key={group.id} className="rounded-lg border border-navy-200 p-3">
            <p className="mb-2 font-semibold text-navy-900">Group {group.label}</p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-navy-500">
                  <th className="py-1 pr-3 font-normal">Team</th>
                  <th className="px-3 py-1 text-right font-normal">W-L</th>
                  <th className="px-3 py-1 text-right font-normal">Pts</th>
                  <th className="pl-3 py-1 text-right font-normal">Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.teamId}
                    className={i < 2 ? "font-semibold text-navy-900" : "text-navy-500"}
                  >
                    <td className="py-1 pr-3">{r.label}</td>
                    <td className="px-3 py-1 text-right">
                      {r.wins}-{r.losses}
                    </td>
                    <td className="px-3 py-1 text-right">{r.points}</td>
                    <td className="pl-3 py-1 text-right">
                      {r.differential > 0 ? "+" : ""}
                      {r.differential}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Card>
  );
}
