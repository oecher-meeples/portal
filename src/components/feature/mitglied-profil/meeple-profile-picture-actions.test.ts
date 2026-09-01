import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const requireMemberMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireMember: () => requireMemberMock(),
}));

const generateClientTokenMock = vi.fn();
vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: (...args: unknown[]) =>
    generateClientTokenMock(...args),
}));

const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));

const {
  getMeepleProfilePictureUploadToken,
  saveMeepleProfilePicture,
  updateMeepleProfilePictureVisibility,
  deleteMeepleProfilePicture,
} = await import("./meeple-profile-picture-actions");

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-1" });
  requireMemberMock.mockReset();
  generateClientTokenMock.mockReset().mockResolvedValue("token-123");
  deleteBlobsMock.mockReset().mockResolvedValue(undefined);
  prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
    profilePictureUrl: null,
  } as never);
  prismaMock.meeple.update.mockResolvedValue({} as never);
  prismaMock.member.findUnique.mockResolvedValue({
    slug: "mitglied-1",
  } as never);
});

describe("assertMayEdit gate (#389)", () => {
  it("allows the meeple themselves without members:manage", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });

    await getMeepleProfilePictureUploadToken("meeple-1", "pic.jpg");

    expect(requirePermissionMock).not.toHaveBeenCalled();
    expect(generateClientTokenMock).toHaveBeenCalled();
  });

  it("refuses a stranger without members:manage", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-other" } });
    requirePermissionMock.mockRejectedValue(new Error("/403"));

    await expect(
      getMeepleProfilePictureUploadToken("meeple-1", "pic.jpg"),
    ).rejects.toThrow();
  });
});

describe("saveMeepleProfilePicture (#389)", () => {
  it("stores the new url/visibility and deletes the previous blob", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      profilePictureUrl: "https://blob.example/old.jpg",
    } as never);

    const result = await saveMeepleProfilePicture(
      "meeple-1",
      "https://blob.example/new.jpg",
      "EVENTS",
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: {
        profilePictureUrl: "https://blob.example/new.jpg",
        profilePictureVisibility: "EVENTS",
      },
    });
    expect(deleteBlobsMock).toHaveBeenCalledWith([
      "https://blob.example/old.jpg",
    ]);
  });

  it("skips the delete call without a previous picture", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });

    await saveMeepleProfilePicture(
      "meeple-1",
      "https://blob.example/new.jpg",
      "INTERN",
    );

    expect(deleteBlobsMock).not.toHaveBeenCalled();
  });
});

describe("updateMeepleProfilePictureVisibility (#389)", () => {
  it("updates only the visibility flag", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });

    await updateMeepleProfilePictureVisibility("meeple-1", "IMMER");

    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: { profilePictureVisibility: "IMMER" },
    });
  });
});

describe("deleteMeepleProfilePicture (#389)", () => {
  it("deletes the blob and clears the url", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      profilePictureUrl: "https://blob.example/old.jpg",
    } as never);

    const result = await deleteMeepleProfilePicture("meeple-1");

    expect(result).toEqual({ success: true });
    expect(deleteBlobsMock).toHaveBeenCalledWith([
      "https://blob.example/old.jpg",
    ]);
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: { profilePictureUrl: null },
    });
  });
});
