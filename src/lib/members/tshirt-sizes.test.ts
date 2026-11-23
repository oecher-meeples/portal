import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  listTshirtSizes,
  createTshirtSize,
  renameTshirtSize,
  reorderTshirtSizes,
  deleteTshirtSize,
} = await import("./tshirt-sizes");

beforeEach(() => {
  prismaMock.tshirtSize.findMany.mockResolvedValue([]);
  prismaMock.tshirtSize.findUnique.mockResolvedValue(null);
  prismaMock.tshirtSize.aggregate.mockResolvedValue({
    _max: { sortOrder: 2 },
  } as never);
  prismaMock.tshirtSize.create.mockResolvedValue({} as never);
  prismaMock.tshirtSize.update.mockResolvedValue({} as never);
  prismaMock.tshirtSize.delete.mockResolvedValue({} as never);
  prismaMock.$transaction.mockImplementation((arg) =>
    Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock),
  );
});

describe("listTshirtSizes (#388)", () => {
  it("carries the affected member count per size, sorted by sortOrder", async () => {
    prismaMock.tshirtSize.findMany.mockResolvedValue([
      { id: "s-1", label: "128", sortOrder: 0, _count: { members: 3 } },
      { id: "s-2", label: "S", sortOrder: 1, _count: { members: 0 } },
    ] as never);

    const result = await listTshirtSizes();

    expect(result).toEqual([
      { id: "s-1", label: "128", sortOrder: 0, memberCount: 3 },
      { id: "s-2", label: "S", sortOrder: 1, memberCount: 0 },
    ]);
    expect(prismaMock.tshirtSize.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { sortOrder: "asc" } }),
    );
  });
});

describe("createTshirtSize (#388)", () => {
  it("rejects a blank label", async () => {
    expect(await createTshirtSize("  ")).toEqual({
      error: "Bitte eine Bezeichnung angeben.",
    });
    expect(prismaMock.tshirtSize.create).not.toHaveBeenCalled();
  });

  it("rejects a duplicate label", async () => {
    prismaMock.tshirtSize.findUnique.mockResolvedValue({ id: "s-1" } as never);

    expect(await createTshirtSize("S")).toEqual({
      error: "„S“ existiert bereits.",
    });
  });

  it("appends after the current highest sortOrder", async () => {
    const result = await createTshirtSize("XL");

    expect(result).toEqual({ success: true });
    expect(prismaMock.tshirtSize.create).toHaveBeenCalledWith({
      data: { label: "XL", sortOrder: 3 },
    });
  });
});

describe("renameTshirtSize (#388)", () => {
  it("rejects a blank label", async () => {
    expect(await renameTshirtSize("s-1", " ")).toEqual({
      error: "Bitte eine Bezeichnung angeben.",
    });
  });

  it("rejects a rename onto another size's existing label", async () => {
    prismaMock.tshirtSize.findUnique.mockResolvedValue({
      id: "s-2",
    } as never);

    expect(await renameTshirtSize("s-1", "S")).toEqual({
      error: "„S“ existiert bereits.",
    });
  });

  it("allows renaming a size onto its own unchanged label", async () => {
    prismaMock.tshirtSize.findUnique.mockResolvedValue({
      id: "s-1",
    } as never);

    expect(await renameTshirtSize("s-1", "S")).toEqual({ success: true });
    expect(prismaMock.tshirtSize.update).toHaveBeenCalledWith({
      where: { id: "s-1" },
      data: { label: "S" },
    });
  });
});

describe("reorderTshirtSizes (#388)", () => {
  it("writes every size's new sortOrder in one transaction", async () => {
    const result = await reorderTshirtSizes(["s-2", "s-1"]);

    expect(result).toEqual({ success: true });
    expect(prismaMock.tshirtSize.update).toHaveBeenCalledWith({
      where: { id: "s-2" },
      data: { sortOrder: 0 },
    });
    expect(prismaMock.tshirtSize.update).toHaveBeenCalledWith({
      where: { id: "s-1" },
      data: { sortOrder: 1 },
    });
  });
});

describe("deleteTshirtSize (#388)", () => {
  it("deletes the size — Member.tshirtSizeId reset runs via onDelete: SetNull", async () => {
    expect(await deleteTshirtSize("s-1")).toEqual({ success: true });
    expect(prismaMock.tshirtSize.delete).toHaveBeenCalledWith({
      where: { id: "s-1" },
    });
  });
});
