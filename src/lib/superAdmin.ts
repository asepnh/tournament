import { prisma } from "@/lib/prisma";

/**
 * Looked up in the database on every check (not read from the JWT) so that
 * promoting, demoting or deleting an account takes effect immediately.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  return user?.isSuperAdmin === true;
}
