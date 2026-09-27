"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { computeGroupStandings } from "@/lib/standings";
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
      const teamLabelById = new Map(g.teams.map((t) => [t.id, t.label]));
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
        rows: standings.map((s) => ({
          ...s,
          label: teamLabelById.get(s.teamId) ?? "?",
        })),
      };
    });
  }, [groups, matches]);

  if (groups.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy-50">
        Group standings
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {standingsByGroup.map(({ group, rows }) => (
          <div key={group.id} className="rounded-lg border border-navy-700 p-3">
            <p className="mb-2 font-semibold text-navy-100">Group {group.label}</p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-navy-400">
                  <th className="font-normal">Team</th>
                  <th className="font-normal">W-L</th>
                  <th className="font-normal">Pts</th>
                  <th className="font-normal">Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.teamId}
                    className={i < 2 ? "text-accent-400" : "text-navy-200"}
                  >
                    <td className="py-0.5">{r.label}</td>
                    <td className="py-0.5">
                      {r.wins}-{r.losses}
                    </td>
                    <td className="py-0.5">{r.points}</td>
                    <td className="py-0.5">
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
