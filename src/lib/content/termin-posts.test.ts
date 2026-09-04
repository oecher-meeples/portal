import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const findIcsEventByUidMock = vi.fn();
vi.mock("@/lib/content/calendar", () => ({
  findIcsEventByUid: (...args: unknown[]) => findIcsEventByUidMock(...args),
}));

beforeEach(() => {
  findIcsEventByUidMock.mockReset();
});

const {
  parseTerminSlug,
  getOrCreateTerminPost,
  verifyLinkedEventOrUnpublish,
} = await import("./termin-posts");

describe("parseTerminSlug (#463)", () => {
  it("recognises an ICS-sourced slug", () => {
    expect(parseTerminSlug("kalender-event-1@google.com")).toEqual({
      kind: "ics",
      uid: "event-1@google.com",
    });
  });

  it("recognises a DB-event slug", () => {
    expect(parseTerminSlug("event-sommerfest")).toEqual({
      kind: "event",
      eventSlug: "sommerfest",
    });
  });

  it("returns null for an unrelated (manually authored) slug", () => {
    expect(parseTerminSlug("mein-blogbeitrag")).toBeNull();
  });
});

const ICS_SOURCE = {
  title: "Offener Spieleabend",
  location: "Vereinsheim Aachen",
  startsAt: new Date("2026-08-10T18:00:00Z"),
  endsAt: new Date("2026-08-10T22:00:00Z"),
  internal: false,
};

describe("getOrCreateTerminPost — ICS-Quelle (#463)", () => {
  it("returns null for a non-termin slug", async () => {
    expect(await getOrCreateTerminPost("mein-blogbeitrag")).toBeNull();
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("returns null when the ICS UID is no longer found in any feed", async () => {
    findIcsEventByUidMock.mockResolvedValue(null);

    expect(await getOrCreateTerminPost("kalender-gone@google.com")).toBeNull();
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT post seeded from the ICS event, with a matching sync snapshot", async () => {
    findIcsEventByUidMock.mockResolvedValue(ICS_SOURCE);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await getOrCreateTerminPost("kalender-event-1@google.com");

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "kalender-event-1@google.com",
        type: "TERMIN",
        title: "Offener Spieleabend",
        location: "Vereinsheim Aachen",
        date: ICS_SOURCE.startsAt,
        internal: false,
        status: "DRAFT",
        sourceIcsUid: "event-1@google.com",
        syncedTitle: "Offener Spieleabend",
        syncedLocationNote: "Vereinsheim Aachen",
        syncedStartsAt: ICS_SOURCE.startsAt,
        syncedEndsAt: ICS_SOURCE.endsAt,
      }),
    });
  });

  it("loads the existing post instead of failing when a concurrent request already created it", async () => {
    findIcsEventByUidMock.mockResolvedValue(ICS_SOURCE);
    const uniqueViolation = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "test" },
    );
    prismaMock.post.create.mockRejectedValue(uniqueViolation);
    prismaMock.post.findUnique.mockResolvedValue({ id: "post-1" } as never);

    const result = await getOrCreateTerminPost("kalender-event-1@google.com");

    expect(result).toEqual({ id: "post-1" });
  });

  it("re-throws an unrelated database error", async () => {
    findIcsEventByUidMock.mockResolvedValue(ICS_SOURCE);
    prismaMock.post.create.mockRejectedValue(new Error("connection lost"));

    await expect(
      getOrCreateTerminPost("kalender-event-1@google.com"),
    ).rejects.toThrow("connection lost");
  });
});

describe("getOrCreateTerminPost — DB-Event-Quelle (#463)", () => {
  const EVENT = {
    id: "event-db-1",
    title: "Sommerfest",
    location: "Vereinsheim",
    startsAt: new Date("2026-07-01T16:00:00Z"),
    endsAt: new Date("2026-07-01T22:00:00Z"),
  };

  it("returns null when the Event no longer exists", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);

    expect(await getOrCreateTerminPost("event-sommerfest")).toBeNull();
  });

  it("creates a DRAFT post seeded from the Event", async () => {
    prismaMock.event.findUnique.mockResolvedValue(EVENT as never);
    prismaMock.post.create.mockResolvedValue({ id: "post-2" } as never);

    await getOrCreateTerminPost("event-sommerfest");

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "event-sommerfest",
        type: "TERMIN",
        title: "Sommerfest",
        internal: false,
        status: "DRAFT",
        sourceEventId: "event-db-1",
        syncedStartsAt: EVENT.startsAt,
        syncedEndsAt: EVENT.endsAt,
      }),
    });
  });
});

