import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { UserMenu } from "@/components/layout/user-menu";
import { PINNED_STORAGE_KEY } from "@/components/layout/sidebar";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signOutMock = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  authClient: { signOut: (...args: unknown[]) => signOutMock(...args) },
}));

const clearPreviewTierMock = vi.fn();
vi.mock("@/components/feature/admin-preview-tier/actions", () => ({
  clearPreviewTier: () => clearPreviewTierMock(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("UserMenu — Logout räumt Client-Präferenzen (#472, #339)", () => {
  it("clears the entire localStorage on sign-out, not just one key", async () => {
    localStorage.setItem(PINNED_STORAGE_KEY, "true");
    localStorage.setItem("notification-closed:manual:abc", "1");
    signOutMock.mockResolvedValue(undefined);
    clearPreviewTierMock.mockResolvedValue(undefined);

    render(
      <UserMenu user={{ name: "Erika Musterfrau", meepleId: "meeple-1" }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Abmelden/ }));

    await vi.waitFor(() => {
      expect(localStorage.length).toBe(0);
    });
  });

  it("still signs out and navigates home when no pin preference was set", async () => {
    signOutMock.mockResolvedValue(undefined);
    clearPreviewTierMock.mockResolvedValue(undefined);

    render(
      <UserMenu user={{ name: "Erika Musterfrau", meepleId: "meeple-1" }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Abmelden/ }));

    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
