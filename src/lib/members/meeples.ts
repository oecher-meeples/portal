import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";

export type {
  MembershipState,
  MembershipDates,
} from "@/lib/members/membership-state";
export {
  getMembershipState,
  nextTurnOfTheYear,
  computeMembershipEndsAt,
} from "@/lib/members/membership-state";

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

function displayNameFor(user: AuthUser) {
  return user.name?.trim() || user.email?.split("@")[0] || "Meeple";
}

/**
 * A Meeple is 1:1 the login account and comes into existence on first login
 * (see docs/adr/0002) — so reading the current Meeple creates it if needed.
 */
export async function ensureMeeple(user: AuthUser) {
  const displayName = displayNameFor(user);

  return prisma.meeple.upsert({
    where: { neonAuthUserId: user.id },
    update: { displayName },
    create: { neonAuthUserId: user.id, displayName },
  });
}

export async function getCurrentMeeple() {
  const user = await getCurrentUser();
  if (!user) return null;
  return ensureMeeple(user);
}

export async function requireMeeple() {
  const meeple = await getCurrentMeeple();
  if (!meeple) {
    redirect("/login");
  }
  return meeple;
}

/**
 * Like `requireMeeple`, but also requires a specific permission (e.g.
 * "lfg:participate") — used by feature actions that a "Ausgetreten"-Meeple
 * (#332) must no longer be able to call, even though it's still logged in.
 */
export async function requireMeeplePermission(permissionKey: string) {
  const meeple = await requireMeeple();
  if (
    !meeple.neonAuthUserId ||
    !(await hasPermission(meeple.neonAuthUserId, permissionKey))
  ) {
    redirect("/403");
  }
  return meeple;
}
