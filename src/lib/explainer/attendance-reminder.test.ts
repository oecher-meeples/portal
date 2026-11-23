import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
// `cache()` ist außerhalb eines React-Server-Requests ein No-op-Wrapper —
// jeder Aufruf fragt die DB, die Tests bleiben damit unabhängig.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const { EXPLAINER_ATTENDANCE_REMINDER } =
  await import("@/lib/explainer/attendance-reminder");

const HOUR = 60 * 60 * 1000;
const RUNNING_EVENT = {
  id: "event-1",
  title: "Spieleabend",
  startsAt: new Date(Date.now() - HOUR),
  endsAt: new Date(Date.now() + HOUR),
};
const FUTURE_EVENT = {
  id: "event-2",
  title: "Messe",
  startsAt: new Date(Date.now() + 24 * HOUR),
  endsAt: new Date(Date.now() + 48 * HOUR),
};

function viewer(meepleId: string | null) {
  return { permissionKeys: [], meepleId };
}

function arrange({
  explainerGames = 1,
  events = [RUNNING_EVENT],
  attendingEventIds = [] as string[],
} = {}) {
  prismaMock.explainerGame.count.mockResolvedValue(explainerGames);
  prismaMock.event.findMany.mockResolvedValue(events as never);
  prismaMock.explainerAttendance.findMany.mockResolvedValue(
    attendingEventIds.map((eventId) => ({ eventId })) as never,
  );
}

describe("EXPLAINER_ATTENDANCE_REMINDER (#338)", () => {
  it("triggers for an Erklärbär without attendance while an event is running", async () => {
    arrange();

    expect(await EXPLAINER_ATTENDANCE_REMINDER.isTriggered(viewer("m-1"))).toBe(
      true,
    );
    expect(
      await EXPLAINER_ATTENDANCE_REMINDER.message(viewer("m-1")),
    ).toContain("Spieleabend");
  });

  it("does not trigger for guests", async () => {
    expect(await EXPLAINER_ATTENDANCE_REMINDER.isTriggered(viewer(null))).toBe(
      false,
    );
  });

  it("does not trigger for a Meeple without explainer games", async () => {
    arrange({ explainerGames: 0 });

    expect(await EXPLAINER_ATTENDANCE_REMINDER.isTriggered(viewer("m-1"))).toBe(
      false,
    );
  });

  it("does not trigger before the event has started", async () => {
    arrange({ events: [FUTURE_EVENT] });

    expect(await EXPLAINER_ATTENDANCE_REMINDER.isTriggered(viewer("m-1"))).toBe(
      false,
    );
  });

  it("does not trigger once the Erklärbär is already attending today", async () => {
    arrange({ attendingEventIds: ["event-1"] });

    expect(await EXPLAINER_ATTENDANCE_REMINDER.isTriggered(viewer("m-1"))).toBe(
      false,
    );
    expect(prismaMock.explainerAttendance.findMany).toHaveBeenCalledWith({
      where: { meepleId: "m-1", eventId: { in: ["event-1"] } },
      select: { eventId: true },
    });
  });
});
