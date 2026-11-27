import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { commitGuestImport } = await import("./guest-import");

const row = (overrides = {}) => ({
  line: 2,
  name: "Max  Mustermann",
  dayId: "d1",
  startsAt: "2026-12-04T09:00:00.000Z",
  endsAt: "2026-12-04T18:00:00.000Z",
  roleIds: ["r1"],
  newRoleNames: [] as string[],
  unknownRoleNames: [] as string[],
  ...overrides,
});

beforeEach(() => {
  prismaMock.eventDay.findMany.mockResolvedValue([{ id: "d1" }] as never);
  prismaMock.helperRole.findMany.mockResolvedValue([
    { id: "r1", name: "Küche" },
  ] as never);
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
});

describe("commitGuestImport", () => {
  it("creates a new guest and upserts the availability", async () => {
    prismaMock.guest.findUnique.mockResolvedValue(null);
    prismaMock.guest.create.mockResolvedValue({ id: "g1" } as never);

    const result = await commitGuestImport("e1", [row()]);

    expect(result).toEqual({
      guestsCreated: 1,
      rolesCreated: 0,
      availabilities: 1,
    });
    expect(prismaMock.guest.create).toHaveBeenCalledWith({
      data: { name: "Max Mustermann", nameKey: "max mustermann" },
      select: { id: true },
    });
    expect(prismaMock.helperAvailability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { guestId_dayId: { guestId: "g1", dayId: "d1" } },
      }),
    );
  });

  it("reuses an existing guest and replaces roles on re-import", async () => {
    prismaMock.guest.findUnique.mockResolvedValue({ id: "g1" } as never);

    const result = await commitGuestImport("e1", [row()]);

    expect(result.guestsCreated).toBe(0);
    expect(prismaMock.guest.create).not.toHaveBeenCalled();
    expect(prismaMock.helperAvailability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          roles: { deleteMany: {}, create: [{ roleId: "r1" }] },
        }),
      }),
    );
  });

  it("creates new roles once and assigns them", async () => {
    prismaMock.guest.findUnique.mockResolvedValue({ id: "g1" } as never);
    prismaMock.helperRole.create.mockResolvedValue({ id: "r9" } as never);

    const result = await commitGuestImport("e1", [
      row({ roleIds: [], newRoleNames: ["Bring & Buy"] }),
      row({ line: 3, dayId: "d1", roleIds: [], newRoleNames: ["bring & buy"] }),
    ]);

    expect(result.rolesCreated).toBe(1);
    expect(prismaMock.helperRole.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.helperAvailability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          roles: { create: [{ roleId: "r9" }] },
        }),
      }),
    );
  });

  it("reuses an existing role with the same name instead of creating it", async () => {
    prismaMock.guest.findUnique.mockResolvedValue({ id: "g1" } as never);

    const result = await commitGuestImport("e1", [
      row({ roleIds: [], newRoleNames: ["KÜCHE"] }),
    ]);

    expect(result.rolesCreated).toBe(0);
    expect(prismaMock.helperRole.create).not.toHaveBeenCalled();
  });

  it("looks a guest up only once per import", async () => {
    prismaMock.guest.findUnique.mockResolvedValue({ id: "g1" } as never);
    await commitGuestImport("e1", [row(), row({ line: 3 })]);
    expect(prismaMock.guest.findUnique).toHaveBeenCalledTimes(1);
  });

  it("rejects days of other events and unknown roles", async () => {
    await expect(
      commitGuestImport("e1", [row({ dayId: "other" })]),
    ).rejects.toThrow();
    await expect(
      commitGuestImport("e1", [row({ roleIds: ["nope"] })]),
    ).rejects.toThrow();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
