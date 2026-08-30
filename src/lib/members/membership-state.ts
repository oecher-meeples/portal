/**
 * Derived from a Member's resignedAt/membershipEndsAt (moved off Meeple in
 * #328) plus the Meeple's own anonymizedAt — never stored.
 */
export type MembershipState =
  "aktiv" | "gekuendigt" | "ausgetreten" | "anonymisiert";

export type MembershipDates = {
  resignedAt: Date | null;
  membershipEndsAt: Date | null;
  anonymizedAt: Date | null;
};

export function getMembershipState(
  member: MembershipDates,
  now: Date = new Date(),
): MembershipState {
  if (member.anonymizedAt) return "anonymisiert";
  if (!member.resignedAt) return "aktiv";
  if (
    member.membershipEndsAt &&
    member.membershipEndsAt.getTime() <= now.getTime()
  ) {
    return "ausgetreten";
  }
  return "gekuendigt";
}

/** The turn of the year a resignation recorded now takes effect on. */
export function nextTurnOfTheYear(now: Date = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
}

/** Minimum notice a resignation needs before the coming turn of the year (#258). */
const RESIGNATION_MIN_NOTICE_DAYS = 28;

/**
 * When a resignation recorded now takes effect — the coming turn of the
 * year, unless fewer than 4 weeks remain until it (#258): then the
 * membership runs one extra full year, ending at the turn of the year
 * *after* next instead.
 */
export function computeMembershipEndsAt(now: Date = new Date()): Date {
  const comingTurnOfTheYear = nextTurnOfTheYear(now);
  const noticeDeadline = new Date(
    comingTurnOfTheYear.getTime() -
      RESIGNATION_MIN_NOTICE_DAYS * 24 * 60 * 60 * 1000,
  );

  if (now.getTime() > noticeDeadline.getTime()) {
    return new Date(
      Date.UTC(comingTurnOfTheYear.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0),
    );
  }

  return comingTurnOfTheYear;
}
