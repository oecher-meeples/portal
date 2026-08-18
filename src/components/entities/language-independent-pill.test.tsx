import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageDependence } from "@prisma/client";
import { LanguageIndependentPill } from "@/components/entities/language-independent-pill";

afterEach(() => {
  cleanup();
});

describe("LanguageIndependentPill (#188)", () => {
  it("shows 'Sprachneutral' for level 1 (no necessary text)", () => {
    render(
      <LanguageIndependentPill
        languageDependence={LanguageDependence.NO_NECESSARY_TEXT}
      />,
    );

    expect(screen.getByText("Sprachneutral")).toBeInTheDocument();
  });

  it("renders nothing for a higher, more text-dependent level", () => {
    const { container } = render(
      <LanguageIndependentPill
        languageDependence={LanguageDependence.SOME_NECESSARY_TEXT}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when not yet erfasst", () => {
    const { container } = render(
      <LanguageIndependentPill languageDependence={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
