import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/meeples", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/meeples")>("@/lib/meeples");
  return { ...actual, requireMeeple: requireMeepleMock };
});

const { markAttending, markNotAttending } = await import("./attendance-actions");

const ME = { id: "meeple-1", neonAuthUserId: "auth-1" };

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(ME);
});

describe("markAttending", () => {
  it("rejects when the caller has no ExplainerGame entry", async () => {
    prismaMock.explainerGame.count.mockResolvedValue(0);

    const result = await markAttending("event-1");

    expect(result).toEqual({
      error:
        "Nur Erklärbären mit mindestens einem Spiel im Profil können sich anmelden.",
    });
    expect(prismaMock.explainerAttendance.upsert).not.toHaveBeenCalled();
  });

  it("does not create a second entry when marking attending twice", async () => {
    prismaMock.explainerGame.count.mockResolvedValue(1);

    await markAttending("event-1");

    expect(prismaMock.explainerAttendance.upsert).toHaveBeenCalledWith({
      where: { eventId_meepleId: { eventId: "event-1", meepleId: "meeple-1" } },
      update: {},
      create: { eventId: "event-1", meepleId: "meeple-1" },
    });
  });
});

describe("markNotAttending", () => {
  it("removes the caller's own attendance entry", async () => {
    await markNotAttending("event-1");

    expect(prismaMock.explainerAttendance.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "event-1", meepleId: "meeple-1" },
    });
  });
});
