import { describe, expect, it, vi } from "vitest";
import { mockPermissionKeys, prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).currentUserGuards(),
);

const createBlobUploadTokenMock = vi.fn();
vi.mock("@/lib/utils/blob-upload-token", () => ({
  createBlobUploadToken: (...args: unknown[]) =>
    createBlobUploadTokenMock(...args),
}));

const { getPostImageUploadToken, registerPostImage } =
  await import("./post-image-actions");

function loginAs(keys: "all" | string[]) {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  mockPermissionKeys(keys);
}

describe("getPostImageUploadToken", () => {
  it("rejects anonymous users and users without post rights", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    await expect(
      getPostImageUploadToken("blog-images/a.png", "image/png"),
    ).rejects.toThrow("Keine Berechtigung.");

    loginAs([]);
    await expect(
      getPostImageUploadToken("blog-images/a.png", "image/png"),
    ).rejects.toThrow("Keine Berechtigung.");
    expect(createBlobUploadTokenMock).not.toHaveBeenCalled();
  });

  it("restricts path, type and size", async () => {
    loginAs(["posts:internal"]);
    createBlobUploadTokenMock.mockResolvedValue("token");

    const token = await getPostImageUploadToken("../../evil.png", "image/png");

    expect(token).toBe("token");
    expect(createBlobUploadTokenMock).toHaveBeenCalledWith({
      pathname: "blog-images/evil.png",
      contentType: "image/png",
      allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
      addRandomSuffix: true,
      maximumSizeInBytes: 10 * 1024 * 1024,
    });
  });
});

describe("registerPostImage", () => {
  it("denies users without post rights", async () => {
    loginAs([]);

    const result = await registerPostImage("blog-images/a.png");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.postImage.create).not.toHaveBeenCalled();
  });

  it("stores an unlinked image and returns its permanent url", async () => {
    loginAs("all");
    prismaMock.postImage.create.mockResolvedValue({ id: "img1" } as never);

    const result = await registerPostImage("blog-images/a-x1.png");

    expect(prismaMock.postImage.create).toHaveBeenCalledWith({
      data: { key: "blog-images/a-x1.png" },
    });
    expect(result).toEqual({
      success: true,
      id: "img1",
      url: "/api/blog-images/img1",
    });
  });

  it("rejects keys outside the blog-images prefix", async () => {
    loginAs("all");

    const result = await registerPostImage("downloads/secret.pdf");

    expect(result).toEqual({ error: "Ungültiger Dateiverweis." });
    expect(prismaMock.postImage.create).not.toHaveBeenCalled();
  });
});
