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

// #320: News/Blog-Übersichten (content-card.tsx/content-list-row.tsx) zeigen
// statt der generischen Platzhalter-Box das Vereinslogo.
describe("CoverMedia — placeholderVariant='logo' (#320)", () => {
  it("shows the club logo instead of the generic placeholder box", () => {
    const { container } = render(
      <CoverMedia
        imageUrl={null}
        alt="Titelbild"
        label="BILD"
        placeholderVariant="logo"
      />,
    );

    expect(screen.queryByText("BILD")).not.toBeInTheDocument();
    // Deko-Bilder mit leerem alt (Logo, theme-abhängig) — kein "img"-Role.
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  it("still shows the generic placeholder by default", () => {
    render(<CoverMedia imageUrl={null} alt="Titelbild" label="BILD" />);

    expect(screen.getByText("BILD")).toBeInTheDocument();
  });
});
