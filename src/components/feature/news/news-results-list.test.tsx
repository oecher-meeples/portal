import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NewsResultsList } from "./news-results-list";
import type { ContentItem } from "@/lib/content/content";

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(cleanup);

const ITEM: ContentItem = {
  slug: "sommerfest",
  type: "blog",
  title: "Sommerfest",
  excerpt: "Danke an alle Helfer:innen!",
  body: "",
  date: "2026-06-15",
};

describe("NewsResultsList (#470)", () => {
  it("shows a skeleton placeholder while the next page is loading", () => {
    render(
      <NewsResultsList
        items={[ITEM]}
        viewMode="vorschau"
        onLoadMore={vi.fn()}
        cursor="cursor-1"
        hasMore={true}
        isLoadingMore={true}
      />,
    );

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("shows an end-of-list hint once no more posts remain", () => {
    render(
      <NewsResultsList
        items={[ITEM]}
        viewMode="vorschau"
        onLoadMore={vi.fn()}
        cursor={null}
        hasMore={false}
        isLoadingMore={false}
      />,
    );

    expect(screen.getByText("Keine weiteren Beiträge.")).toBeInTheDocument();
  });

  it("does not show the end-of-list hint while more posts are available", () => {
    render(
      <NewsResultsList
        items={[ITEM]}
        viewMode="vorschau"
        onLoadMore={vi.fn()}
        cursor="cursor-1"
        hasMore={true}
        isLoadingMore={false}
      />,
    );

    expect(
      screen.queryByText("Keine weiteren Beiträge."),
    ).not.toBeInTheDocument();
  });

  it("shows the empty-category hint instead of the end-of-list hint when there are no items", () => {
    render(
      <NewsResultsList
        items={[]}
        viewMode="vorschau"
        onLoadMore={vi.fn()}
        cursor={null}
        hasMore={false}
        isLoadingMore={false}
      />,
    );

    expect(
      screen.getByText("Keine Beiträge in dieser Kategorie."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Keine weiteren Beiträge."),
    ).not.toBeInTheDocument();
  });
});
