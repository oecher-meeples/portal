import { describe, expect, it, vi } from "vitest";

process.env.NEON_AUTH_BASE_URL = "https://example.neonauth.example/auth";
process.env.NEON_AUTH_COOKIE_SECRET = "test-cookie-secret";

const getSessionMock = vi.fn();
vi.mock("@neondatabase/auth/next/server", () => ({
  createNeonAuth: () => ({ getSession: getSessionMock }),
}));

const { getCurrentUser } = await import("./server");

describe("getCurrentUser", () => {
  it("disables the session refresh, since it runs during Server Component render where cookies can't be written", async () => {
    getSessionMock.mockResolvedValue({ data: { user: { id: "user-1" } } });

    await getCurrentUser();

    expect(getSessionMock).toHaveBeenCalledWith({
      query: { disableRefresh: true },
    });
  });

  it("returns the session user", async () => {
    getSessionMock.mockResolvedValue({ data: { user: { id: "user-1" } } });

    expect(await getCurrentUser()).toEqual({ id: "user-1" });
  });

  it("returns null without a session", async () => {
    getSessionMock.mockResolvedValue({ data: null });

    expect(await getCurrentUser()).toBeNull();
  });
});
