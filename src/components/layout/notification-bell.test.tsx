import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "./notification-bell";
import type { ActiveNotification } from "@/lib/notifications/types";

afterEach(cleanup);

const INFO: ActiveNotification = {
  id: "manual:1",
  type: "info",
  closeable: "yes",
  message: "Geplante Wartung am Wochenende.",
};
const DANGER: ActiveNotification = {
  id: "manual:2",
  type: "danger",
  closeable: "no",
  message: "DB-Füllstand kritisch.",
};

describe("NotificationBell (#339)", () => {
  it("is labelled as having no active hints when the list is empty", () => {
    render(<NotificationBell notifications={[]} />);

    expect(
      screen.getByRole("button", { name: "Keine aktiven Hinweise" }),
    ).toBeInTheDocument();
  });

  it("is labelled with the count of active hints", () => {
    render(<NotificationBell notifications={[INFO, DANGER]} />);

    expect(
      screen.getByRole("button", { name: "2 aktive Hinweise" }),
    ).toBeInTheDocument();
  });

  it("lists every active notification, including ones already closed in the banner", async () => {
    const user = userEvent.setup();
    render(<NotificationBell notifications={[INFO, DANGER]} />);

    await user.click(screen.getByRole("button", { name: "2 aktive Hinweise" }));

    expect(
      await screen.findByText("Geplante Wartung am Wochenende."),
    ).toBeInTheDocument();
    expect(screen.getByText("DB-Füllstand kritisch.")).toBeInTheDocument();
  });

  it("shows an empty-state message when opened with no active notifications", async () => {
    const user = userEvent.setup();
    render(<NotificationBell notifications={[]} />);

    await user.click(
      screen.getByRole("button", { name: "Keine aktiven Hinweise" }),
    );

    expect(
      await screen.findByText("Keine aktiven Hinweise."),
    ).toBeInTheDocument();
  });
});
