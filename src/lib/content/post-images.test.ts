import { describe, expect, it } from "vitest";
import {
  altTextFromFilename,
  postImageMarkdown,
  canViewPostImage,
  extractPostImageIds,
  findRemovedImageIds,
  postImageUrl,
} from "./post-images";

describe("postImageUrl", () => {
  it("builds the permanent route url", () => {
    expect(postImageUrl("abc")).toBe("/api/blog-images/abc");
  });
});

describe("extractPostImageIds", () => {
  it("finds ids in body order, deduplicated", () => {
    const body =
      "![a](/api/blog-images/one) text ![b](/api/blog-images/two)\n![c](/api/blog-images/one)";
    expect(extractPostImageIds(body)).toEqual(["one", "two"]);
  });

  it("ignores plain links, foreign images and empty alt text handling", () => {
    const body =
      "[x](/api/blog-images/one) ![y](https://example.com/a.png) ![](/api/blog-images/two)";
    expect(extractPostImageIds(body)).toEqual(["two"]);
  });

  it("returns an empty list without images", () => {
    expect(extractPostImageIds("nur Text")).toEqual([]);
  });
});

describe("findRemovedImageIds", () => {
  it("returns linked ids no longer in the body", () => {
    expect(
      findRemovedImageIds(["a", "b"], "![x](/api/blog-images/a)"),
    ).toEqual(["b"]);
  });

  it("returns nothing when all are still used", () => {
    expect(findRemovedImageIds(["a"], "![x](/api/blog-images/a)")).toEqual([]);
  });
});

describe("canViewPostImage", () => {
  const guest = { canSeeInternal: false, isMember: false };
  const member = { canSeeInternal: true, isMember: true };
  const published = { status: "PUBLISHED" as const, internal: null };

  it("lets everyone see images of published public posts", () => {
    expect(
      canViewPostImage({ post: published, visibility: guest, canEdit: false }),
    ).toBe(true);
  });

  it("hides internal posts from guests but not from permitted viewers", () => {
    const internal = { status: "PUBLISHED" as const, internal: true };
    expect(
      canViewPostImage({ post: internal, visibility: guest, canEdit: false }),
    ).toBe(false);
    expect(
      canViewPostImage({ post: internal, visibility: member, canEdit: false }),
    ).toBe(true);
  });

  it("hides drafts and unlinked images from non-editors", () => {
    const draft = { status: "DRAFT" as const, internal: null };
    expect(
      canViewPostImage({ post: draft, visibility: member, canEdit: false }),
    ).toBe(false);
    expect(
      canViewPostImage({ post: null, visibility: member, canEdit: false }),
    ).toBe(false);
  });

  it("lets editors see drafts and unlinked images", () => {
    const draft = { status: "DRAFT" as const, internal: true };
    expect(
      canViewPostImage({ post: draft, visibility: guest, canEdit: true }),
    ).toBe(true);
    expect(
      canViewPostImage({ post: null, visibility: guest, canEdit: true }),
    ).toBe(true);
  });
});

describe("altTextFromFilename / postImageMarkdown", () => {
  it("derives alt text from the file name without extension", () => {
    expect(altTextFromFilename("sommer_fest-2026.webp")).toBe(
      "sommer fest 2026",
    );
  });

  it("builds markdown that extractPostImageIds understands", () => {
    const markdown = postImageMarkdown("Titel [x]", "abc");
    expect(markdown).toBe("![Titel x](/api/blog-images/abc)");
    expect(extractPostImageIds(markdown)).toEqual(["abc"]);
  });
});
