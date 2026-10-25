"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { courtsForStage } from "@/lib/courts";
import type { AdminCourt, AdminMatch } from "./types";

/**
 * Shows the court of a match with an Edit link that lets the admin move the
 * match to another court (any match, played or not).
 */
export function MatchCourtEditor({
  tournamentId,
  match,
  courts,
  roundMatches,
  onSaved,
}: {
  tournamentId: string;
  match: AdminMatch;
  courts: AdminCourt[];
  /** All matches of this round, to warn about a court that is already busy. */
  roundMatches: AdminMatch[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [courtId, setCourtId] = useState(match.courtId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const options = courtsForStage(match.stage, courts);
  const busy = roundMatches.some((m) => m.id !== match.id && m.courtId === courtId);

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${match.id}/court`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courtId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setEditing(false);
      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        {match.court.name}
        {options.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setCourtId(match.courtId);
              setError(null);
              setEditing(true);
            }}
            className="underline hover:text-navy-900"
            aria-label={`Change court for this match (now ${match.court.name})`}
          >
            Edit
          </button>
        )}
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Court for this match"
          value={courtId}
          onChange={(e) => setCourtId(e.target.value)}
          className="w-40"
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button
          onClick={handleSave}
          disabled={loading || courtId === match.courtId}
          className="px-3 py-1.5"
        >
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={loading}
          className="px-3 py-1.5"
        >
          Cancel
        </Button>
      </span>
      {busy && (
        <span className="text-xs text-navy-600">
          Another match in this round is already on that court.
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
