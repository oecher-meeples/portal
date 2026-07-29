import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const resolveCoverImageUrlMock = vi.fn();
vi.mock("@/lib/instagram/cover-image", () => ({
  resolveCoverImageUrl: (...args: unknown[]) =>
    resolveCoverImageUrlMock(...args),
}));

const createMediaContainerMock = vi.fn();
const publishMediaMock = vi.fn();
const refreshLongLivedTokenMock = vi.fn();
vi.mock("@/lib/instagram/graph-client", () => ({
  createMediaContainer: (...args: unknown[]) =>
    createMediaContainerMock(...args),
  publishMedia: (...args: unknown[]) => publishMediaMock(...args),
  refreshLongLivedToken: (...args: unknown[]) =>
    refreshLongLivedTokenMock(...args),
}));

const { findDuePosts, processPost, processQueue, refreshConnectionIfNeeded } =
  await import("./queue");

const CONNECTION = {
  id: "connection-1",
  accessToken: "token",
  igBusinessAccountId: "17841400000000000",
  pageId: "page-1",
  expiresAt: new Date("2027-01-01"),
  updatedAt: new Date(),
};

function makePost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "post-1",
    slug: "spieleabend-juli",
    type: "BLOG",
    title: "Spieleabend im Juli",
    excerpt: "Wir treffen uns wieder.",
    body: "...",
    date: new Date("2026-07-01"),
    author: null,
    location: null,
    internal: null,
    instagram: true,
    coverImageUrl: null,
    instagramStatus: "PENDING",
    instagramPostUrl: null,
    instagramAttempts: 0,
    instagramLastError: null,
    ...overrides,
  } as never;
}

describe("findDuePosts", () => {
  it("queries posts flagged for instagram sharing under the attempt limit", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);

    await findDuePosts();

    expect(prismaMock.post.findMany).toHaveBeenCalledWith({
      where: {
        instagram: true,
        instagramStatus: { in: ["PENDING", "QUEUED"] },
        instagramAttempts: { lt: 3 },
      },
    });
  });
});

describe("processPost", () => {
  beforeEach(() => {
    resolveCoverImageUrlMock.mockReset();
    createMediaContainerMock.mockReset();
    publishMediaMock.mockReset();
    prismaMock.instagramConnection.findFirst.mockResolvedValue(
      CONNECTION as never,
    );
    resolveCoverImageUrlMock.mockResolvedValue(
      "https://example.com/cover.png",
    );
  });

  it("marks the post as posted on success", async () => {
    createMediaContainerMock.mockResolvedValue({ creationId: "creation-1" });
    publishMediaMock.mockResolvedValue({ mediaId: "media-1" });

    const success = await processPost(makePost());

    expect(success).toBe(true);
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({
        instagramStatus: "POSTED",
        instagramPostUrl: "https://www.instagram.com/p/media-1/",
        instagramLastError: null,
      }),
    });
  });

  it("increments the attempt counter and stays PENDING below the limit", async () => {
    createMediaContainerMock.mockRejectedValue(new Error("Rate limit"));

    const success = await processPost(makePost({ instagramAttempts: 1 }));

    expect(success).toBe(false);
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({
        instagramAttempts: 2,
        instagramLastError: "Rate limit",
        instagramStatus: "PENDING",
      }),
    });
  });

  it("marks the post as FAILED once the attempt limit is reached", async () => {
    createMediaContainerMock.mockRejectedValue(new Error("Rate limit"));

    const success = await processPost(makePost({ instagramAttempts: 2 }));

    expect(success).toBe(false);
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({
        instagramAttempts: 3,
        instagramStatus: "FAILED",
      }),
    });
  });
});

describe("processQueue", () => {
  beforeEach(() => {
    resolveCoverImageUrlMock.mockReset();
    createMediaContainerMock.mockReset();
    publishMediaMock.mockReset();
    prismaMock.instagramConnection.findFirst.mockResolvedValue(
      CONNECTION as never,
    );
    resolveCoverImageUrlMock.mockResolvedValue(
      "https://example.com/cover.png",
    );
  });

  it("summarizes processed, succeeded and failed posts", async () => {
    prismaMock.post.findMany.mockResolvedValue([
      makePost({ id: "post-1" }),
      makePost({ id: "post-2" }),
    ] as never);
    createMediaContainerMock.mockResolvedValue({ creationId: "creation-1" });
    publishMediaMock
      .mockResolvedValueOnce({ mediaId: "media-1" })
      .mockRejectedValueOnce(new Error("boom"));

    const summary = await processQueue();

    expect(summary).toEqual({ processed: 2, succeeded: 1, failed: 1 });
  });
});

describe("refreshConnectionIfNeeded", () => {
  const NOW = new Date("2026-07-01T00:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    refreshLongLivedTokenMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when there is no active connection", async () => {
    prismaMock.instagramConnection.findFirst.mockResolvedValue(null);

    await refreshConnectionIfNeeded();

    expect(refreshLongLivedTokenMock).not.toHaveBeenCalled();
  });

  it("does not refresh when the token is not close to expiring", async () => {
    prismaMock.instagramConnection.findFirst.mockResolvedValue({
      ...CONNECTION,
      expiresAt: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
    } as never);

    await refreshConnectionIfNeeded();

    expect(refreshLongLivedTokenMock).not.toHaveBeenCalled();
  });

  it("refreshes and updates the connection when the token expires within 10 days", async () => {
    prismaMock.instagramConnection.findFirst.mockResolvedValue({
      ...CONNECTION,
      expiresAt: new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000),
    } as never);
    refreshLongLivedTokenMock.mockResolvedValue({
      accessToken: "refreshed-token",
      expiresInSeconds: 5_184_000,
    });

    await refreshConnectionIfNeeded();

    expect(refreshLongLivedTokenMock).toHaveBeenCalledWith("token");
    expect(prismaMock.instagramConnection.update).toHaveBeenCalledWith({
      where: { id: "connection-1" },
      data: expect.objectContaining({ accessToken: "refreshed-token" }),
    });
  });

  it("does not throw and leaves the connection untouched when the refresh fails", async () => {
    prismaMock.instagramConnection.findFirst.mockResolvedValue({
      ...CONNECTION,
      expiresAt: new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000),
    } as never);
    refreshLongLivedTokenMock.mockRejectedValue(new Error("boom"));

    await expect(refreshConnectionIfNeeded()).resolves.toBeUndefined();
    expect(prismaMock.instagramConnection.update).not.toHaveBeenCalled();
  });
});
