import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";

export type {
  MembershipState,
  MembershipDates,
} from "@/lib/members/membership-state";
export {
  getMembershipState,
  nextTurnOfTheYear,
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
  const email = user.email ?? null;

  return prisma.meeple.upsert({
    where: { neonAuthUserId: user.id },
    update: { displayName, email },
    create: { neonAuthUserId: user.id, displayName, email },
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
