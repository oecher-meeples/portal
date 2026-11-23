import { beforeEach, describe, expect, it, vi } from "vitest";

const getRealSessionTierMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  PREVIEW_TIER_COOKIE: "preview-tier",
  getRealSessionTier: (...args: unknown[]) => getRealSessionTierMock(...args),
}));

const setMock = vi.fn();
const deleteMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: setMock, delete: deleteMock }),
}));

const { setPreviewTier } = await import("./actions");

describe("setPreviewTier", () => {
  beforeEach(() => {
    getRealSessionTierMock.mockReset();
    setMock.mockReset();
    deleteMock.mockReset();
  });

  it("does nothing for a non-admin session", async () => {
    getRealSessionTierMock.mockResolvedValue("mitglied");

    await setPreviewTier("gast");

    expect(setMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("does nothing for an unknown tier value", async () => {
    getRealSessionTierMock.mockResolvedValue("admin");

    await setPreviewTier("not-a-real-tier" as never);

    expect(setMock).not.toHaveBeenCalled();
  });

  it("stores the preview cookie when explicitly switching to admin", async () => {
    getRealSessionTierMock.mockResolvedValue("admin");

    await setPreviewTier("admin");

    expect(deleteMock).not.toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(
      "preview-tier",
      "admin",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      }),
    );
  });

  it("sets a Secure, HttpOnly preview cookie for an admin lowering their tier", async () => {
    getRealSessionTierMock.mockResolvedValue("admin");

    await setPreviewTier("gast");

    expect(setMock).toHaveBeenCalledWith(
      "preview-tier",
      "gast",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      }),
    );
  });
});
