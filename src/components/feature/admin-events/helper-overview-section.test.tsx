import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HelperOverviewSection } from "./helper-overview-section";

afterEach(cleanup);

const row = (day: string) => ({
  dayDate: `2026-10-${day}T00:00:00.000Z`,
  startsAt: `2026-10-${day}T08:00:00.000Z`,
  endsAt: `2026-10-${day}T16:00:00.000Z`,
  roleNames: ["Theke", "Aufbau"],
  utilizationPercent: 50,
});

describe("HelperOverviewSection", () => {
  it("renders the person once across all of their day rows", () => {
    render(
      <HelperOverviewSection
        groups={[
          {
            helperId: "m1",
            isGuest: false,
            displayName: "Anna",
            profilePictureUrl: null,
            profilePictureVisibility: "INTERN",
            rows: [row("10"), row("11")],
          },
        ]}
      />,
    );
    expect(screen.getAllByText("Anna")).toHaveLength(1);
    expect(screen.getByText("Anna").closest("td")).toHaveAttribute(
      "rowspan",
      "2",
    );
    expect(screen.getAllByText("50 %")).toHaveLength(2);
    expect(screen.getAllByText("Theke, Aufbau")).toHaveLength(2);
  });

  it("shows an empty hint without availabilities", () => {
    render(<HelperOverviewSection groups={[]} />);
    expect(screen.getByText(/Noch keine Verfügbarkeit/)).toBeInTheDocument();
  });
});
