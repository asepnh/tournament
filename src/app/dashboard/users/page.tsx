import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superAdmin";
import { DashboardNav } from "@/components/DashboardNav";
import { DeleteUserButton } from "@/components/DeleteUserButton";
import { Card } from "@/components/ui/Card";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/users");
  }
  if (!(await isSuperAdmin(session.user.id))) {
    notFound();
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { tournaments: true } } },
  });

  return (
    <div className="min-h-svh">
      <DashboardNav userName={session.user.name} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-navy-900">Admin accounts</h1>
        <p className="mb-6 text-sm text-navy-600">
          {users.length} account{users.length === 1 ? "" : "s"}. Deleting an
          account also deletes all of its tournaments.
        </p>

        <div className="flex flex-col gap-3">
          {users.map((u) => {
            const isSelf = u.id === session.user.id;
            const label = u.name ? `${u.name} (${u.email})` : u.email;
            return (
              <Card key={u.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-navy-900">
                      <span className="truncate">{u.name ?? u.email}</span>
                      {u.isSuperAdmin && (
                        <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-700">
                          Super admin
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-xs font-normal text-navy-400">
                          you
                        </span>
                      )}
                    </p>
                    {u.name && (
                      <p className="truncate text-sm text-navy-600">{u.email}</p>
                    )}
                    <p className="mt-1 text-xs text-navy-400">
                      Joined {u.createdAt.toLocaleDateString("en-US")} ·{" "}
                      {u._count.tournaments} tournament
                      {u._count.tournaments === 1 ? "" : "s"}
                    </p>
                  </div>
                  {!isSelf && !u.isSuperAdmin && (
                    <DeleteUserButton
                      userId={u.id}
                      label={label}
                      tournamentCount={u._count.tournaments}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
