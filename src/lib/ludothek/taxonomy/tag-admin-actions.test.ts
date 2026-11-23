import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

const requireGamesManagePermissionMock = vi.fn(async () => ({ id: "user-1" }));

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom(() =>
    requireGamesManagePermissionMock(),
  ),
);

const { updateTagDisplayName } = await import("./tag-admin-actions");

describe("updateTagDisplayName", () => {
  it("rejects without the games:manage permission", async () => {
    requireGamesManagePermissionMock.mockResolvedValueOnce(null as never);

    const result = await updateTagDisplayName("t1", "Arbeitereinsatz");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.tag.update).not.toHaveBeenCalled();
  });

  it("stores the trimmed display name", async () => {
    prismaMock.tag.findUnique.mockResolvedValueOnce({ id: "t1" } as never);

    const result = await updateTagDisplayName("t1", "  Arbeitereinsatz ");

    expect(result).toEqual({ success: true });
    expect(prismaMock.tag.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { displayName: "Arbeitereinsatz" },
    });
  });

  it("clears the display name for an empty value", async () => {
    prismaMock.tag.findUnique.mockResolvedValueOnce({ id: "t1" } as never);

    await updateTagDisplayName("t1", "   ");

    expect(prismaMock.tag.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { displayName: null },
    });
  });

  it("reports a missing tag", async () => {
    prismaMock.tag.findUnique.mockResolvedValueOnce(null);

    expect(await updateTagDisplayName("missing", "x")).toEqual({
      error: "Eintrag nicht gefunden.",
    });
  });
});
