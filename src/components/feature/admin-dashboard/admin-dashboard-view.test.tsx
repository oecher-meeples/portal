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
        eventPlanning={null}
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
        eventPlanning={null}
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
        eventPlanning={null}
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

describe("AdminDashboardView — Event-Planungs-Cards (#681)", () => {
  const BASE = {
    stats: STATS,
    openRequestCounts: {
      ibanChanges: null,
      stammdatenChanges: null,
      unconfirmedHoldings: null,
    },
    blobStorageUsage: null,
    neonStorageUsage: null,
    rateLimitAlerts: [],
    recentAdminLogins: null,
  };
  const EVENT = {
    id: "e1",
    title: "Spieletag",
    visibility: "DRAFT" as const,
    helperPhase: "PLANNING" as const,
    shiftCount: 5,
    coveragePercent: 60,
    bookingCount: 12,
    confirmedCount: 9,
  };

  it("renders no section without events:manage (null)", () => {
    render(<AdminDashboardView {...BASE} eventPlanning={null} />);

    expect(screen.queryByText("Events in Planung")).not.toBeInTheDocument();
  });

  it("shows title link, visibility pill and coverage in the planning phase", () => {
    render(<AdminDashboardView {...BASE} eventPlanning={[EVENT]} />);

    expect(screen.getByRole("link", { name: "Spieletag" })).toHaveAttribute(
      "href",
      "/admin/events/e1",
    );
    expect(screen.getByText("Event-Entwurf")).toBeInTheDocument();
    expect(screen.getByText("Planungsphase: 60 % von 5")).toBeInTheDocument();
  });

  it("shows confirmations a/b once confirmation is requested", () => {
    render(
      <AdminDashboardView
        {...BASE}
        eventPlanning={[{ ...EVENT, helperPhase: "CONFIRMATION_REQUESTED" }]}
      />,
    );

    expect(screen.getByText("Bestätigungen: 9/12")).toBeInTheDocument();
    expect(screen.queryByText(/Planungsphase:/)).not.toBeInTheDocument();
  });

  it("shows only title and pill for an event without shifts", () => {
    render(
      <AdminDashboardView
        {...BASE}
        eventPlanning={[
          { ...EVENT, shiftCount: 0, coveragePercent: null, bookingCount: 0 },
        ]}
      />,
    );

    expect(screen.getByText("Event-Entwurf")).toBeInTheDocument();
    expect(screen.queryByText(/Planungsphase:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bestätigungen:/)).not.toBeInTheDocument();
  });
});
