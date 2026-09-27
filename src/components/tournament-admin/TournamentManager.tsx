"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PublicLinkBanner } from "./PublicLinkBanner";
import { CourtsPanel } from "./CourtsPanel";
import { PlayerSetupPanel } from "./PlayerSetupPanel";
import { MatchesPanel } from "./MatchesPanel";
import { StandingsPanel } from "./StandingsPanel";
import type { TournamentDetail } from "./types";

export function TournamentManager({ initial }: { initial: TournamentDetail }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${data.tournament.id}`);
    if (res.ok) {
      const fresh = await res.json();
      setData(fresh);
    }
  }, [data.tournament.id]);

  async function handleDelete() {
    if (!confirm(`Delete "${data.tournament.name}"? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/tournaments/${data.tournament.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  const matchesGenerated = data.matches.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            {data.tournament.name}
          </h1>
          {data.tournament.description && (
            <p className="mt-1 max-w-2xl text-sm text-navy-600">
              {data.tournament.description}
            </p>
          )}
        </div>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete tournament"}
        </Button>
      </div>

      <PublicLinkBanner slug={data.tournament.slug} />

      <CourtsPanel
        tournamentId={data.tournament.id}
        courts={data.courts}
        locked={matchesGenerated}
        onChange={refresh}
      />

      <PlayerSetupPanel
        tournamentId={data.tournament.id}
        groups={data.groups}
        onChange={refresh}
      />

      <MatchesPanel
        tournamentId={data.tournament.id}
        matches={data.matches}
        groups={data.groups}
        courts={data.courts}
        onChange={refresh}
      />

      <StandingsPanel groups={data.groups} matches={data.matches} />
    </div>
  );
}
