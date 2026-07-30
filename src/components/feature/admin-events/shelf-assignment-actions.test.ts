import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const { assignShelfToEvent, unassignShelfFromEvent } =
  await import("./shelf-assignment-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
});

describe("without the events:manage permission", () => {
  it("changes nothing in the database", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(assignShelfToEvent("event-1", "unit-1")).rejects.toThrow(
      ForbiddenError,
    );
    await expect(unassignShelfFromEvent("event-1", "unit-1")).rejects.toThrow(
      ForbiddenError,
    );

    expect(prismaMock.eventShelfAssignment.upsert).not.toHaveBeenCalled();
    expect(prismaMock.eventShelfAssignment.deleteMany).not.toHaveBeenCalled();
  });
});

describe("assignShelfToEvent", () => {
  it("rejects assigning a box", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue({
      id: "unit-1",
      kind: "BOX",
    } as never);

    const result = await assignShelfToEvent("event-1", "unit-1");

    expect(result).toEqual({
      error: "Nur Regale können einem Event zugeordnet werden, keine Kartons.",
    });
    expect(prismaMock.eventShelfAssignment.upsert).not.toHaveBeenCalled();
  });

  it("is idempotent for an already-assigned shelf", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue({
      id: "unit-1",
      kind: "SHELF",
    } as never);

    const result = await assignShelfToEvent("event-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.eventShelfAssignment.upsert).toHaveBeenCalledWith({
      where: { eventId_unitId: { eventId: "event-1", unitId: "unit-1" } },
      update: {},
      create: { eventId: "event-1", unitId: "unit-1" },
    });
  });
});

describe("unassignShelfFromEvent", () => {
  it("is a no-op without error for an unassigned unit", async () => {
    prismaMock.eventShelfAssignment.deleteMany.mockResolvedValue({
      count: 0,
    } as never);

    const result = await unassignShelfFromEvent("event-1", "unit-1");

    expect(result).toEqual({ success: true });
  });
});
