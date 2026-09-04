import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewsBrowser } from "@/components/feature/news/news-browser";
import type { ContentItem } from "@/lib/content/content-types";

// news-browser.tsx importiert die Server Action loadMoreNews (#470), deren
// Modulkette über @/lib/auth/server bis zu @neondatabase/auth/next/server
// reicht — das zieht next/headers, das jsdom nicht kennt (analog #465).
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

// NewsResultsList lädt weitere Einträge per IntersectionObserver
// (use-infinite-scroll.ts) — jsdom kennt die Browser-API nicht.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const ITEMS: ContentItem[] = [];

describe("NewsBrowser — Umfragen-Kategorie (#424)", () => {
  it("hides the 'Umfragen'-filter pill for guests", () => {
    render(<NewsBrowser items={ITEMS} canSeeSurveys={false} />);

    expect(screen.queryByText("Umfragen")).not.toBeInTheDocument();
  });

  it("shows the 'Umfragen'-filter pill for logged-in Meeple", () => {
    render(<NewsBrowser items={ITEMS} canSeeSurveys={true} />);

    expect(screen.getByText("Umfragen")).toBeInTheDocument();
  });
});
