import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/ludothek/holding-actions", () => ({
  scanConfirmHolding: vi.fn(),
}));
vi.mock("@/components/feature/dashboard/important-links-editor", () => ({
  ImportantLinksEditor: () => null,
}));

afterEach(cleanup);

const { DashboardView } = await import("./dashboard-view");

function renderView(
  wantedExplainerGamesCount: number,
  unconfirmedShiftCount = 0,
) {
  return render(
    <DashboardView
      user={{ name: "Lea" } as never}
      meepleId="m-1"
      internalNews={[]}
      ownLoansCount={0}
      ownUnitContentsCount={0}
      unconfirmedHandovers={[]}
      unconfirmedReturns={[]}
      ownOpenLfgCount={0}
      upcomingShiftCount={0}
      totalOpenLfgCount={0}
      activeMarketListingCount={0}
      importantLinks={[]}
      canManageLinks={false}
      resignationNotice={null}
      isAusgetreten={false}
      openHelperRequestEvent={null}
      wantedExplainerGamesCount={wantedExplainerGamesCount}
      unconfirmedShiftCount={unconfirmedShiftCount}
    />,
  );
}

describe("DashboardView — Erklärer gesucht (#666)", () => {
  it("shows the count and links to tab 1 with filter Gesucht", () => {
    renderView(3);

    const link = screen.getByRole("link", { name: /Erklärer gesucht/ });
    expect(link).toHaveTextContent("Für 3 Spiele werden Erklärer gesucht");
    expect(link).toHaveAttribute("href", "/erklaerbaeren?filter=gesucht");
  });

  it("uses the singular for one game", () => {
    renderView(1);

    expect(
      screen.getByRole("link", { name: /Erklärer gesucht/ }),
    ).toHaveTextContent("Für 1 Spiel werden Erklärer gesucht");
  });

  it("is hidden at 0", () => {
    renderView(0);

    expect(
      screen.queryByRole("link", { name: /Erklärer gesucht/ }),
    ).not.toBeInTheDocument();
  });
});

describe("DashboardView — unbestätigte Schichten (#682)", () => {
  it("shows a card with the count badge linking to /helfer", () => {
    renderView(0, 2);

    const link = screen.getByRole("link", { name: /bestätigt werden/ });
    expect(link).toHaveAttribute("href", "/helfer");
    expect(link).toHaveTextContent("2");
  });

  it("is hidden at 0", () => {
    renderView(0, 0);

    expect(screen.queryByText(/bestätigt werden/)).not.toBeInTheDocument();
  });
});
