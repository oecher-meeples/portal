import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
}));

const hasPermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}));

const exchangeCodeForShortLivedTokenMock = vi.fn();
const getLongLivedTokenMock = vi.fn();
const getInstagramBusinessAccountMock = vi.fn();
vi.mock("@/lib/instagram/graph-client", () => ({
  exchangeCodeForShortLivedToken: (...args: unknown[]) =>
    exchangeCodeForShortLivedTokenMock(...args),
  getLongLivedToken: (...args: unknown[]) => getLongLivedTokenMock(...args),
  getInstagramBusinessAccount: (...args: unknown[]) =>
    getInstagramBusinessAccountMock(...args),
}));

const { GET } = await import("./route");
const { buildStateCookie } = await import("@/lib/instagram/oauth-state");

const CALLBACK_URL = "https://example.com/api/auth/instagram/callback";
const USER = { id: "user-1" };

function requestWith({
  code,
  state,
  cookie,
}: {
  code?: string;
  state?: string;
  cookie?: string;
}) {
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (state) params.set("state", state);

  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;

  return new Request(`${CALLBACK_URL}?${params}`, { headers });
}

/** Extracts just the `name=value` pair, dropping cookie attributes. */
function cookiePair(setCookieHeader: string) {
  return setCookieHeader.split(";")[0];
}

describe("GET /api/auth/instagram/callback", () => {
  beforeEach(() => {
    process.env.NEON_AUTH_COOKIE_SECRET = "test-cookie-secret";
    getCurrentUserMock.mockReset();
    hasPermissionMock.mockReset();
    exchangeCodeForShortLivedTokenMock.mockReset();
    getLongLivedTokenMock.mockReset();
    getInstagramBusinessAccountMock.mockReset();
    getCurrentUserMock.mockResolvedValue(USER);
    hasPermissionMock.mockResolvedValue(true);
  });

  it("rejects without a logged-in user and writes nothing", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const request = requestWith({ code: "auth-code", state: "state-1" });

    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(exchangeCodeForShortLivedTokenMock).not.toHaveBeenCalled();
    expect(prismaMock.instagramConnection.create).not.toHaveBeenCalled();
    expect(prismaMock.instagramConnection.update).not.toHaveBeenCalled();
  });

  it("rejects a user without instagram:connect and writes nothing", async () => {
    hasPermissionMock.mockResolvedValue(false);
    const request = requestWith({ code: "auth-code", state: "state-1" });

    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(exchangeCodeForShortLivedTokenMock).not.toHaveBeenCalled();
    expect(prismaMock.instagramConnection.create).not.toHaveBeenCalled();
    expect(prismaMock.instagramConnection.update).not.toHaveBeenCalled();
  });

  it("rejects when the state parameter is missing", async () => {
    const request = requestWith({
      code: "auth-code",
      cookie: cookiePair(buildStateCookie(USER.id, "state-1")),
    });

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(exchangeCodeForShortLivedTokenMock).not.toHaveBeenCalled();
  });

  it("rejects when the state parameter does not match the cookie", async () => {
    const request = requestWith({
      code: "auth-code",
      state: "state-1",
      cookie: cookiePair(buildStateCookie(USER.id, "state-2")),
    });

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(exchangeCodeForShortLivedTokenMock).not.toHaveBeenCalled();
  });

  it("rejects when the state cookie was signed for a different session", async () => {
    const request = requestWith({
      code: "auth-code",
      state: "state-1",
      cookie: cookiePair(buildStateCookie("someone-else", "state-1")),
    });

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(exchangeCodeForShortLivedTokenMock).not.toHaveBeenCalled();
  });

  it("upserts the instagram connection on a valid callback", async () => {
    exchangeCodeForShortLivedTokenMock.mockResolvedValue({
      accessToken: "short-lived",
    });
    getLongLivedTokenMock.mockResolvedValue({
      accessToken: "long-lived",
      expiresInSeconds: 5_184_000,
    });
    getInstagramBusinessAccountMock.mockResolvedValue({
      pageId: "page-1",
      igBusinessAccountId: "ig-1",
    });
    prismaMock.instagramConnection.findFirst.mockResolvedValue(null);

    const request = requestWith({
      code: "auth-code",
      state: "state-1",
      cookie: cookiePair(buildStateCookie(USER.id, "state-1")),
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(prismaMock.instagramConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accessToken: "long-lived",
        pageId: "page-1",
        igBusinessAccountId: "ig-1",
      }),
    });
  });

  it("updates an existing instagram connection instead of creating a new one", async () => {
    exchangeCodeForShortLivedTokenMock.mockResolvedValue({
      accessToken: "short-lived",
    });
    getLongLivedTokenMock.mockResolvedValue({
      accessToken: "long-lived",
      expiresInSeconds: 5_184_000,
    });
    getInstagramBusinessAccountMock.mockResolvedValue({
      pageId: "page-1",
      igBusinessAccountId: "ig-1",
    });
    prismaMock.instagramConnection.findFirst.mockResolvedValue({
      id: "connection-1",
    } as never);

    const request = requestWith({
      code: "auth-code",
      state: "state-1",
      cookie: cookiePair(buildStateCookie(USER.id, "state-1")),
    });

    await GET(request);

    expect(prismaMock.instagramConnection.update).toHaveBeenCalledWith({
      where: { id: "connection-1" },
      data: expect.objectContaining({ accessToken: "long-lived" }),
    });
    expect(prismaMock.instagramConnection.create).not.toHaveBeenCalled();
  });
});
