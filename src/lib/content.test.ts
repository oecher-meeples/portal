import { describe, expect, it } from "vitest";
import {
  getAllContent,
  getContentBySlug,
  getLatestPosts,
  getUpcomingEvents,
} from "@/lib/content";

describe("getAllContent", () => {
  it("loads all markdown posts from content/posts", () => {
    expect(getAllContent()).toHaveLength(7);
  });
});

describe("getContentBySlug", () => {
  it("resolves a post by its slug", () => {
    const item = getContentBySlug("sommerfest-der-meeples");
    expect(item?.title).toBe("Sommerfest der Meeples");
    expect(item?.author).toBe("Jan Herwig");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getContentBySlug("does-not-exist")).toBeUndefined();
  });
});

describe("getUpcomingEvents", () => {
  it("excludes blog posts and sorts ascending by date", () => {
    const events = getUpcomingEvents(10);
    expect(events.every((item) => item.type !== "blog")).toBe(true);
    const dates = events.map((item) => item.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("respects the limit parameter", () => {
    expect(getUpcomingEvents(2)).toHaveLength(2);
  });
});

describe("getLatestPosts", () => {
  it("sorts all content descending by date", () => {
    const posts = getLatestPosts(10);
    const dates = posts.map((item) => item.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("respects the limit parameter", () => {
    expect(getLatestPosts(3)).toHaveLength(3);
  });
});
