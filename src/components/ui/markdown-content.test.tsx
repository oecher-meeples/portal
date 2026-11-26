import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MarkdownContent } from "./markdown-content";

afterEach(cleanup);

describe("MarkdownContent", () => {
  it("renders embedded images lazily with their alt text (#671)", () => {
    render(<MarkdownContent body="![Sommerfest](/api/blog-images/abc)" />);

    const image = screen.getByRole("img", { name: "Sommerfest" });
    expect(image).toHaveAttribute("src", "/api/blog-images/abc");
    expect(image).toHaveAttribute("loading", "lazy");
  });
});
