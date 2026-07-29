import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

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

const CALLBACK_URL = "https://example.com/api/auth/instagram/callback";

function requestWith({
  code,
  state,
  cookieState,
}: {
  code?: string;
  state?: string;
  cookieState?: string;
}) {
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (state) params.set("state", state);

  const headers: Record<string, string> = {};
  if (cookieState) headers.cookie = `instagram_oauth_state=${cookieState}`;

  return new Request(`${CALLBACK_URL}?${params}`, { headers });
}

describe("GET /api/auth/instagram/callback", () => {
  beforeEach(() => {
    exchangeCodeForShortLivedTokenMock.mockReset();
    getLongLivedTokenMock.mockReset();
    getInstagramBusinessAccountMock.mockReset();
  });

  it("rejects when the state parameter is missing", async () => {
    const request = requestWith({ code: "auth-code", cookieState: "state-1" });

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(exchangeCodeForShortLivedTokenMock).not.toHaveBeenCalled();
  });

  it("rejects when the state parameter does not match the cookie", async () => {
    const request = requestWith({
      code: "auth-code",
      state: "state-1",
      cookieState: "state-2",
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
      cookieState: "state-1",
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
      cookieState: "state-1",
    });

    await GET(request);

    expect(prismaMock.instagramConnection.update).toHaveBeenCalledWith({
      where: { id: "connection-1" },
      data: expect.objectContaining({ accessToken: "long-lived" }),
    });
    expect(prismaMock.instagramConnection.create).not.toHaveBeenCalled();
  });
});
