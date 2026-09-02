import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const listTshirtSizesMock = vi.fn();
const createTshirtSizeRecordMock = vi.fn();
const renameTshirtSizeRecordMock = vi.fn();
const reorderTshirtSizesRecordMock = vi.fn();
const deleteTshirtSizeRecordMock = vi.fn();
vi.mock("@/lib/members/tshirt-sizes", () => ({
  listTshirtSizes: () => listTshirtSizesMock(),
  createTshirtSize: (...args: unknown[]) => createTshirtSizeRecordMock(...args),
  renameTshirtSize: (...args: unknown[]) => renameTshirtSizeRecordMock(...args),
  reorderTshirtSizes: (...args: unknown[]) =>
    reorderTshirtSizesRecordMock(...args),
  deleteTshirtSize: (...args: unknown[]) => deleteTshirtSizeRecordMock(...args),
}));

const {
  loadTshirtSizes,
  createTshirtSize,
  renameTshirtSize,
  reorderTshirtSizes,
  deleteTshirtSize,
} = await import("./tshirt-size-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-1" });
  listTshirtSizesMock.mockReset().mockResolvedValue([]);
  createTshirtSizeRecordMock.mockReset().mockResolvedValue({ success: true });
  renameTshirtSizeRecordMock.mockReset().mockResolvedValue({ success: true });
  reorderTshirtSizesRecordMock.mockReset().mockResolvedValue({
    success: true,
  });
  deleteTshirtSizeRecordMock.mockReset().mockResolvedValue({ success: true });
});

for (const [name, fn, args] of [
  ["loadTshirtSizes", loadTshirtSizes, []],
  ["createTshirtSize", createTshirtSize, ["S"]],
  ["renameTshirtSize", renameTshirtSize, ["s-1", "S"]],
  ["reorderTshirtSizes", reorderTshirtSizes, [["s-1", "s-2"]]],
  ["deleteTshirtSize", deleteTshirtSize, ["s-1"]],
] as const) {
  it(`${name} requires members:manage`, async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(
      (fn as (...a: unknown[]) => Promise<unknown>)(...args),
    ).rejects.toThrow(ForbiddenError);
  });
}

describe("createTshirtSize", () => {
  it("passes a rule violation straight back", async () => {
    createTshirtSizeRecordMock.mockResolvedValue({
      error: "„S“ existiert bereits.",
    });

    expect(await createTshirtSize("S")).toEqual({
      error: "„S“ existiert bereits.",
    });
  });
});

describe("deleteTshirtSize", () => {
  it("delegates to the shared rule", async () => {
    expect(await deleteTshirtSize("s-1")).toEqual({ success: true });
    expect(deleteTshirtSizeRecordMock).toHaveBeenCalledWith("s-1");
  });
});
