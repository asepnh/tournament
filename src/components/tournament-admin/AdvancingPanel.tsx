"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { advancingOptions } from "@/lib/advancing";
import type { AdminGroup } from "./types";

export function AdvancingPanel({
  tournamentId,
  groups,
  advancingTeams,
  locked,
  onChange,
}: {
  tournamentId: string;
  groups: AdminGroup[];
  /** Saved value; null = top 2 per group (older tournaments). */
  advancingTeams: number | null;
  /** The bracket exists, so the number can't change any more. */
  locked: boolean;
  onChange: () => void;
}) {
  const current = advancingTeams ?? groups.length * 2;
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  if (groups.length === 0) {
    return null;
  }

  const options = advancingOptions(groups.map((g) => g.teams.length));
  const value = selected ?? current;
  const perGroup = (n: number) => n / groups.length;
  const label = (n: number) =>
    `${n} teams (top ${perGroup(n)} per group)`;

  async function handleSave() {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/advancing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advancingTeams: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setSelected(null);
      setSaved(true);
      onChange();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-navy-900">
        Teams advancing
      </h2>
      {locked ? (
        <p className="text-sm text-navy-600">
          {label(current)} advanced to the elimination round. This is locked
          because the bracket has been generated.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-navy-600">
            How many teams go through to the elimination round. You can change
            this any time until the bracket is generated.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="advancingTeamsEdit">Teams advancing</Label>
              <Select
                id="advancingTeamsEdit"
                value={value}
                onChange={(e) => {
                  setSelected(Number(e.target.value));
                  setSaved(false);
                }}
                className="w-56"
              >
                {options.map((n) => (
                  <option key={n} value={n}>
                    {label(n)}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={handleSave}
              disabled={loading || value === current}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
          {saved && !error && (
            <p className="mt-3 text-sm text-navy-600">Saved.</p>
          )}
        </>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
