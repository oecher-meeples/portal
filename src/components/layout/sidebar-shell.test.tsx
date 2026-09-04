import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SidebarShell } from "@/components/layout/sidebar-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const FLAGS = { openHelperRequest: false, activeAusleiheShift: false };

// #471: main muss dieselbe Breite bekommen, die die Sidebar bei aktivem Pin
// tatsächlich einnimmt (Attached- statt Overlay-Zustand auf md/lg) — ein
// zweiter, unabhängiger useLocalStorageState-Aufruf würde nicht mitziehen.
describe("SidebarShell — Pin verschiebt main-Margin synchron (#471)", () => {
  it("keeps main at ml-16 while unpinned", () => {
    render(
      <SidebarShell
        tier="mitglied"
        realTier="mitglied"
        permissions={[]}
        flags={FLAGS}
        notifications={[]}
      >
        <p>Inhalt</p>
      </SidebarShell>,
    );

    const main = screen.getByText("Inhalt").closest("main");
    expect(main).toHaveClass("md:ml-16");
    expect(main).not.toHaveClass("md:ml-64");
  });

  it("switches main to ml-64 once the sidebar is pinned", () => {
    render(
      <SidebarShell
        tier="mitglied"
        realTier="mitglied"
        permissions={[]}
        flags={FLAGS}
        notifications={[]}
      >
        <p>Inhalt</p>
      </SidebarShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Anheften" }));

    const main = screen.getByText("Inhalt").closest("main");
    expect(main).toHaveClass("md:ml-64");
    expect(main).not.toHaveClass("md:ml-16");
  });
});
