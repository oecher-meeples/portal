import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MeineKinderSection } from "@/components/feature/mitglied-profil/meine-kinder-section";

describe("MeineKinderSection (#376)", () => {
  it("renders nothing without linked children", () => {
    const { container } = render(<MeineKinderSection guardianChildren={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("lists every linked child, including siblings, with a link to their profile", () => {
    render(
      <MeineKinderSection
        guardianChildren={[
          { id: "child-1", slug: "mitglied-1", displayName: "Anna Muster" },
          { id: "child-2", slug: "mitglied-2", displayName: "Ben Muster" },
        ]}
      />,
    );

    const annaLink = screen.getByRole("link", { name: "Anna Muster" });
    expect(annaLink).toHaveAttribute("href", "/mitglied/mitglied-1");
    const benLink = screen.getByRole("link", { name: "Ben Muster" });
    expect(benLink).toHaveAttribute("href", "/mitglied/mitglied-2");
  });
});
