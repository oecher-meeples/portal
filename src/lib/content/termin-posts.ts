import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { findIcsEventByUid, type IcsEventSource } from "@/lib/content/calendar";
import { formatDateRange } from "@/lib/utils/format";

const ICS_SLUG_PREFIX = "kalender-";
const EVENT_SLUG_PREFIX = "event-";

export type ParsedTerminSlug =
  | { kind: "ics"; uid: string }
  | { kind: "event"; eventSlug: string };

/** Erkennt die synthetischen Slugs, die `calendar.ts` für Termine ohne
 * echten `Post` vergibt (`kalender-<uid>`/`event-<slug>`, #463) — dieselben
 * Slug-Strings werden 1:1 als `Post.slug` übernommen, sobald ein Post dafür
 * angelegt wird, ein zweiter Lookup-Mechanismus ist daher nicht nötig. */
export function parseTerminSlug(slug: string): ParsedTerminSlug | null {
  if (slug.startsWith(ICS_SLUG_PREFIX)) {
    return { kind: "ics", uid: slug.slice(ICS_SLUG_PREFIX.length) };
  }
  if (slug.startsWith(EVENT_SLUG_PREFIX)) {
    return { kind: "event", eventSlug: slug.slice(EVENT_SLUG_PREFIX.length) };
  }
  return null;
}

function buildAutoText(
  location: string | null,
  startsAt: Date,
  endsAt: Date | null,
): string {
  const range = formatDateRange(startsAt.toISOString(), endsAt?.toISOString() ?? null);
  return location ? `${range} · ${location}` : range;
}

/** Bereits vorhandene Post-Zeile für einen unique-Constraint-Verstoß nachladen
 * (#463) — zwei gleichzeitige erste Aufrufe desselben Termin-Slugs dürfen
 * nicht beide einen Post anlegen wollen; wer die Race verliert, liest
 * einfach den vom Gewinner gerade erzeugten Post. */
function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function createIcsBackedPost(slug: string, uid: string, source: IcsEventSource) {
  const data = {
    slug,
    type: "TERMIN" as const,
    title: source.title,
    excerpt: buildAutoText(source.location, source.startsAt, source.endsAt),
    body: buildAutoText(source.location, source.startsAt, source.endsAt),
    date: source.startsAt,
    location: source.location,
    internal: source.internal,
    status: "DRAFT" as const,
    sourceIcsUid: uid,
    syncedTitle: source.title,
    syncedLocationNote: source.location,
    syncedStartsAt: source.startsAt,
    syncedEndsAt: source.endsAt,
  };

  try {
    return await prisma.post.create({ data });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    return prisma.post.findUnique({ where: { slug } });
  }
}

async function createEventBackedPost(
  slug: string,
  event: { id: string; title: string; location: string | null; startsAt: Date; endsAt: Date | null },
) {
  const data = {
    slug,
    type: "TERMIN" as const,
    title: event.title,
    excerpt: buildAutoText(event.location, event.startsAt, event.endsAt),
    body: buildAutoText(event.location, event.startsAt, event.endsAt),
    date: event.startsAt,
    location: event.location,
    internal: false,
    status: "DRAFT" as const,
    sourceEventId: event.id,
    syncedTitle: event.title,
    syncedLocationNote: event.location,
    syncedStartsAt: event.startsAt,
    syncedEndsAt: event.endsAt,
  };

  try {
    return await prisma.post.create({ data });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    return prisma.post.findUnique({ where: { slug } });
  }
}

/**
 * Lazy erzeugt (oder lädt einen bereits erzeugten) `Post` für einen
 * synthetischen Termin-Slug (#463) — statt weiterhin 404 zurückzugeben.
 * `null`, wenn der Slug kein Termin-Slug ist oder die Quelle (ICS-UID/
 * `Event`) nicht (mehr) existiert. Prüft nicht auf Berechtigungen — Sache
 * des Aufrufers (`getContentBySlug()`).
 */
export async function getOrCreateTerminPost(slug: string) {
  const parsed = parseTerminSlug(slug);
  if (!parsed) return null;

  if (parsed.kind === "ics") {
    const source = await findIcsEventByUid(parsed.uid);
    if (!source) return null;
    return createIcsBackedPost(slug, parsed.uid, source);
  }

  const event = await prisma.event.findUnique({
    where: { slug: parsed.eventSlug },
    select: { id: true, title: true, location: true, startsAt: true, endsAt: true },
  });
  if (!event) return null;
  return createEventBackedPost(slug, event);
}

