"use server";

import { requireActionPermission } from "@/lib/auth/action-guards";
import {
  revealMeepleIban,
  revealPendingIbanChange,
} from "@/lib/members/bank-access-log";

/**
 * Die IBAN-Reveal-Actions — einmal, für alle drei Stellen, die sie brauchen
 * (/admin/bank, Mitglieder-Edit-Dialog, Profil-Bankverbindung). Gated auf
 * `bank:read`, bewusst getrennt von `members:manage`: ein Admin ohne
 * Kassenwart-Recht sieht nur den maskierten Wert. Entschlüsseln, Rate-Limit
 * und Access-Log leben in `bank-access-log.ts`.
 */

export async function revealMemberIban(meepleId: string) {
  const { meeple: actor } = await requireActionPermission("bank:read");
  return revealMeepleIban(meepleId, actor.id);
}

/** Für die offenen IBAN-Änderungsanträge (#356): der Kassenwart soll nicht
 * blind freigeben. */
export async function revealPendingMemberIban(changeId: string) {
  const { meeple: actor } = await requireActionPermission("bank:read");
  return revealPendingIbanChange(changeId, actor.id);
}
