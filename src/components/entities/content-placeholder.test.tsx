import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ContentListRow } from "./content-list-row";
import { ContentTimelineEntry } from "./content-timeline-entry";

afterEach(cleanup);

const BASE = {
  slug: "event-spieletag",
  type: "termin" as const,
  title: "Spieletag",
  excerpt: "10.10.2026 · Vereinsheim",
  date: "2026-10-10",
};

describe("Event-Termine als Platzhalter (#678)", () => {
  it("ContentListRow renders no link for a placeholder", () => {
    render(<ContentListRow item={{ ...BASE, placeholder: true }} />);

    expect(screen.getByText("Spieletag")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("ContentListRow still links regular items and ICS appointments", () => {
    render(<ContentListRow item={{ ...BASE, slug: "kalender-abc" }} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/news/kalender-abc",
    );
  });

  it("ContentTimelineEntry renders the title without link for a placeholder", () => {
    render(
      <ContentTimelineEntry
        item={{ ...BASE, body: "Vereinsheim", placeholder: true }}
      />,
    );

    expect(screen.getByText("Spieletag")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Spieletag" })).toBeNull();
  });

  it("ContentTimelineEntry still links regular items", () => {
    render(<ContentTimelineEntry item={{ ...BASE, body: "x" }} />);

    expect(screen.getByRole("link", { name: "Spieletag" })).toHaveAttribute(
      "href",
      "/news/event-spieletag",
    );
  });
});
