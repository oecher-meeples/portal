import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CoverMedia } from "@/components/ui/cover-media";

afterEach(cleanup);

describe("CoverMedia — kein Platzhalter für sizing='natural' ohne Bild (#447)", () => {
  it("renders nothing when sizing is 'natural' and no imageUrl is set", () => {
    const { container } = render(
      <CoverMedia imageUrl={null} alt="Titelbild" sizing="natural" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("still shows the placeholder for the default 'aspect' sizing without an image", () => {
    render(
      <CoverMedia
        imageUrl={null}
        alt="Titelbild"
        label="TITELBILD"
        sizing="aspect"
      />,
    );

    expect(screen.getByText("TITELBILD")).toBeInTheDocument();
  });

  it("renders the image with sizing='natural' when imageUrl is set", () => {
    render(
      <CoverMedia
        imageUrl="https://example.com/cover.jpg"
        alt="Titelbild"
        sizing="natural"
      />,
    );

    expect(screen.getByAltText("Titelbild")).toHaveAttribute(
      "src",
      "https://example.com/cover.jpg",
    );
  });
});
