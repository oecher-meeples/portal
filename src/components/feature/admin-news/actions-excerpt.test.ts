import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

vi.mock("@/lib/instagram/queue", () => ({ processPost: vi.fn() }));

vi.mock("@/lib/newsletter/dispatch", () => ({
  queueNewsletterForPost: vi.fn(),
}));

vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: vi.fn(),
}));

const { createPost } = await import("./actions");

const VALID_INPUT = {
  type: "blog" as const,
  title: "Neuer Beitrag",
  excerpt: "Kurzbeschreibung",
  body: "Inhalt des Beitrags",
  date: "2026-08-01",
  status: "PUBLISHED" as const,
};

// deriveExcerpt()-Verhalten von createPost() ausgelagert (#448) —
// actions.test.ts stieß an die 400-Zeilen-Grenze.
describe("createPost — Excerpt-Ableitung", () => {
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

  // #448: rohe Markdown-Syntax landete unverändert in der Karten-/
  // Listen-Vorschau, wenn kein manueller Excerpt gesetzt war.
  it("strips markdown syntax when deriving the excerpt from the body", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost({
      ...VALID_INPUT,
      excerpt: "",
      body: "# Titel\nEin **kurzer** Text mit `code`.",
    });

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        excerpt: "Titel\nEin kurzer Text mit code.",
      }),
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
});
