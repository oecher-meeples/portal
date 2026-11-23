import { describe, expect, it } from "vitest";
import { stripMarkdown } from "./strip-markdown";

describe("stripMarkdown (#448)", () => {
  it("strips headings", () => {
    expect(stripMarkdown("# Titel")).toBe("Titel");
    expect(stripMarkdown("## Untertitel")).toBe("Untertitel");
  });

  it("strips bold (** and __)", () => {
    expect(stripMarkdown("Ein **kurzer** Text")).toBe("Ein kurzer Text");
    expect(stripMarkdown("Ein __kurzer__ Text")).toBe("Ein kurzer Text");
  });

  it("strips italic (* and _)", () => {
    expect(stripMarkdown("Ein *kurzer* Text")).toBe("Ein kurzer Text");
    expect(stripMarkdown("Ein _kurzer_ Text")).toBe("Ein kurzer Text");
  });

  it("strips strikethrough", () => {
    expect(stripMarkdown("Ein ~~kurzer~~ Text")).toBe("Ein kurzer Text");
  });

  it("strips inline code", () => {
    expect(stripMarkdown("Ein `code` Snippet")).toBe("Ein code Snippet");
  });

  it("strips links, keeping the link text", () => {
    expect(stripMarkdown("Siehe [hier](https://example.com)")).toBe(
      "Siehe hier",
    );
  });

  it("strips a realistic mix of markdown in one string", () => {
    const input =
      "# Lorem Ipsum Demo\nEin **kurzer** Überblick über _Markdown_-Funktionen mit ~~durchgestrichenem~~ Text und `inline code`.\n## Zitate";

    expect(stripMarkdown(input)).toBe(
      "Lorem Ipsum Demo\nEin kurzer Überblick über Markdown-Funktionen mit durchgestrichenem Text und inline code.\nZitate",
    );
  });

  it("leaves plain text without markdown unchanged", () => {
    expect(stripMarkdown("Ganz normaler Text ohne Markdown.")).toBe(
      "Ganz normaler Text ohne Markdown.",
    );
  });
});
