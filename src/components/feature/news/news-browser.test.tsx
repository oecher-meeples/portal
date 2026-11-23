import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NewsBrowser } from "@/components/feature/news/news-browser";
import type { ContentItem } from "@/lib/content/content-types";
import { stubIntersectionObserver } from "@/lib/__mocks__/intersection-observer";

// news-browser.tsx importiert die Server Action loadMoreNews (#470), deren
// Modulkette über @/lib/auth/server bis zu @neondatabase/auth/next/server
// reicht — das zieht next/headers, das jsdom nicht kennt (analog #465).
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

// NewsResultsList lädt weitere Einträge per IntersectionObserver
// (use-infinite-scroll.ts) — jsdom kennt die Browser-API nicht.
stubIntersectionObserver();

const ITEMS: ContentItem[] = [];

afterEach(cleanup);

describe("NewsBrowser — Typ-Filter nach vorhandenen Einträgen (#576)", () => {
  it("shows only pills for types with entries, plus 'Alle'", () => {
    render(<NewsBrowser items={ITEMS} availableTypes={["blog", "termin"]} />);

    expect(screen.getByText("Alle")).toBeInTheDocument();
    expect(screen.getByText("Termine")).toBeInTheDocument();
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.queryByText("Turniere")).not.toBeInTheDocument();
    expect(screen.queryByText("Umfragen")).not.toBeInTheDocument();
  });

  it("shows the 'Umfragen'-pill when surveys are visible (#424)", () => {
    render(<NewsBrowser items={ITEMS} availableTypes={["umfrage"]} />);

    expect(screen.getByText("Umfragen")).toBeInTheDocument();
  });

  it("hides the whole type bar when only 'Alle' would remain", () => {
    render(<NewsBrowser items={ITEMS} availableTypes={[]} />);

    expect(screen.queryByText("Alle")).not.toBeInTheDocument();
  });
});
