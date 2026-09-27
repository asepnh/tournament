import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/Button";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <span className="mb-4 rounded-full bg-navy-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-400">
        Pickleball Tournaments
      </span>
      <h1 className="mb-4 text-3xl font-bold text-navy-50 sm:text-4xl">
        Run your pickleball tournament, share results live
      </h1>
      <p className="mb-8 max-w-lg text-navy-300">
        Create a tournament, set up pool play, and share one link so players
        and spectators can follow match results and group standings live —
        no sign-in required.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {session?.user ? (
          <Link href="/dashboard">
            <Button>Go to dashboard</Button>
          </Link>
        ) : (
          <>
            <Link href="/register">
              <Button>Create an account</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
