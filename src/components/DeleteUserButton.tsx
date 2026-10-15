"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function DeleteUserButton({
  userId,
  label,
  tournamentCount,
}: {
  userId: string;
  label: string;
  tournamentCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const warning =
      tournamentCount > 0
        ? ` This also deletes their ${tournamentCount} tournament${tournamentCount === 1 ? "" : "s"}.`
        : "";
    if (!confirm(`Delete the account ${label}?${warning} This cannot be undone.`)) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="danger" onClick={handleDelete} disabled={loading}>
        {loading ? "Deleting..." : "Delete"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
