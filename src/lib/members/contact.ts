import type { ProfilePictureVisibility } from "@prisma/client";
import {
  resolveVisibleProfilePictureUrl,
  type ProfilePictureViewer,
} from "@/lib/members/profile-picture-visibility";

export type ContactLinks = {
  mailHref: string | null;
  telegramHref: string | null;
  signalHref: string | null;
  /** No reliable "open a chat" URL exists for a bare Discord username (only
   * `discord.com/users/<snowflake-id>`, which we don't have) — shown as a
   * copyable value instead of a link, see `ContactDialog`. */
  discordHandle: string | null;
  /** Only set when the Meeple opted in via `shareAddress` — `address` alone
   * stays private otherwise (see profile-details-form.tsx). */
  address: string | null;
};

/**
 * A Meeple no longer carries `email` directly — it moved to the linked
 * `Member` (#328). Every contact-surface query joins `member: { select:
 * { email: true } }` and flattens it back with this helper before calling
 * `getContactLinks`, so the join stays in one place instead of repeated
 * per call site.
 */
export function meepleEmail(meeple: {
  member: { email: string | null } | null;
}): string | null {
  return meeple.member?.email ?? null;
}

/** `telegramHandle`/`signalHandle`/`discordHandle` are assumed already
 * normalised (no leading `@`), see profil actions. */
export function getContactLinks(meeple: {
  email: string | null;
  telegramHandle: string | null;
  signalHandle: string | null;
  discordHandle: string | null;
  address: string | null;
  shareAddress: boolean;
}): ContactLinks {
  return {
    mailHref: meeple.email ? `mailto:${meeple.email}` : null,
    telegramHref: meeple.telegramHandle
      ? `https://t.me/${meeple.telegramHandle}`
      : null,
    signalHref: meeple.signalHandle
      ? `https://signal.me/#eu/${meeple.signalHandle}`
      : null,
    discordHandle: meeple.discordHandle,
    address: meeple.shareAddress ? meeple.address : null,
  };
}

/** Fertig aufbereitete Daten für `ContactDialog` (`components/entities/`) —
 * Bild bereits sichtbarkeitsgeprüft (#389), Kontaktkanäle bereits über
 * `getContactLinks()` aufbereitet. Der Dialog selbst kennt weder
 * `ProfilePictureViewer` noch Prisma-Felder, nur diese Form. */
export type ContactDialogMeeple = {
  /** `null` heißt: kein Bild oder für den aktuellen Betrachter laut Freigabe
   * nicht sichtbar — nie eine ungeprüfte URL. */
  profilePictureUrl: string | null;
  contact: ContactLinks;
  /** Ziel des "Profil ansehen"-Links im Dialog — `null`, wenn es für diesen
   * Meeple/Betrachter keins gibt (kein verknüpftes `Member`, z. B.
   * Systemkonto oder anonymisierter Alt-Meeple). Für eingeloggte Meeple
   * immer `/profil/<slug>` (jedes Meeple darf jedes fremde Profil öffnen,
   * siehe `canAccessMemberProfile`). Der Gast-Fall baut sein eigenes
   * `ContactDialogMeeple` nicht über diese Funktion (siehe
   * `getAttendingExplainers`) — hier deshalb bewusst `null` für `guest`. */
  profileHref: string | null;
};

/** Baut die `ContactDialogMeeple`-Form aus rohen Meeple-Feldern — von jeder
 * Anzeigestelle genutzt, die `ContactDialog` ihr `meeple`-Prop selbst befüllt
 * (statt `meepleId`, siehe `contact-dialog.ts`s `fetchContactDialogMeeple`),
 * damit die Sichtbarkeitsprüfung/Kontaktaufbereitung nicht mehrfach
 * nachgebaut wird. Kein `displayName` hier — `ContactDialog` bekommt den
 * Namen bereits separat als eigenes `name`-Prop (der Trigger braucht ihn
 * schon vor dem Laden). */
export function toContactDialogMeeple(
  meeple: {
    email: string | null;
    telegramHandle: string | null;
    signalHandle: string | null;
    discordHandle: string | null;
    address: string | null;
    shareAddress: boolean;
    profilePictureUrl: string | null;
    profilePictureVisibility: ProfilePictureVisibility;
    /** Optional statt Pflichtfeld: bestehende Aufrufer/Tests, die (noch)
     * kein `member` mitgeben, bekommen weiterhin ein gültiges Ergebnis —
     * nur ohne Profil-Link. */
    member?: { slug: string } | null;
  },
  viewer: ProfilePictureViewer,
): ContactDialogMeeple {
  return {
    profilePictureUrl: resolveVisibleProfilePictureUrl(meeple, viewer),
    contact: getContactLinks(meeple),
    profileHref:
      viewer.kind === "meeple" && meeple.member
        ? `/profil/${meeple.member.slug}`
        : null,
  };
}