/** Getrackter Sync (#463): ein Feld wird nur dann auf den frischen Quellwert
 * aktualisiert, wenn der aktuelle Post-Wert noch exakt dem zuletzt
 * automatisch übernommenen Snapshot entspricht — sonst hat die Redaktion
 * es manuell geändert, es bleibt unangetastet (und der Snapshot wird NICHT
 * nachgezogen, damit eine spätere erneute Quelländerung wieder korrekt als
 * "weiterhin abweichend" erkannt wird). */
function trackedUpdate<T>(
  current: T,
  snapshot: T,
  fresh: T,
  equals: (a: T, b: T) => boolean = (a, b) => a === b,
): { changed: boolean; value: T } {
  if (equals(current, snapshot) && !equals(current, fresh)) {
    return { changed: true, value: fresh };
  }
  return { changed: false, value: current };
}

function datesEqual(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

export type VerifyEventPostResult = { stillExists: boolean };

/**
 * Lazy beim Öffnen der Beitrags-Detailseite aufgerufen (#463) — kein
 * aktiver Sync-Job. Prüft, ob der verknüpfte Termin noch existiert (ICS-UID
 * im Feed, oder `Event`-Zeile), gleicht dabei unveränderte Felder getrackt
 * ab, und setzt den Post andernfalls auf `DRAFT` zurück. Ein manuell
 * erstellter Post (weder `sourceIcsUid` noch `sourceEventId`) ist von
 * dieser Prüfung nicht betroffen. Ein Fehlschlag/Timeout des externen
 * ICS-Feeds führt nie zu einer fälschlichen Depublizierung — `null` von
 * `findIcsEventByUid()` bedeutet "im Feed nicht gefunden", aber ein reiner
 * Netzwerkfehler liefert dort ebenfalls `null` (siehe `fetchRawIcsText()`,
 * "nie werfen"); dieses Risiko ist bewusst in Kauf genommen, siehe #463.
 */
export async function verifyLinkedEventOrUnpublish(
  postId: string,
): Promise<VerifyEventPostResult> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { stillExists: false };
  if (!post.sourceIcsUid && !post.sourceEventId) return { stillExists: true };

  const fresh = post.sourceEventId
    ? await resolveEventSource(post.sourceEventId)
    : await findIcsEventByUid(post.sourceIcsUid!);

  if (!fresh) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "DRAFT" },
    });
    return { stillExists: false };
  }

  const title = trackedUpdate<string>(
    post.title,
    post.syncedTitle ?? "",
    fresh.title,
  );
  const location = trackedUpdate<string | null>(
    post.location,
    post.syncedLocationNote,
    fresh.location,
  );
  const startsAt = trackedUpdate<Date>(
    post.date,
    post.syncedStartsAt ?? post.date,
    fresh.startsAt,
    datesEqual,
  );
  // `endsAt` hat kein eigenes Post-Feld (nur der Snapshot existiert, für den
  // Vergleich "hat sich die Quelle überhaupt geändert") — bei Abweichung wird
  // nur der Snapshot nachgezogen, nichts Sichtbares aktualisiert.
  const endsAtChanged = !datesEqual(post.syncedEndsAt, fresh.endsAt);

  if (title.changed || location.changed || startsAt.changed || endsAtChanged) {
    await prisma.post.update({
      where: { id: postId },
      data: {
        ...(title.changed ? { title: title.value, syncedTitle: fresh.title } : {}),
        ...(location.changed
          ? { location: location.value, syncedLocationNote: fresh.location }
          : {}),
        ...(startsAt.changed
          ? { date: startsAt.value, syncedStartsAt: fresh.startsAt }
          : {}),
        ...(endsAtChanged ? { syncedEndsAt: fresh.endsAt } : {}),
      },
    });
  }

  return { stillExists: true };
}

async function resolveEventSource(
  eventId: string,
): Promise<
  | { title: string; location: string | null; startsAt: Date; endsAt: Date | null }
  | null
> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true, location: true, startsAt: true, endsAt: true },
  });
  return event;
}
