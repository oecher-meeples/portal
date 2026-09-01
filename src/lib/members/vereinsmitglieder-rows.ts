import type { Prisma } from "@prisma/client";
import {
  getMembershipState,
  type MembershipState,
} from "@/lib/members/membership-state";
import { memberDisplayName } from "@/lib/members/member-display-name";
import {
  determineContribution,
  type ContributionCategory,
} from "@/lib/members/contribution";
import { ANONYMER_MEEPLE_NAME } from "@/lib/ludothek/anonymer-meeple";

/** Eine Zeile der Vereinsmitglieder-Tabelle (#334, Paket 6) — Member-zentrisch,
 * im Gegensatz zur Meeple-zentrischen `MeepleRow` (`meeple-row.ts`). Ein
 * Vereinsmitglied kann ohne `Meeple` existieren (noch kein Login, #328). */
export type VereinsmitgliedRow = {
  id: string;
  memberNumber: number;
  /** Für den Link zur vollen Profilseite (#387), `/profil/{slug}`. */
  slug: string;
  displayName: string;
  /** `null` seit #373 — ein MiniMeeple hat keine eigene E-Mail-Adresse. */
  email: string | null;
  /** Rohe Personendaten für den Edit-Dialog (#343) — `displayName` ist nur
   * die Anzeige-Ableitung (`memberDisplayName()`), kein Rückweg zu den
   * einzelnen Feldern. */
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  meepleId: string | null;
  /** `Meeple.neonAuthUserId !== null` — nicht mit `meepleId !== null`
   * verwechseln: ein verknüpftes Meeple kann theoretisch ohne aktives Login
   * bestehen (#341). */
  hasPortalLogin: boolean;
  /** Vereinsbeitritt (`Member.joinedAt`, Live-Review F1) — nicht mit dem
   * Anlagedatum des Portal-Kontos (`Meeple.joinedAt`) verwechseln, die beiden
   * fallen bei Erwachsenen zufällig zusammen, nicht bei Kindern ohne Login
   * (#373). */
  joinedAt: string;
  resignedAt: string | null;
  membershipEndsAt: string | null;
  membershipState: MembershipState;
  contributionCategory: ContributionCategory | null;
  openGames: number;
  openUnits: number;
  /** Stufe 3 (endgültige Löschung) ist fällig — siehe `listMembersEligibleForStufe3`. */
  stufe3Eligible: boolean;
  /** Token einer noch offenen Einladung an `email`, falls vorhanden — für den
   * "Eingeladen"-Hinweis in der Portal-Login-Spalte (Live-Review, #365-Folge).
   * `null` ohne offene Einladung, unabhängig von `hasPortalLogin`. */
  openInviteToken: string | null;
};

export type VereinsmitgliedSourceRow = {
  id: string;
  memberNumber: number;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  meepleId: string | null;
  birthDate: Date | null;
  birthPlace: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  selbstgewaehlterBeitrag: Prisma.Decimal | null;
  /** Vereinsbeitritt (Live-Review F1) — direkt auf `Member`, unabhängig vom
   * verknüpften Portal-Konto. */
  joinedAt: Date;
  resignedAt: Date | null;
  membershipEndsAt: Date | null;
  meeple: {
    displayName: string;
    anonymizedAt: Date | null;
    neonAuthUserId: string | null;
  } | null;
};

/**
 * Baut die Zeilen der Vereinsmitglieder-Tabelle aus den rohen `Member`-Zeilen
 * (#341, #365) — als eigene, getestete Funktion statt inline in
 * `app/admin/mitglieder/page.tsx`, damit die Ausschluss-/Ableitungsregeln
 * nicht nur über einen Route-Test erreichbar sind.
 *
 * Schließt das Sammelkonto "Anonymer Meeple" aus: es braucht zwar eine
 * `Member`-Zeile (Pflicht-FK von `GameHolding.vereinsmitgliedId`), ist aber
 * fachlich kein reguläres Vereinsmitglied (#341).
 */
export function buildVereinsmitgliedRows(
  members: VereinsmitgliedSourceRow[],
  lookups: {
    openGamesByMemberId: Map<string, number>;
    openUnitsByMeepleId: Map<string, number>;
    stufe3EligibleIds: Set<string>;
    /** Token je E-Mail mit noch offener Einladung (Status "offen") — lowercased,
     * wie `Member.email` gespeichert wird. */
    openInviteTokenByEmail: Map<string, string>;
  },
  now: Date = new Date(),
): VereinsmitgliedRow[] {
  return members
    .filter((member) => member.meeple?.displayName !== ANONYMER_MEEPLE_NAME)
    .map((member) => ({
      id: member.id,
      memberNumber: member.memberNumber,
      slug: member.slug,
      displayName: memberDisplayName(member),
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      birthDate: member.birthDate?.toISOString() ?? null,
      birthPlace: member.birthPlace,
      street: member.street,
      postalCode: member.postalCode,
      city: member.city,
      phone: member.phone,
      meepleId: member.meepleId,
      hasPortalLogin: member.meeple?.neonAuthUserId != null,
      joinedAt: member.joinedAt.toISOString(),
      resignedAt: member.resignedAt?.toISOString() ?? null,
      membershipEndsAt: member.membershipEndsAt?.toISOString() ?? null,
      membershipState: getMembershipState(
        {
          meepleId: member.meepleId,
          resignedAt: member.resignedAt,
          membershipEndsAt: member.membershipEndsAt,
          anonymizedAt: member.meeple?.anonymizedAt ?? null,
        },
        now,
      ),
      contributionCategory: determineContribution(member, now).category,
      openGames: lookups.openGamesByMemberId.get(member.id) ?? 0,
      openUnits: member.meepleId
        ? (lookups.openUnitsByMeepleId.get(member.meepleId) ?? 0)
        : 0,
      stufe3Eligible: lookups.stufe3EligibleIds.has(member.id),
      openInviteToken: member.email
        ? (lookups.openInviteTokenByEmail.get(member.email) ?? null)
        : null,
    }));
}
