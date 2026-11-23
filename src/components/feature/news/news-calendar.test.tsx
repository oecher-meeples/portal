import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ContentItem } from "@/lib/content/content-types";

const subscribeMock = vi.fn();
vi.mock("@/components/feature/news/actions", () => ({
  subscribeOwnInternalCalendar: () => subscribeMock(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const { NewsCalendar } =
  await import("@/components/feature/news/news-calendar");

afterEach(cleanup);

const TODAY = new Date();
const DAY_WITH_PUBLIC_EVENT = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}-05`;
const DAY_WITH_INTERNAL_EVENT = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}-12`;

function makeItem(overrides: Partial<ContentItem>): Omit<ContentItem, "body"> {
  return {
    slug: "termin",
    type: "termin",
    title: "Termin",
    excerpt: "",
    date: DAY_WITH_PUBLIC_EVENT,
    ...overrides,
  };
}

describe("NewsCalendar — Farbunterscheidung intern/extern (#10)", () => {
  it("shows a legend explaining the two colours", () => {
    render(
      <NewsCalendar items={[]} selectedDate={null} onSelectDate={vi.fn()} />,
    );

    expect(screen.getByText("Öffentlich")).toBeInTheDocument();
    expect(screen.getByText("Intern")).toBeInTheDocument();
  });

  it("marks a day with only a public event using the public dot, no internal dot", () => {
    render(
      <NewsCalendar
        items={[makeItem({ date: DAY_WITH_PUBLIC_EVENT, internal: false })]}
        selectedDate={null}
        onSelectDate={vi.fn()}
      />,
    );

    const day = screen.getByRole("button", { name: "5" });
    expect(day.querySelector(".bg-event-public")).toBeInTheDocument();
    expect(day.querySelector(".bg-event-internal")).not.toBeInTheDocument();
  });

  it("marks a day with an internal event using the internal dot, no public dot", () => {
    render(
      <NewsCalendar
        items={[
          makeItem({
            slug: "intern",
            date: DAY_WITH_INTERNAL_EVENT,
            internal: true,
          }),
        ]}
        selectedDate={null}
        onSelectDate={vi.fn()}
      />,
    );

    const day = screen.getByRole("button", { name: "12" });
    expect(day.querySelector(".bg-event-internal")).toBeInTheDocument();
    expect(day.querySelector(".bg-event-public")).not.toBeInTheDocument();
  });

  // #10 (Folgefehler beim Live-Test): keine Zellfarbe mehr, die auf sich
  // selbst unlesbar würde (Weiß-auf-Weiß im Dark Mode) — zwei Punkte statt
  // einer "Vorrang"-Regel zeigen gemischte Tage jetzt vollständig an.
  it("shows both dots on a day with a public and an internal event", () => {
    render(
      <NewsCalendar
        items={[
          makeItem({
            slug: "public",
            date: DAY_WITH_PUBLIC_EVENT,
            internal: false,
          }),
          makeItem({
            slug: "internal",
            date: DAY_WITH_PUBLIC_EVENT,
            internal: true,
          }),
        ]}
        selectedDate={null}
        onSelectDate={vi.fn()}
      />,
    );

    const day = screen.getByRole("button", { name: "5" });
    expect(day.querySelector(".bg-event-public")).toBeInTheDocument();
    expect(day.querySelector(".bg-event-internal")).toBeInTheDocument();
  });

  it("dims other event days while one is selected, keeping the selected day at full opacity", () => {
    render(
      <NewsCalendar
        items={[
          makeItem({ slug: "a", date: DAY_WITH_PUBLIC_EVENT }),
          makeItem({
            slug: "b",
            date: DAY_WITH_INTERNAL_EVENT,
            internal: true,
          }),
        ]}
        selectedDate={DAY_WITH_PUBLIC_EVENT}
        onSelectDate={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "5" })).not.toHaveClass(
      "opacity-35",
    );
    expect(screen.getByRole("button", { name: "12" })).toHaveClass(
      "opacity-35",
    );
  });
});

describe("NewsCalendar — Abo-Buttons öffentlich/intern (#439)", () => {
  const ICS_URL = "https://calendar.example.org/public.ics";

  it("shows only the public subscribe button for guests", () => {
    render(
      <NewsCalendar
        items={[]}
        selectedDate={null}
        onSelectDate={vi.fn()}
        icsUrl={ICS_URL}
      />,
    );

    expect(
      screen.getByText("Kalender abonnieren (iCal)").closest("a"),
    ).toHaveAttribute("href", "webcal://calendar.example.org/public.ics");
    expect(
      screen.queryByText("Kalender abonnieren (intern)"),
    ).not.toBeInTheDocument();
  });

  it("shows public and internal subscribe buttons for Meeple with internal access", () => {
    render(
      <NewsCalendar
        items={[]}
        selectedDate={null}
        onSelectDate={vi.fn()}
        icsUrl={ICS_URL}
        internalSubscription={{ hasToken: false }}
      />,
    );

    expect(
      screen.getByText("Kalender abonnieren (öffentlich)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Kalender abonnieren (intern)"),
    ).toBeInTheDocument();
  });
});
