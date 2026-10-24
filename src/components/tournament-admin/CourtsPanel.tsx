"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { AdminCourt, CourtPhase } from "./types";

async function addCourt(tournamentId: string, name: string, phase: CourtPhase) {
  const res = await fetch(`/api/tournaments/${tournamentId}/courts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phase }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Something went wrong");
  }
}

function CourtList({
  tournamentId,
  title,
  hint,
  phase,
  courts,
  locked,
  lockedText,
  extra,
  onChange,
}: {
  tournamentId: string;
  title: string;
  hint: string;
  phase: CourtPhase;
  courts: AdminCourt[];
  locked: boolean;
  lockedText: string;
  extra?: React.ReactNode;
  onChange: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await addCourt(tournamentId, name, phase);
      setName("");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(courtId: string) {
    setError(null);
    const res = await fetch(
      `/api/tournaments/${tournamentId}/courts/${courtId}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    onChange();
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      <p className="mb-3 text-xs text-navy-500">{hint}</p>

      {courts.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {courts.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-full bg-navy-100 px-3 py-1 text-sm text-navy-700"
            >
              {c.name}
              {!locked && (
                <button
                  type="button"
                  onClick={() => handleRemove(c.id)}
                  className="text-navy-400 hover:text-red-600"
                  aria-label={`Remove ${c.name}`}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {locked ? (
        <p className="text-sm text-navy-500">{lockedText}</p>
      ) : (
        <>
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              placeholder="Court name (e.g. Court 1)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="shrink-0">
              Add
            </Button>
          </form>
          {extra}
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function CourtsPanel({
  tournamentId,
  courts,
  poolLocked,
  eliminationLocked,
  knockoutOnly = false,
  onChange,
}: {
  tournamentId: string;
  courts: AdminCourt[];
  /** Knockout-only tournaments have a single list of courts. */
  knockoutOnly?: boolean;
  /** Pool matches exist, so group stage courts can't change. */
  poolLocked: boolean;
  /** The bracket exists, so elimination courts can't change. */
  eliminationLocked: boolean;
  onChange: () => void;
}) {
  const poolCourts = courts.filter((c) => c.phase === "POOL");
  const eliminationCourts = courts.filter((c) => c.phase === "ELIMINATION");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  async function copyGroupCourts() {
    setCopyError(null);
    setCopying(true);
    try {
      for (const c of poolCourts) {
        await addCourt(tournamentId, c.name, "ELIMINATION");
      }
      onChange();
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : "Something went wrong");
      onChange();
    } finally {
      setCopying(false);
    }
  }

  if (knockoutOnly) {
    return (
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-navy-900">Courts</h2>
        <CourtList
          tournamentId={tournamentId}
          title="Courts"
          hint="Used for the knockout rounds."
          phase="ELIMINATION"
          courts={eliminationCourts}
          locked={eliminationLocked}
          lockedText="Locked once the bracket has been generated."
          onChange={onChange}
        />
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy-900">Courts</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <CourtList
          tournamentId={tournamentId}
          title="Group stage courts"
          hint="Used for the pool play schedule."
          phase="POOL"
          courts={poolCourts}
          locked={poolLocked}
          lockedText="Locked once the match schedule has been generated."
          onChange={onChange}
        />
        <CourtList
          tournamentId={tournamentId}
          title="Elimination courts"
          hint="Used for the knockout rounds. Leave empty to reuse the group stage courts."
          phase="ELIMINATION"
          courts={eliminationCourts}
          locked={eliminationLocked}
          lockedText="Locked once the elimination bracket has been generated."
          extra={
            poolCourts.length > 0 &&
            eliminationCourts.length === 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={copyGroupCourts}
                  disabled={copying}
                  className="text-sm font-medium text-navy-600 underline hover:text-navy-900 disabled:opacity-50"
                >
                  {copying ? "Copying..." : "Copy group stage courts"}
                </button>
                {copyError && (
                  <p className="mt-1 text-sm text-red-600">{copyError}</p>
                )}
              </div>
            )
          }
          onChange={onChange}
        />
      </div>
    </Card>
  );
}
