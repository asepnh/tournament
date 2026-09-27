import type { PublicGroupStanding } from "@/lib/public-tournament";

export function GroupStandingsView({
  groups,
}: {
  groups: PublicGroupStanding[];
}) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-navy-600">
        Groups haven&apos;t been set up yet — check back soon.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((g) => (
        <div
          key={g.groupLabel}
          className="rounded-lg border border-navy-200 bg-white p-4"
        >
          <p className="mb-3 font-semibold text-navy-900">Group {g.groupLabel}</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-navy-500">
                <th className="pb-1 font-normal">Team</th>
                <th className="pb-1 font-normal">P</th>
                <th className="pb-1 font-normal">W-L</th>
                <th className="pb-1 font-normal">Pts</th>
                <th className="pb-1 font-normal">Diff</th>
              </tr>
            </thead>
            <tbody>
              {g.standings.map((s, i) => (
                <tr
                  key={s.teamLabel}
                  className={
                    i < 2
                      ? "font-semibold text-navy-900"
                      : "text-navy-500"
                  }
                >
                  <td className="py-0.5">{s.teamLabel}</td>
                  <td className="py-0.5">{s.played}</td>
                  <td className="py-0.5">
                    {s.wins}-{s.losses}
                  </td>
                  <td className="py-0.5">{s.points}</td>
                  <td className="py-0.5">
                    {s.differential > 0 ? "+" : ""}
                    {s.differential}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
