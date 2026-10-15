import Link from "next/link";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/lib/superAdmin";
import { SignOutButton } from "@/components/SignOutButton";

export async function DashboardNav({ userName }: { userName?: string | null }) {
  const session = await auth();
  const showUsers = session?.user ? await isSuperAdmin(session.user.id) : false;

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
          {showUsers && (
            <Link
              href="/dashboard/users"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-navy-100 transition-colors hover:bg-navy-800 hover:text-white"
            >
              Users
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
