import { describe, expect, it, vi } from "vitest";

process.env.BETTER_AUTH_URL = "http://localhost:3002";
process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long";

const getSessionMock = vi.fn();
const betterAuthMock = vi.fn((options: unknown) => {
  void options;
  return { api: { getSession: getSessionMock } };
});
vi.mock("better-auth", () => ({
  betterAuth: (options: unknown) => betterAuthMock(options),
}));
vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: () => "prisma-adapter",
}));
vi.mock("@/lib/utils/prisma", () => ({ prisma: {} }));

const requestHeaders = new Headers({ cookie: "better-auth.session_token=abc" });
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(requestHeaders),
}));

const { getCurrentUser, getCurrentSession } = await import("./server");

describe("auth instance", () => {
  it("is configured from BETTER_AUTH_URL/BETTER_AUTH_SECRET against our own Prisma adapter", () => {
    expect(betterAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://localhost:3002",
        secret: "test-secret-at-least-32-characters-long",
        database: "prisma-adapter",
      }),
    );
  });
});

describe("getCurrentUser", () => {
  it("disables the session refresh, since it runs during Server Component render where cookies can't be written", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    await getCurrentUser();

    expect(getSessionMock).toHaveBeenCalledWith({
      headers: requestHeaders,
      query: { disableRefresh: true },
    });
  });

  it("returns the session user", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    expect(await getCurrentUser()).toEqual({ id: "user-1" });
  });

  it("returns null without a session", async () => {
    getSessionMock.mockResolvedValue(null);

    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null instead of crashing when a cookie write is attempted during render", async () => {
    getSessionMock.mockRejectedValue(
      new Error(
        "Cookies can only be modified in a Server Action or Route Handler.",
      ),
    );

    expect(await getCurrentUser()).toBeNull();
  });

  it("rethrows unrelated errors", async () => {
    getSessionMock.mockRejectedValue(new Error("database is on fire"));

    await expect(getCurrentUser()).rejects.toThrow("database is on fire");
  });
});

describe("getCurrentSession", () => {
  it("returns the full session incl. createdAt", async () => {
    const createdAt = new Date("2026-08-01T00:00:00Z");
    getSessionMock.mockResolvedValue({
      user: { id: "user-1" },
      session: { createdAt },
    });

    expect(await getCurrentSession()).toEqual({
      user: { id: "user-1" },
      session: { createdAt },
    });
  });

  it("returns null without a session", async () => {
    getSessionMock.mockResolvedValue(null);

    expect(await getCurrentSession()).toBeNull();
  });

  it("returns null when a cookie write is attempted during render", async () => {
    getSessionMock.mockRejectedValue(
      new Error(
        "Cookies can only be modified in a Server Action or Route Handler.",
      ),
    );

    expect(await getCurrentSession()).toBeNull();
  });
});
