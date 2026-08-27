import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { setHelperAvailability, clearHelperAvailability } =
  await import("./helper-availability");

const VALID_INPUT = {
  meepleId: "meeple-1",
  dayId: "day-1",
  startsAt: new Date("2026-10-10T10:00:00Z"),
  endsAt: new Date("2026-10-10T14:00:00Z"),
  roleIds: ["role-theke"],
};

describe("setHelperAvailability", () => {
  it("rejects an end before or equal to the start", async () => {
    const result = await setHelperAvailability({
      ...VALID_INPUT,
      endsAt: VALID_INPUT.startsAt,
    });

    expect(result).toEqual({
      error: "Das Ende muss nach dem Beginn liegen.",
    });
    expect(prismaMock.helperAvailability.upsert).not.toHaveBeenCalled();
  });

  it("rejects an empty role selection", async () => {
    const result = await setHelperAvailability({ ...VALID_INPUT, roleIds: [] });

    expect(result).toEqual({
      error: "Bitte mindestens eine Rolle auswählen.",
    });
    expect(prismaMock.helperAvailability.upsert).not.toHaveBeenCalled();
  });

  it("upserts on (meepleId, dayId), replacing prior role choices", async () => {
    prismaMock.helperAvailability.upsert.mockResolvedValue({} as never);

    const result = await setHelperAvailability({
      ...VALID_INPUT,
      roleIds: ["role-theke", "role-kasse"],
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.helperAvailability.upsert).toHaveBeenCalledWith({
      where: {
        meepleId_dayId: { meepleId: "meeple-1", dayId: "day-1" },
      },
      create: {
        meepleId: "meeple-1",
        dayId: "day-1",
        startsAt: VALID_INPUT.startsAt,
        endsAt: VALID_INPUT.endsAt,
        roles: {
          create: [{ roleId: "role-theke" }, { roleId: "role-kasse" }],
        },
      },
      update: {
        startsAt: VALID_INPUT.startsAt,
        endsAt: VALID_INPUT.endsAt,
        roles: {
          deleteMany: {},
          create: [{ roleId: "role-theke" }, { roleId: "role-kasse" }],
        },
      },
    });
  });
});

describe("clearHelperAvailability", () => {
  beforeEach(() => {
    prismaMock.helperAvailability.deleteMany.mockResolvedValue({
      count: 1,
    } as never);
  });

  it("deletes the meeple's availability for that day", async () => {
    const result = await clearHelperAvailability("meeple-1", "day-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.helperAvailability.deleteMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", dayId: "day-1" },
    });
  });
});
