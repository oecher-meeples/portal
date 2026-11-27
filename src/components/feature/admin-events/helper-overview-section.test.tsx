import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HelperOverviewSection } from "./helper-overview-section";

afterEach(cleanup);

const row = (day: string) => ({
  dayDate: `2026-10-${day}T00:00:00.000Z`,
  startsAt: `2026-10-${day}T08:00:00.000Z`,
  endsAt: `2026-10-${day}T16:00:00.000Z`,
  roleNames: ["Theke", "Aufbau"],
  utilizationPercent: 50,
  bookedMinutes: 120,
  offeredMinutes: 240,
});

describe("HelperOverviewSection", () => {
  it("shows the average booked hours above the table", () => {
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

    expect(screen.getByText("4h")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
  });

  it("filters by role and paginates without splitting persons", () => {
    const person = (id: string, name: string, days: string[]) => ({
      helperId: id,
      isGuest: false,
      displayName: name,
      profilePictureUrl: null,
      profilePictureVisibility: "INTERN" as const,
      rows: days.map((d) => row(d)),
    });
    const many = Array.from({ length: 12 }, (_, i) => String(10 + i));
    render(
      <HelperOverviewSection
        groups={[
          person("m1", "Anna", many),
          person("m2", "Ben", many),
          person("m3", "Cleo", ["10"]),
        ]}
      />,
    );

    // 12 + 12 > 20 → Anna auf Seite 1, Ben + Cleo auf Seite 2
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.queryByText("Ben")).toBeNull();
    expect(screen.getByText("Seite 1 von 2")).toBeInTheDocument();

    expect(screen.getByText("3 Helfer · 25 Helfertage")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Suche"), {
      target: { value: "cle" },
    });
    expect(screen.getByText("1 Helfer · 1 Helfertage")).toBeInTheDocument();
    expect(screen.getByText("Cleo")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Suche"), {
      target: { value: "" },
    });

    fireEvent.change(screen.getByLabelText("Rolle"), {
      target: { value: "Aufbau" },
    });
    expect(screen.getByText("Anna")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tag"), {
      target: { value: "2026-10-10T00:00:00.000Z" },
    });
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Ben")).toBeInTheDocument();
    expect(screen.getByText("Cleo")).toBeInTheDocument();
    expect(screen.queryByText(/Seite 1 von/)).toBeNull();
  });

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
    expect(screen.getAllByText("2/4h (50%)")).toHaveLength(2);
    expect(screen.getAllByText("Theke, Aufbau")).toHaveLength(2);
  });

  it("shows an empty hint without availabilities", () => {
    render(<HelperOverviewSection groups={[]} />);
    expect(screen.getByText(/Noch keine Verfügbarkeit/)).toBeInTheDocument();
  });
});
