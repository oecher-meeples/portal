import { redirect } from "next/navigation";
import type { Meeple } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";

/** Derived from resignedAt / membershipEndsAt / anonymizedAt — never stored. */
export type MembershipState =
  | "aktiv"
  | "gekuendigt"
  | "ausgetreten"
  | "anonymisiert";

export type MembershipDates = Pick<
  Meeple,
  "resignedAt" | "membershipEndsAt" | "anonymizedAt"
>;

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export const MEMBERSHIP_STATE_LABELS: Record<MembershipState, string> = {
  aktiv: "aktiv",
  gekuendigt: "gekündigt",
  ausgetreten: "ausgetreten",
  anonymisiert: "anonymisiert",
};

export function getMembershipState(
  meeple: MembershipDates,
  now: Date = new Date(),
): MembershipState {
  if (meeple.anonymizedAt) return "anonymisiert";
  if (!meeple.resignedAt) return "aktiv";
  if (meeple.membershipEndsAt && meeple.membershipEndsAt.getTime() <= now.getTime()) {
    return "ausgetreten";
  }
  return "gekuendigt";
}

/** The turn of the year a resignation recorded now takes effect on. */
export function nextTurnOfTheYear(now: Date = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
}

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
