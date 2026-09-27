import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export function DashboardNav({ userName }: { userName?: string | null }) {
  return (
    <header className="border-b border-navy-800 bg-navy-900">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-bold text-navy-50">
          Pickleball Tournaments
        </Link>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden text-sm text-navy-300 sm:inline">
              {userName}
            </span>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
