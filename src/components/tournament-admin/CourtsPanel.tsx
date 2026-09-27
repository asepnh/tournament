"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { AdminCourt } from "./types";

export function CourtsPanel({
  tournamentId,
  courts,
  locked,
  onChange,
}: {
  tournamentId: string;
  courts: AdminCourt[];
  locked: boolean;
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
      const res = await fetch(`/api/tournaments/${tournamentId}/courts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setName("");
      onChange();
    } catch {
      setError("Something went wrong. Please try again.");
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
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy-900">Courts</h2>

      {courts.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-2">
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
        <p className="text-sm text-navy-500">
          Courts are locked once matches have been generated.
        </p>
      ) : (
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
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
