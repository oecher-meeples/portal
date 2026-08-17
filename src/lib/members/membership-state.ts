import type { Meeple } from "@prisma/client";

/** Derived from resignedAt / membershipEndsAt / anonymizedAt — never stored. */
export type MembershipState =
  "aktiv" | "gekuendigt" | "ausgetreten" | "anonymisiert";

export type MembershipDates = Pick<
  Meeple,
  "resignedAt" | "membershipEndsAt" | "anonymizedAt"
>;

export function getMembershipState(
  meeple: MembershipDates,
  now: Date = new Date(),
): MembershipState {
  if (meeple.anonymizedAt) return "anonymisiert";
  if (!meeple.resignedAt) return "aktiv";
  if (
    meeple.membershipEndsAt &&
    meeple.membershipEndsAt.getTime() <= now.getTime()
  ) {
    return "ausgetreten";
  }
  return "gekuendigt";
}

/** The turn of the year a resignation recorded now takes effect on. */
export function nextTurnOfTheYear(now: Date = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
}
