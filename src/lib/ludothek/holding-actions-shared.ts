import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { type MembershipState } from "@/lib/members/meeples";
import { HoldingConflictError } from "@/lib/ludothek/holdings";
import { toResult } from "@/lib/utils/action-result";

/**
 * Shared helpers between `holding-actions.ts` and `holding-actions-external.ts`
 * (#333) — split purely to stay under the file-size limit (CLAUDE.md), not a
 * fachliche Grenze: both modules are "the Server-Action layer for GameHolding".
 */

/** Abwicklungs-Use-Case (#522): Ausgetretene dürfen abgeben, daher
 * `settlement` — `assertCanReceive` sperrt das Annehmen separat. */
export async function requireActingMeeple() {
  const { meeple, member, membershipState } = await requireActionPermission(
    "ludothek:borrow",
    { settlement: true },
  );
  return { meeple, member, membershipState };
}

/** Ausgetretene Meeples dürfen abgeben, aber nichts mehr annehmen (siehe CONTEXT.md). */
export function assertCanReceive(membershipState: MembershipState) {
  if (membershipState === "ausgetreten") {
    throw new HoldingConflictError(
      "Ausgetretene Mitglieder können keine Spiele mehr annehmen.",
    );
  }
}

/**
 * Ausleihen/Rückgeben ist fachlich immer ein Vorgang zwischen Vereinsmitglied-
 * Datensätzen (#333) — ein Meeple ohne verknüpftes `Member` (Systemkonto,
 * anonymisierter Alt-Meeple) kann selbst kein Ziel eines Aufenthalts sein.
 */
export function requireOwnMember(member: { id: string } | null) {
  if (!member) {
    throw new HoldingConflictError(
      "Dieses Konto ist mit keinem Vereinsmitglied verknüpft — Ausleihen/Rückgeben ist nur für Vereinsmitglieder möglich.",
    );
  }
  return member;
}

/** Löst die `Member`-Id auf, die zu einem im Picker gewählten `Meeple` gehört —
 * jeder generische Meeple-Picker liefert Meeple-Ids, das Domain-Modell will
 * aber ein `Member`-Ziel (#333). */
export async function requireMemberForMeeple(meepleId: string) {
  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: { id: true },
  });
  if (!member) {
    throw new HoldingConflictError(
      "Diese Person ist mit keinem Vereinsmitglied verknüpft.",
    );
  }
  return member;
}

/** Revalidates the list, admin overview and (if resolvable) the copy's detail page — only called on success. */
async function revalidateGamePaths(gameCopyId: string) {
  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  const copy = await prisma.gameCopy.findUnique({
    where: { id: gameCopyId },
    select: { boardGame: { select: { slug: true } } },
  });
  if (copy) revalidatePath(`/ludothek/${copy.boardGame.slug}`);
}

export function toResultAndRevalidate<T extends { gameCopyId: string }>(
  run: () => Promise<T> | T,
) {
  return toResult(run, (value) => revalidateGamePaths(value.gameCopyId));
}
