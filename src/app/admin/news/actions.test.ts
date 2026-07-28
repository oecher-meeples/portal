import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const { createPost, updatePost, deletePost } = await import("./actions");

const VALID_INPUT = {
  type: "blog" as const,
  title: "Neuer Beitrag",
  excerpt: "Kurzbeschreibung",
  body: "Inhalt des Beitrags",
  date: "2026-08-01",
};

describe("createPost", () => {
  it("rejects when there is no logged-in user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await createPost(VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("rejects when the user lacks the posts:write permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await createPost(VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("rejects when required fields are missing", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await createPost({ ...VALID_INPUT, title: "" });

    expect(result).toEqual({
      error: "Bitte Titel, Typ, Datum, Excerpt und Inhalt ausfüllen.",
    });
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("creates the post when authorized and valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    const result = await createPost(VALID_INPUT);

    expect(result).toEqual({ success: true, id: "post-1" });
    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "neuer-beitrag",
        type: "BLOG",
        title: "Neuer Beitrag",
      }),
    });
  });
});

describe("updatePost", () => {
  it("rejects when the user lacks the posts:write permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await updatePost("post-1", VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.post.update).not.toHaveBeenCalled();
  });

  it("updates the post when authorized and valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await updatePost("post-1", VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({ title: "Neuer Beitrag" }),
    });
  });
});

describe("deletePost", () => {
  it("rejects when the user lacks the posts:delete permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await deletePost("post-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.post.delete).not.toHaveBeenCalled();
  });

  it("deletes the post when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await deletePost("post-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.post.delete).toHaveBeenCalledWith({
      where: { id: "post-1" },
    });
  });
});
