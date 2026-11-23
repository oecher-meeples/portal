import { prisma } from "@/lib/utils/prisma";
import { ANONYMER_MEEPLE_NAME } from "@/lib/ludothek/anonymer-meeple-name";

export { ANONYMER_MEEPLE_NAME };

/** Resolves the collective account's `Member` id — the target for
 * `handOverToExternal()` and the source for `rebookHoldingToMember()`. */
export async function findAnonymerMeepleMember() {
  return prisma.member.findFirst({
    where: {
      meeple: { displayName: ANONYMER_MEEPLE_NAME, neonAuthUserId: null },
    },
    select: { id: true, meepleId: true },
  });
}
