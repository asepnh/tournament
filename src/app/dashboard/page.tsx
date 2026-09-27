import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/DashboardNav";
import { CreateTournamentForm } from "@/components/CreateTournamentForm";
import { Card } from "@/components/ui/Card";

const STATUS_LABEL: Record<string, string> = {
  SETUP: "Setting up",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const tournaments = await prisma.tournament.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-svh">
      <DashboardNav userName={session.user.name} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-navy-900">
          Your tournaments
        </h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {tournaments.length === 0 && (
            <Card className="sm:col-span-2">
              <p className="text-sm text-navy-600">
                You haven&apos;t created any tournaments yet. Create your
                first one below.
              </p>
            </Card>
          )}
          {tournaments.map((t) => (
            <Link key={t.id} href={`/dashboard/tournaments/${t.id}`}>
              <Card className="h-full transition-colors hover:border-accent-500">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-navy-900">{t.name}</h2>
                  <span className="whitespace-nowrap rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-700">
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                {t.description && (
                  <p className="line-clamp-2 text-sm text-navy-600">
                    {t.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-navy-400">/t/{t.slug}</p>
              </Card>
            </Link>
          ))}
        </div>

        <CreateTournamentForm />
      </main>
    </div>
  );
}
