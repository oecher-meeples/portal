import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const processPostMock = vi.fn();
vi.mock("@/lib/instagram/queue", () => ({
  processPost: (...args: unknown[]) => processPostMock(...args),
}));

const generateClientTokenMock = vi.fn();
vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: (...args: unknown[]) =>
    generateClientTokenMock(...args),
}));

const {
  createPost,
  updatePost,
  deletePost,
  retryInstagramPost,
  getUploadToken,
} = await import("./actions");

const VALID_INPUT = {
  type: "blog" as const,
  title: "Neuer Beitrag",
  excerpt: "Kurzbeschreibung",
  body: "Inhalt des Beitrags",
  date: "2026-08-01",
  status: "PUBLISHED" as const,
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
      error: "Bitte Titel, Typ, Datum und Inhalt ausfüllen.",
    });
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("derives the excerpt from the first 130 characters of the body when left empty", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);
    const body = "x".repeat(180);

    await createPost({ ...VALID_INPUT, excerpt: "", body });

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ excerpt: `${"x".repeat(130)}...` }),
    });
  });

  it("uses the full body as the excerpt when it is 130 characters or shorter", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);
    const body = "x".repeat(80);

    await createPost({ ...VALID_INPUT, excerpt: "   ", body });

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ excerpt: body }),
    });
  });

  it("keeps an explicitly given excerpt instead of deriving one from the body", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost({
      ...VALID_INPUT,
      excerpt: "Handverlesen",
      body: "x".repeat(180),
    });

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ excerpt: "Handverlesen" }),
    });
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

  it("never queues a draft for instagram, even with the flag set", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost({ ...VALID_INPUT, status: "DRAFT", instagram: true });

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ instagramStatus: null, status: "DRAFT" }),
    });
  });

  it("never queues an internal post for instagram, even with the flag set", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost({ ...VALID_INPUT, internal: true, instagram: true });

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ instagramStatus: null, internal: true }),
    });
  });
});

describe("Blog-Beitrag speichern (technisch, ohne UI)", () => {
  it("legt einen Blog-Beitrag mit allen vom Formular gesendeten Feldern an", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    // Entspricht genau dem Input, den post-form.tsx beim Absenden sendet
    // (inkl. der vorausgefüllten Felder Datum/Autor und optionalem Excerpt).
    const input = {
      type: "blog" as const,
      title: "Sommerfest der Meeples",
      date: "2026-07-30",
      excerpt: "",
      author: "Jan Herwig",
      body: "Unser Sommerfest war ein voller Erfolg. Danke an alle Helfer:innen!",
      instagram: false,
      internal: false,
      status: "PUBLISHED" as const,
      coverImageUrl: undefined,
    };

    const result = await createPost(input);

    expect(result).toEqual({ success: true, id: "post-1" });
    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: {
        slug: "sommerfest-der-meeples",
        type: "BLOG",
        title: "Sommerfest der Meeples",
        excerpt: input.body,
        body: input.body,
        date: new Date("2026-07-30"),
        author: "Jan Herwig",
        location: null,
        internal: false,
        instagram: false,
        status: "PUBLISHED",
        coverImageUrl: null,
        instagramStatus: null,
      },
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

  it("clears an existing instagramStatus when a post stays a draft", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    await updatePost("post-1", {
      ...VALID_INPUT,
      status: "DRAFT",
      instagram: true,
    });

    expect(prismaMock.post.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({ instagramStatus: null, status: "DRAFT" }),
    });
  });

  it("sets instagramStatus to PENDING when a formerly draft post is published with instagram enabled", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.findUnique.mockResolvedValue({
      instagramStatus: null,
    } as never);

    await updatePost("post-1", {
      ...VALID_INPUT,
      status: "PUBLISHED",
      instagram: true,
    });

    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({ instagramStatus: "PENDING" }),
    });
  });

  it("clears an existing instagramStatus when a post becomes internal", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    await updatePost("post-1", {
      ...VALID_INPUT,
      internal: true,
      instagram: true,
    });

    expect(prismaMock.post.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({ instagramStatus: null, internal: true }),
    });
  });
});

describe("retryInstagramPost", () => {
  it("rejects when the user lacks the posts:write permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await retryInstagramPost("post-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.post.update).not.toHaveBeenCalled();
    expect(processPostMock).not.toHaveBeenCalled();
  });

  it("resets the attempt counter and immediately reprocesses the post", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.update.mockResolvedValue({
      id: "post-1",
      instagramAttempts: 0,
      instagramStatus: "PENDING",
    } as never);
    processPostMock.mockResolvedValue(true);

    const result = await retryInstagramPost("post-1");

    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: {
        instagramAttempts: 0,
        instagramStatus: "PENDING",
        instagramLastError: null,
      },
    });
    expect(processPostMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, posted: true });
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

describe("getUploadToken", () => {
  it("rejects when there is no logged-in user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(getUploadToken("instagram-covers/a.png")).rejects.toThrow(
      "Keine Berechtigung.",
    );
    expect(generateClientTokenMock).not.toHaveBeenCalled();
  });

  it("rejects when the user lacks the posts:write permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    await expect(getUploadToken("instagram-covers/a.png")).rejects.toThrow(
      "Keine Berechtigung.",
    );
    expect(generateClientTokenMock).not.toHaveBeenCalled();
  });

  it("normalises a client-chosen prefix to the instagram-covers namespace", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    generateClientTokenMock.mockResolvedValue("token-123");

    const token = await getUploadToken("posts/../../evil.png");

    expect(token).toBe("token-123");
    expect(generateClientTokenMock).toHaveBeenCalledWith({
      pathname: "instagram-covers/evil.png",
      allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
      addRandomSuffix: true,
      maximumSizeInBytes: 8 * 1024 * 1024,
    });
  });
});
