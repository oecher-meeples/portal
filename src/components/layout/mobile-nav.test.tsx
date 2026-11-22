import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileNav } from "@/components/layout/mobile-nav";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: () => "/",
}));

const signOutMock = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  authClient: { signOut: (...args: unknown[]) => signOutMock(...args) },
}));

vi.mock("@/components/feature/admin-preview-tier/actions", () => ({
  setPreviewTier: vi.fn(),
}));

const FLAGS = {
  openHelperRequest: false,
  activeAusleiheShift: false,
  activeMembership: false,
} as const;

function renderNav(user: { name: string; meepleId: string } | null) {
  render(
    <MobileNav
      tier={user ? "mitglied" : "gast"}
      realTier={user ? "mitglied" : "gast"}
      permissions={[]}
      flags={FLAGS}
      user={user}
    />,
  );
  // Erste Gruppe („Öffentlich") öffnen — dort stehen die Konto-Einträge.
  fireEvent.click(screen.getByRole("button", { name: /Öffentlich/ }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("MobileNav — Konto-Einträge im ersten Sheet (#582)", () => {
  it("shows „Anmelden“ for guests", async () => {
    renderNav(null);

    const login = await screen.findByText("Anmelden");
    expect(login.closest("a")).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /Abmelden/ })).toBeNull();
  });

  it("signs out like the header does (localStorage cleared, back home)", async () => {
    localStorage.setItem("notification-closed:manual:abc", "1");
    signOutMock.mockResolvedValue(undefined);
    renderNav({ name: "Erika Musterfrau", meepleId: "meeple-1" });

    expect(
      await screen.findByRole("link", { name: "Erika Musterfrau" }),
    ).toHaveAttribute("href", "/profil");
    fireEvent.click(screen.getByRole("button", { name: /Abmelden/ }));

    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(signOutMock).toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });
});
