import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { getMembershipState } from "@/lib/members/membership-state";

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
  return ensureMeepleFor(user.id, displayNameFor(user));
}

/**
 * Liest zuerst und schreibt nur, wenn der Meeple fehlt oder der aus dem
 * Login abgeleitete `displayName` sich geändert hat (#525) — sonst wäre jeder
 * Seitenaufruf ein Write (`updatedAt`). Per `cache()` je Request einmal, auf
 * primitive Argumente gekeyt (das `user`-Objekt ist nicht identitätsstabil).
 */
const ensureMeepleFor = cache(
  async (neonAuthUserId: string, displayName: string) => {
    const existing = await prisma.meeple.findUnique({
      where: { neonAuthUserId },
    });
    if (existing?.displayName === displayName) return existing;

    return prisma.meeple.upsert({
      where: { neonAuthUserId },
      update: { displayName },
      create: { neonAuthUserId, displayName },
    });
  },
);

export async function getCurrentMeeple() {
  const user = await getCurrentUser();
  if (!user) return null;
  return ensureMeeple(user);
}

/**
 * The Meeple's linked Vereinsmitglied (if any) plus its derived
 * membership state — shared by every guard that enforces "ausgetreten /
 * anonymisiert darf nur abwickeln" (`requireMember`, the action guards,
 * the holding actions). resignedAt/membershipEndsAt live on the Member
 * since #328, anonymizedAt stays on the Meeple.
 */
export async function getMeepleMembership(meeple: {
  id: string;
  anonymizedAt: Date | null;
}) {
  const member = await prisma.member.findUnique({
    where: { meepleId: meeple.id },
    select: { id: true, slug: true, resignedAt: true, membershipEndsAt: true },
  });
  const membershipState = getMembershipState({
    meepleId: meeple.id,
    resignedAt: member?.resignedAt ?? null,
    membershipEndsAt: member?.membershipEndsAt ?? null,
    anonymizedAt: meeple.anonymizedAt,
  });
  return { member, membershipState };
}

export async function requireMeeple() {
  const meeple = await getCurrentMeeple();
  if (!meeple) {
    redirect("/login");
  }
  return meeple;
}
