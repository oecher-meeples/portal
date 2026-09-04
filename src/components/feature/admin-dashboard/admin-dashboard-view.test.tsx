import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminDashboardView } from "@/components/feature/admin-dashboard/admin-dashboard-view";

afterEach(cleanup);

const STATS = {
  activeMembers: 1,
  openLoans: 1,
  openInvites: 1,
  gamesInStock: 1,
  unregisteredGames: 1,
  openChecks: 1,
  activeEvents: 1,
};

// #440: Stat-Tiles für offene Anträge — je nur sichtbar mit der passenden
// Berechtigung (null = Kachel entfällt, nicht nur "0" anzeigen).
describe("AdminDashboardView — Stat-Tiles für offene Anträge (#440)", () => {
  it("shows all three tiles when every permission is present", () => {
    render(
      <AdminDashboardView
        stats={STATS}
        openRequestCounts={{
          ibanChanges: 2,
          stammdatenChanges: 3,
          unconfirmedHoldings: 4,
        }}
        blobStorageUsage={null}
        neonStorageUsage={null}
        rateLimitAlerts={[]}
        recentAdminLogins={null}
      />,
    );

    expect(screen.getByText("Offene IBAN-Änderungen")).toBeInTheDocument();
    expect(
      screen.getByText("Offene Stammdaten-Änderungen"),
    ).toBeInTheDocument();
    expect(screen.getByText("Offene Spiele-Übergaben")).toBeInTheDocument();
  });

  it("omits a tile entirely when its count is null (no permission)", () => {
    render(
      <AdminDashboardView
        stats={STATS}
        openRequestCounts={{
          ibanChanges: null,
          stammdatenChanges: 3,
          unconfirmedHoldings: null,
        }}
        blobStorageUsage={null}
        neonStorageUsage={null}
        rateLimitAlerts={[]}
        recentAdminLogins={null}
      />,
    );

    expect(
      screen.queryByText("Offene IBAN-Änderungen"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Offene Stammdaten-Änderungen"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Offene Spiele-Übergaben"),
    ).not.toBeInTheDocument();
  });

  it("still shows a tile with a count of zero, distinct from no permission", () => {
    render(
      <AdminDashboardView
        stats={STATS}
        openRequestCounts={{
          ibanChanges: 0,
          stammdatenChanges: null,
          unconfirmedHoldings: null,
        }}
        blobStorageUsage={null}
        neonStorageUsage={null}
        rateLimitAlerts={[]}
        recentAdminLogins={null}
      />,
    );

    expect(screen.getByText("Offene IBAN-Änderungen")).toBeInTheDocument();
  });
});
