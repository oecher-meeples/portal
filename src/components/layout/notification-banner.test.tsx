import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { NotificationBanner } from "./notification-banner";
import type { ActiveNotification } from "@/lib/notifications/types";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const INFO: ActiveNotification = {
  id: "manual:1",
  type: "info",
  closeable: "yes",
  message: "Geplante Wartung am Wochenende.",
};
const DANGER: ActiveNotification = {
  id: "manual:2",
  type: "danger",
  closeable: "temporary",
  message: "DB-Füllstand kritisch.",
};
const UNCLOSEABLE: ActiveNotification = {
  id: "manual:3",
  type: "warning",
  closeable: "no",
  message: "Dauerhafter Hinweis.",
};

describe("NotificationBanner (#339)", () => {
  it("renders nothing when there are no active notifications", () => {
    const { container } = render(<NotificationBanner notifications={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the most urgent notification", async () => {
    render(<NotificationBanner notifications={[INFO, DANGER]} />);

    await waitFor(() => {
      expect(screen.getByText("DB-Füllstand kritisch.")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Geplante Wartung am Wochenende."),
    ).not.toBeInTheDocument();
  });

  it("shows no close button for a 'no'-closeable notification", async () => {
    render(<NotificationBanner notifications={[UNCLOSEABLE]} />);

    await waitFor(() => {
      expect(screen.getByText("Dauerhafter Hinweis.")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Hinweis schließen" }),
    ).not.toBeInTheDocument();
  });

  it("advances to the next-most-urgent notification once the current one is closed", async () => {
    render(<NotificationBanner notifications={[INFO, DANGER]} />);
    await waitFor(() => {
      expect(screen.getByText("DB-Füllstand kritisch.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Hinweis schließen" }));

    expect(
      screen.getByText("Geplante Wartung am Wochenende."),
    ).toBeInTheDocument();
  });

  it("persists the closed state across remounts (localStorage)", async () => {
    const { unmount } = render(<NotificationBanner notifications={[INFO]} />);
    await waitFor(() => {
      expect(
        screen.getByText("Geplante Wartung am Wochenende."),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Hinweis schließen" }));
    unmount();

    const { container } = render(<NotificationBanner notifications={[INFO]} />);
    await waitFor(() => {
      expect(container.textContent).toBe("");
    });
  });
});
