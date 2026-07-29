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

  it("initializes instagramStatus to PENDING when instagram sharing is enabled", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost({ ...VALID_INPUT, instagram: true });

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ instagramStatus: "PENDING" }),
    });
  });

  it("leaves instagramStatus unset when instagram sharing is disabled", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost(VALID_INPUT);

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ instagramStatus: null }),
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

  it("sets instagramStatus to PENDING when enabling instagram sharing for the first time", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.findUnique.mockResolvedValue({
      instagramStatus: null,
    } as never);

    await updatePost("post-1", { ...VALID_INPUT, instagram: true });

    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({ instagramStatus: "PENDING" }),
    });
  });

  it("does not reset instagramStatus when instagram was already active", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.findUnique.mockResolvedValue({
      instagramStatus: "POSTED",
    } as never);

    await updatePost("post-1", { ...VALID_INPUT, instagram: true });

    const call = prismaMock.post.update.mock.calls.at(-1)?.[0];
    expect(call?.data).not.toHaveProperty("instagramStatus");
  });

  it("does not touch instagramStatus when instagram sharing stays disabled", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    await updatePost("post-1", VALID_INPUT);

    expect(prismaMock.post.findUnique).not.toHaveBeenCalled();
    const call = prismaMock.post.update.mock.calls.at(-1)?.[0];
    expect(call?.data).not.toHaveProperty("instagramStatus");
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