describe("verifyLinkedEventOrUnpublish (#463)", () => {
  it("treats a missing post as gone", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);

    expect(await verifyLinkedEventOrUnpublish("nope")).toEqual({
      stillExists: false,
    });
  });

  it("leaves a manually-authored post untouched (no source)", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      sourceIcsUid: null,
      sourceEventId: null,
    } as never);

    const result = await verifyLinkedEventOrUnpublish("post-1");

    expect(result).toEqual({ stillExists: true });
    expect(prismaMock.post.update).not.toHaveBeenCalled();
  });

  it("sets the post to DRAFT when the linked ICS event is gone, without ever throwing on a feed outage", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      sourceIcsUid: "event-1@google.com",
      sourceEventId: null,
      title: "Offener Spieleabend",
      location: "Vereinsheim Aachen",
      date: new Date("2026-08-10"),
      syncedTitle: "Offener Spieleabend",
      syncedLocationNote: "Vereinsheim Aachen",
      syncedStartsAt: new Date("2026-08-10"),
      syncedEndsAt: null,
    } as never);
    findIcsEventByUidMock.mockResolvedValue(null);

    const result = await verifyLinkedEventOrUnpublish("post-1");

    expect(result).toEqual({ stillExists: false });
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { status: "DRAFT" },
    });
  });

  it("syncs an unmodified title when the source title changed", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      sourceIcsUid: "event-1@google.com",
      sourceEventId: null,
      title: "Offener Spieleabend",
      location: "Vereinsheim Aachen",
      date: new Date("2026-08-10T18:00:00Z"),
      syncedTitle: "Offener Spieleabend",
      syncedLocationNote: "Vereinsheim Aachen",
      syncedStartsAt: new Date("2026-08-10T18:00:00Z"),
      syncedEndsAt: null,
    } as never);
    findIcsEventByUidMock.mockResolvedValue({
      title: "Offener Spieleabend (verschoben)",
      location: "Vereinsheim Aachen",
      startsAt: new Date("2026-08-10T18:00:00Z"),
      endsAt: null,
      internal: false,
    });

    const result = await verifyLinkedEventOrUnpublish("post-1");

    expect(result).toEqual({ stillExists: true });
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: {
        title: "Offener Spieleabend (verschoben)",
        syncedTitle: "Offener Spieleabend (verschoben)",
      },
    });
  });

  it("leaves a manually-edited title untouched even when the source title changed", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      sourceIcsUid: "event-1@google.com",
      sourceEventId: null,
      title: "Redaktionell umbenannt",
      location: "Vereinsheim Aachen",
      date: new Date("2026-08-10T18:00:00Z"),
      syncedTitle: "Offener Spieleabend",
      syncedLocationNote: "Vereinsheim Aachen",
      syncedStartsAt: new Date("2026-08-10T18:00:00Z"),
      syncedEndsAt: null,
    } as never);
    findIcsEventByUidMock.mockResolvedValue({
      title: "Offener Spieleabend (verschoben)",
      location: "Vereinsheim Aachen",
      startsAt: new Date("2026-08-10T18:00:00Z"),
      endsAt: null,
      internal: false,
    });

    await verifyLinkedEventOrUnpublish("post-1");

    // Location/Datum sind unverändert, nur der (manuell geänderte) Titel
    // weicht vom frischen Quellwert ab — es gibt daher gar nichts
    // nachzuziehen, kein Update-Aufruf überhaupt.
    expect(prismaMock.post.update).not.toHaveBeenCalled();
  });

  it("does not write anything when nothing about the source changed", async () => {
    const commonDate = new Date("2026-08-10T18:00:00Z");
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      sourceIcsUid: "event-1@google.com",
      sourceEventId: null,
      title: "Offener Spieleabend",
      location: "Vereinsheim Aachen",
      date: commonDate,
      syncedTitle: "Offener Spieleabend",
      syncedLocationNote: "Vereinsheim Aachen",
      syncedStartsAt: commonDate,
      syncedEndsAt: null,
    } as never);
    findIcsEventByUidMock.mockResolvedValue({
      title: "Offener Spieleabend",
      location: "Vereinsheim Aachen",
      startsAt: commonDate,
      endsAt: null,
      internal: false,
    });

    const result = await verifyLinkedEventOrUnpublish("post-1");

    expect(result).toEqual({ stillExists: true });
    expect(prismaMock.post.update).not.toHaveBeenCalled();
  });

  it("resolves the source via the linked DB Event when sourceEventId is set", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      sourceIcsUid: null,
      sourceEventId: "event-db-1",
      title: "Sommerfest",
      location: "Vereinsheim",
      date: new Date("2026-07-01"),
      syncedTitle: "Sommerfest",
      syncedLocationNote: "Vereinsheim",
      syncedStartsAt: new Date("2026-07-01"),
      syncedEndsAt: null,
    } as never);
    prismaMock.event.findUnique.mockResolvedValue(null);

    const result = await verifyLinkedEventOrUnpublish("post-1");

    expect(result).toEqual({ stillExists: false });
    expect(findIcsEventByUidMock).not.toHaveBeenCalled();
  });
});
