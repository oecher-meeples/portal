import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { stubS3Env, TEST_S3_PUBLIC_BASE } from "@/lib/__mocks__/s3-env";

stubS3Env();
/** Upload-URL aus dem Client, gespeichert wird der Key (#112). */
const NEW_URL = `${TEST_S3_PUBLIC_BASE}/meeple-profile-pictures/new.jpg`;
const NEW_KEY = "meeple-profile-pictures/new.jpg";
const OLD_KEY = "meeple-profile-pictures/old.jpg";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();

const requireMemberMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireMember: () => requireMemberMock(),
}));

const createBlobUploadTokenMock = vi.fn();
vi.mock("@/lib/utils/blob-upload-token", () => ({
  createBlobUploadToken: (...args: unknown[]) =>
    createBlobUploadTokenMock(...args),
}));

const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom((...args) =>
    requirePermissionMock(...args),
  ),
);

const {
  getMeepleProfilePictureUploadToken,
  saveMeepleProfilePicture,
  updateMeepleProfilePictureVisibility,
  deleteMeepleProfilePicture,
} = await import("./meeple-profile-picture-actions");

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-1" });
  requireMemberMock.mockReset();
  createBlobUploadTokenMock.mockReset().mockResolvedValue("token-123");
  deleteBlobsMock.mockReset().mockResolvedValue(undefined);
  prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
    profilePictureKey: null,
  } as never);
  prismaMock.meeple.update.mockResolvedValue({} as never);
  prismaMock.member.findUnique.mockResolvedValue({
    slug: "mitglied-1",
  } as never);
});

describe("assertMayEdit gate (#389)", () => {
  it("allows the meeple themselves without members:manage", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });

    await getMeepleProfilePictureUploadToken(
      "meeple-1",
      "pic.jpg",
      "image/jpeg",
    );

    expect(requirePermissionMock).not.toHaveBeenCalled();
    expect(createBlobUploadTokenMock).toHaveBeenCalled();
  });

  it("refuses a stranger without members:manage", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-other" } });
    requirePermissionMock.mockRejectedValue(new Error("/403"));

    await expect(
      getMeepleProfilePictureUploadToken("meeple-1", "pic.jpg", "image/jpeg"),
    ).rejects.toThrow();
  });
});

describe("saveMeepleProfilePicture (#389)", () => {
  it("stores the new url/visibility and deletes the previous blob", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      profilePictureKey: OLD_KEY,
    } as never);

    const result = await saveMeepleProfilePicture(
      "meeple-1",
      NEW_URL,
      "EVENTS",
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: {
        profilePictureKey: NEW_KEY,
        profilePictureVisibility: "EVENTS",
      },
    });
    expect(deleteBlobsMock).toHaveBeenCalledWith([OLD_KEY]);
  });

  it("skips the delete call without a previous picture", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });

    await saveMeepleProfilePicture("meeple-1", NEW_URL, "INTERN");

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
      profilePictureKey: OLD_KEY,
    } as never);

    const result = await deleteMeepleProfilePicture("meeple-1");

    expect(result).toEqual({ success: true });
    expect(deleteBlobsMock).toHaveBeenCalledWith([OLD_KEY]);
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: { profilePictureKey: null },
    });
  });
});
