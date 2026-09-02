import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

vi.mock("@/lib/instagram/queue", () => ({ processPost: vi.fn() }));

const queueNewsletterForPostMock = vi.fn();
vi.mock("@/lib/newsletter/dispatch", () => ({
  queueNewsletterForPost: (...args: unknown[]) =>
    queueNewsletterForPostMock(...args),
}));

vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: vi.fn(),
}));

const { createPost, updatePost } = await import("./actions");

const VALID_INPUT = {
  type: "blog" as const,
  title: "Neuer Beitrag",
  excerpt: "Kurzbeschreibung",
  body: "Inhalt des Beitrags",
  date: "2026-08-01",
  status: "PUBLISHED" as const,
};

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.rolePermission.count.mockResolvedValue(1);
  queueNewsletterForPostMock.mockClear();
});

describe("createPost — newsletter queueing", () => {
  it("queues the newsletter once a published post has newsletter sharing enabled", async () => {
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost({
      ...VALID_INPUT,
      sendAsNewsletter: true,
      newsletterCategory: "NEWS",
    });

    expect(queueNewsletterForPostMock).toHaveBeenCalledWith("post-1");
  });

  it("does not queue the newsletter for a draft, even with the checkbox set", async () => {
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost({
      ...VALID_INPUT,
      status: "DRAFT",
      sendAsNewsletter: true,
      newsletterCategory: "NEWS",
    });

    expect(queueNewsletterForPostMock).not.toHaveBeenCalled();
  });

  it("does not queue the newsletter when the checkbox is unset", async () => {
    prismaMock.post.create.mockResolvedValue({ id: "post-1" } as never);

    await createPost(VALID_INPUT);

    expect(queueNewsletterForPostMock).not.toHaveBeenCalled();
  });
});

describe("updatePost — newsletter queueing", () => {
  it("queues the newsletter when a formerly draft post is published with newsletter sharing enabled", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      instagramDetails: null,
      newsletterStatus: null,
    } as never);

    await updatePost("post-1", {
      ...VALID_INPUT,
      status: "PUBLISHED",
      sendAsNewsletter: true,
      newsletterCategory: "TERMINE",
    });

    expect(queueNewsletterForPostMock).toHaveBeenCalledWith("post-1");
  });

  it("does not re-queue the newsletter for a post that was already queued/sent", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      instagramDetails: null,
      newsletterStatus: "SENT",
    } as never);

    await updatePost("post-1", {
      ...VALID_INPUT,
      status: "PUBLISHED",
      sendAsNewsletter: true,
      newsletterCategory: "TERMINE",
    });

    expect(queueNewsletterForPostMock).not.toHaveBeenCalled();
  });
});
