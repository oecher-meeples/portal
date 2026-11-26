import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HelperGuideDownloads } from "./helper-guide-downloads";

afterEach(cleanup);

describe("HelperGuideDownloads", () => {
  it("renders nothing without any guide", () => {
    const { container } = render(<HelperGuideDownloads guides={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders one clearly labelled link per guide, opening in a new tab", () => {
    render(
      <HelperGuideDownloads
        guides={[
          { roleId: "r1", roleName: "Kasse", url: "https://x/kasse.pdf" },
          { roleId: "r2", roleName: "Küche", url: "https://x/kueche.pdf" },
        ]}
      />,
    );

    const link = screen.getByRole("button", {
      name: "Anleitung Kasse herunterladen",
    });
    expect(link).toHaveAttribute("href", "https://x/kasse.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("button", { name: "Anleitung Küche herunterladen" }),
    ).toBeInTheDocument();
  });
});
