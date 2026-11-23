import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

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
const { encryptSecret, decryptSecret } = await import("@/lib/utils/crypto");

process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const PLAINTEXT_TOKEN = "long-lived-token";
const CONNECTION = {
  id: "connection-1",
  accessToken: encryptSecret(PLAINTEXT_TOKEN),
  igBusinessAccountId: "17841400000000000",
  pageId: "page-1",
  expiresAt: new Date("2027-01-01"),
  updatedAt: new Date(),
};

function makePost(
  instagramDetailsOverrides: Partial<Record<string, unknown>> = {},
  overrides: Partial<Record<string, unknown>> = {},
) {
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
    instagramDetails: {
      id: "details-1",
      postId: "post-1",
      status: "PENDING",
      postUrl: null,
      attempts: 0,
      lastError: null,
      ...instagramDetailsOverrides,
    },
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
        instagramDetails: {
          status: { in: ["PENDING", "QUEUED"] },
          attempts: { lt: 3 },
        },
      },
      include: { instagramDetails: true },
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
    resolveCoverImageUrlMock.mockResolvedValue("https://example.com/cover.png");
  });

  it("marks the post as posted on success", async () => {
    createMediaContainerMock.mockResolvedValue({ creationId: "creation-1" });
    publishMediaMock.mockResolvedValue({ mediaId: "media-1" });

    const success = await processPost(makePost());

    expect(success).toBe(true);
    expect(createMediaContainerMock).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: PLAINTEXT_TOKEN }),
    );
    expect(publishMediaMock).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: PLAINTEXT_TOKEN }),
    );
    expect(prismaMock.postInstagramDetails.update).toHaveBeenCalledWith({
      where: { postId: "post-1" },
      data: {
        status: "POSTED",
        postUrl: "https://www.instagram.com/p/media-1/",
        lastError: null,
      },
    });
  });

  it("increments the attempt counter and stays PENDING below the limit", async () => {
    createMediaContainerMock.mockRejectedValue(new Error("Rate limit"));

    const success = await processPost(makePost({ attempts: 1 }));

    expect(success).toBe(false);
    expect(prismaMock.postInstagramDetails.update).toHaveBeenCalledWith({
      where: { postId: "post-1" },
      data: {
        attempts: 2,
        lastError: "Rate limit",
        status: "PENDING",
      },
    });
  });

  it("marks the post as FAILED once the attempt limit is reached", async () => {
    createMediaContainerMock.mockRejectedValue(new Error("Rate limit"));

    const success = await processPost(makePost({ attempts: 2 }));

    expect(success).toBe(false);
    expect(prismaMock.postInstagramDetails.update).toHaveBeenCalledWith({
      where: { postId: "post-1" },
      data: {
        attempts: 3,
        lastError: "Rate limit",
        status: "FAILED",
      },
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
    resolveCoverImageUrlMock.mockResolvedValue("https://example.com/cover.png");
  });

  it("summarizes processed, succeeded and failed posts", async () => {
    prismaMock.post.findMany.mockResolvedValue([
      makePost({}, { id: "post-1" }),
      makePost({}, { id: "post-2" }),
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

    expect(refreshLongLivedTokenMock).toHaveBeenCalledWith(PLAINTEXT_TOKEN);
    const updateCall = prismaMock.instagramConnection.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "connection-1" });
    expect(decryptSecret(updateCall.data.accessToken as string)).toBe(
      "refreshed-token",
    );
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
