import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const { createEvent, updateEvent, deleteEvent } = await import("./actions");

class ForbiddenError extends Error {}

const VALID_INPUT = {
  title: "Spieletag Herbst",
  startsAt: new Date("2026-10-10T10:00:00Z"),
  endsAt: new Date("2026-10-10T18:00:00Z"),
  location: "Vereinsheim",
};

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
});

describe("without the events:manage permission", () => {
  it("changes nothing in the database", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(createEvent(VALID_INPUT)).rejects.toThrow(ForbiddenError);
    await expect(updateEvent("event-1", VALID_INPUT)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(deleteEvent("event-1")).rejects.toThrow(ForbiddenError);

    expect(prismaMock.event.create).not.toHaveBeenCalled();
    expect(prismaMock.event.update).not.toHaveBeenCalled();
    expect(prismaMock.event.delete).not.toHaveBeenCalled();
  });
});

describe("createEvent", () => {
  it("rejects a missing title", async () => {
    const result = await createEvent({ ...VALID_INPUT, title: "  " });

    expect(result).toEqual({ error: "Bitte einen Titel angeben." });
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it("rejects an end before the start", async () => {
    const result = await createEvent({
      ...VALID_INPUT,
      endsAt: new Date("2026-10-10T09:00:00Z"),
    });

    expect(result).toEqual({
      error: "Das Ende darf nicht vor dem Start liegen.",
    });
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it("generates a slug from the title", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);
    prismaMock.event.create.mockResolvedValue({
      id: "event-1",
      slug: "spieletag-herbst",
    } as never);

    const result = await createEvent(VALID_INPUT);

    expect(result).toEqual({
      success: true,
      id: "event-1",
      slug: "spieletag-herbst",
    });
    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "spieletag-herbst",
        title: "Spieletag Herbst",
      }),
    });
  });

  it("resolves a slug collision with a numeric suffix", async () => {
    prismaMock.event.findUnique
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce(null);
    prismaMock.event.create.mockResolvedValue({
      id: "event-2",
      slug: "spieletag-herbst-2",
    } as never);

    await createEvent(VALID_INPUT);

    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "spieletag-herbst-2" }),
    });
  });
});

describe("updateEvent", () => {
  it("re-derives the slug from the (possibly changed) title", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);
    prismaMock.event.update.mockResolvedValue({} as never);

    const result = await updateEvent("event-1", {
      ...VALID_INPUT,
      title: "Spieletag Fruehjahr",
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: expect.objectContaining({ slug: "spieletag-fruehjahr" }),
    });
  });

  it("excludes itself from the slug collision check", async () => {
    prismaMock.event.findUnique.mockResolvedValue({ id: "event-1" } as never);
    prismaMock.event.update.mockResolvedValue({} as never);

    await updateEvent("event-1", VALID_INPUT);

    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: expect.objectContaining({ slug: "spieletag-herbst" }),
    });
  });
});

describe("deleteEvent", () => {
  it("rejects deleting an event that still has shifts", async () => {
    prismaMock.shift.count.mockResolvedValue(1);
    prismaMock.eventShelfAssignment.count.mockResolvedValue(0);
    prismaMock.fleaMarketItem.count.mockResolvedValue(0);

    const result = await deleteEvent("event-1");

    expect(result).toEqual({
      error:
        "Dieses Event hat noch Schichten, Regal-Zuordnungen oder Flohmarkt-Artikel — erst diese entfernen.",
    });
    expect(prismaMock.event.delete).not.toHaveBeenCalled();
  });

  it("rejects deleting an event that still has shelf assignments or flea market items", async () => {
    prismaMock.shift.count.mockResolvedValue(0);
    prismaMock.eventShelfAssignment.count.mockResolvedValue(1);
    prismaMock.fleaMarketItem.count.mockResolvedValue(0);

    const result = await deleteEvent("event-1");

    expect(result.error).toMatch(/Schichten, Regal-Zuordnungen/);
    expect(prismaMock.event.delete).not.toHaveBeenCalled();
  });

  it("deletes an event without any dependents", async () => {
    prismaMock.shift.count.mockResolvedValue(0);
    prismaMock.eventShelfAssignment.count.mockResolvedValue(0);
    prismaMock.fleaMarketItem.count.mockResolvedValue(0);
    prismaMock.event.delete.mockResolvedValue({} as never);

    const result = await deleteEvent("event-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.event.delete).toHaveBeenCalledWith({
      where: { id: "event-1" },
    });
  });
});
