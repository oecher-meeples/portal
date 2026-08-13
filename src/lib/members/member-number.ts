import { prisma } from "@/lib/utils/prisma";

export type SetMemberNumberResult = { error: string } | { success: true };

/** Added to a bumped Meeple's old number so it never collides with another live number. */
const CONFLICT_OFFSET = 9900;

/**
 * Overwrites a Meeple's membership number. If the requested number is
 * already taken by someone else, that Meeple is bumped to
 * `ihre alte Nummer + 9900` instead of rejecting the change — admins may
 * deliberately want to hand out a specific low number (e.g. after a member
 * left and the club wants their old number reused).
 *
 * Does *not* check permissions — that is the caller's job.
 */
export async function setMemberNumber(
  meepleId: string,
  newNumber: number,
): Promise<SetMemberNumberResult> {
  if (!Number.isInteger(newNumber) || newNumber <= 0) {
    return { error: "Die Mitgliedsnummer muss eine positive ganze Zahl sein." };
  }

  const meeple = await prisma.meeple.findUnique({ where: { id: meepleId } });
  if (!meeple) return { error: "Mitglied nicht gefunden." };
  if (meeple.memberNumber === newNumber) return { success: true };

  const conflictingMeeple = await prisma.meeple.findUnique({
    where: { memberNumber: newNumber },
  });

  if (!conflictingMeeple) {
    await prisma.meeple.update({
      where: { id: meepleId },
      data: { memberNumber: newNumber },
    });
    return { success: true };
  }

  const bumpedNumber = conflictingMeeple.memberNumber + CONFLICT_OFFSET;
  const bumpedNumberTaken = await prisma.meeple.findUnique({
    where: { memberNumber: bumpedNumber },
  });
  if (bumpedNumberTaken) {
    return {
      error: `Die Ausweichnummer ${bumpedNumber} ist bereits vergeben — bitte manuell klären.`,
    };
  }

  // Move the conflicting Meeple out of the way first: both numbers stay
  // unique at every point, which a single combined update could not guarantee.
  await prisma.$transaction([
    prisma.meeple.update({
      where: { id: conflictingMeeple.id },
      data: { memberNumber: bumpedNumber },
    }),
    prisma.meeple.update({
      where: { id: meepleId },
      data: { memberNumber: newNumber },
    }),
  ]);

  return { success: true };
}
