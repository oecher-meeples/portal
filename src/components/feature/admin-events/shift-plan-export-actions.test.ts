import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom((...args) =>
    requirePermissionMock(...args),
  ),
);

const requirePermissionMock = vi.fn();

const { SHIFT_PLAN_CSV_COLUMNS } = await import("./shift-plan-csv-columns");
const { exportShiftPlanDayCsv, exportShiftPlanPdf } =
  await import("./shift-plan-export-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
  prismaMock.eventDay.findUnique.mockResolvedValue({
    date: new Date("2026-08-27T00:00:00Z"),
  } as never);
});

describe("without the events:manage permission", () => {
  it("reads nothing from the database", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(exportShiftPlanDayCsv("day-1")).rejects.toThrow(
      ForbiddenError,
    );
    expect(prismaMock.eventDay.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.shiftBooking.findMany).not.toHaveBeenCalled();
  });
});

describe("exportShiftPlanDayCsv", () => {
  it("returns an error for an unknown day", async () => {
    prismaMock.eventDay.findUnique.mockResolvedValue(null);

    const result = await exportShiftPlanDayCsv("day-unknown");

    expect(result).toEqual({ error: "Tag wurde nicht gefunden." });
    expect(prismaMock.shiftBooking.findMany).not.toHaveBeenCalled();
  });

  it("builds one CSV row per booking with role/time/person/status", async () => {
    prismaMock.shiftBooking.findMany.mockResolvedValue([
      {
        startsAt: new Date("2026-08-27T18:00:00Z"),
        endsAt: new Date("2026-08-27T22:00:00Z"),
        confirmedAt: new Date("2026-08-20T10:00:00Z"),
        meeple: { displayName: "Alex" },
        shift: { role: { name: "Theke" } },
      },
      {
        startsAt: new Date("2026-08-27T18:00:00Z"),
        endsAt: new Date("2026-08-27T20:00:00Z"),
        confirmedAt: null,
        meeple: { displayName: "Sam" },
        shift: { role: { name: "Aufbau" } },
      },
    ] as never);

    const result = await exportShiftPlanDayCsv("day-1");

    expect(result).toMatchObject({
      success: true,
      filename: "schichtplan-2026-08-27.csv",
      rowCount: 2,
    });
    const lines = (result as { csv: string }).csv.split("\r\n");
    expect(lines[0]).toBe(SHIFT_PLAN_CSV_COLUMNS.join(";"));
    expect(lines[1]).toContain("Theke");
    expect(lines[1]).toContain("Alex");
    expect(lines[1]).toContain("bestätigt");
    expect(lines[2]).toContain("Aufbau");
    expect(lines[2]).toContain("Sam");
    expect(lines[2]).toContain("offen");
  });

  it("still downloads a header-only CSV when the day has no bookings", async () => {
    prismaMock.shiftBooking.findMany.mockResolvedValue([]);

    const result = await exportShiftPlanDayCsv("day-1");

    expect(result).toMatchObject({ success: true, rowCount: 0 });
    expect((result as { csv: string }).csv).toBe(
      SHIFT_PLAN_CSV_COLUMNS.join(";"),
    );
  });
});

describe("exportShiftPlanPdf", () => {
  const day = { id: "d1", date: new Date(2026, 11, 4), availabilities: [] };

  it("requires the events:manage permission", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(exportShiftPlanPdf("event-1")).rejects.toThrow(ForbiddenError);
    expect(prismaMock.event.findUnique).not.toHaveBeenCalled();
  });

  it("errors for an unknown event and for an event without shifts", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce(null);
    expect(await exportShiftPlanPdf("event-1")).toEqual({
      error: "Event wurde nicht gefunden.",
    });

    prismaMock.event.findUnique.mockResolvedValueOnce({
      title: "Spieletage",
      days: [day],
      shifts: [],
    } as never);
    expect(await exportShiftPlanPdf("event-1")).toEqual({
      error: "Es sind noch keine Schichten angelegt.",
    });
  });

  it("returns a base64 PDF named after the event", async () => {
    prismaMock.event.findUnique.mockResolvedValue({
      title: "Spieletage 2026",
      days: [day],
      shifts: [
        {
          dayId: "d1",
          roleId: "r1",
          capacity: 1,
          targetStartsAt: new Date(2026, 11, 4, 10),
          targetEndsAt: new Date(2026, 11, 4, 14),
          role: { name: "Küche", hasShifts: true },
          bookings: [
            {
              meepleId: null,
              guestId: "g1",
              startsAt: new Date(2026, 11, 4, 10),
              endsAt: new Date(2026, 11, 4, 14),
              slotIndex: null,
              meeple: null,
              guest: { name: "Max" },
            },
          ],
        },
      ],
    } as never);

    const result = await exportShiftPlanPdf("event-1");

    if ("error" in result) throw new Error(result.error);
    expect(result.filename).toBe("schichtplan-spieletage-2026.pdf");
    expect(Buffer.from(result.base64, "base64").subarray(0, 5).toString()).toBe(
      "%PDF-",
    );
  });
});
