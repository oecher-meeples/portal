import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminNotificationsView } from "./admin-notifications-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/notifications/actions", () => ({
  createManualNotification: vi.fn(),
  setManualNotificationActive: vi.fn(),
  deleteManualNotification: vi.fn(),
  setAutomatedNotificationDisabled: vi.fn(),
}));

afterEach(cleanup);

describe("AdminNotificationsView (#339)", () => {
  it("shows an empty-state hint when no manual notifications exist", () => {
    render(
      <AdminNotificationsView manual={[]} automated={[]} permissions={[]} />,
    );

    expect(
      screen.getByText("Noch keine manuellen Notifications angelegt."),
    ).toBeInTheDocument();
  });

  it("lists a manual notification with its name, type and status", () => {
    render(
      <AdminNotificationsView
        manual={[
          {
            id: "notif-1",
            name: "Wartung",
            type: "warning",
            audiencePermissionKey: null,
            closeable: "yes",
            message: "Geplante Wartung.",
            isActive: true,
          },
        ]}
        automated={[]}
        permissions={[]}
      />,
    );

    expect(screen.getByText("Wartung")).toBeInTheDocument();
    expect(screen.getByText("Warnung")).toBeInTheDocument();
    expect(screen.getByText("aktiv")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Deaktivieren" }),
    ).toBeInTheDocument();
  });

  it("shows a hint instead of a table when no automated notifications are registered", () => {
    render(
      <AdminNotificationsView manual={[]} automated={[]} permissions={[]} />,
    );

    expect(
      screen.getByText(/Aktuell keine automatisierten Notifications/),
    ).toBeInTheDocument();
  });

  it("lists an automated notification with a disable/enable toggle", () => {
    render(
      <AdminNotificationsView
        manual={[]}
        automated={[
          {
            name: "db-fill-level",
            type: "danger",
            audiencePermissionKey: "admin:access",
            closeable: "no",
            isDisabled: false,
          },
        ]}
        permissions={[]}
      />,
    );

    expect(screen.getByText("db-fill-level")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Deaktivieren" }),
    ).toBeInTheDocument();
  });
});
