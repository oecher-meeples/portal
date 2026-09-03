import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErziehungsberechtigteSection } from "@/components/feature/mitglied-profil/erziehungsberechtigte-section";

describe("ErziehungsberechtigteSection (#385)", () => {
  it("renders nothing without linked guardians", () => {
    const { container } = render(
      <ErziehungsberechtigteSection guardians={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("lists every linked guardian, with a link to their profile", () => {
    render(
      <ErziehungsberechtigteSection
        guardians={[
          {
            id: "guardian-1",
            slug: "erika-muster",
            displayName: "Erika Muster",
            profilePictureUrl: null,
            profilePictureVisibility: "INTERN",
          },
          {
            id: "guardian-2",
            slug: "max-muster",
            displayName: "Max Muster",
            profilePictureUrl: null,
            profilePictureVisibility: "INTERN",
          },
        ]}
      />,
    );

    const erikaLink = screen.getByRole("link", { name: "Erika Muster" });
    expect(erikaLink).toHaveAttribute("href", "/profil/erika-muster");
    const maxLink = screen.getByRole("link", { name: "Max Muster" });
    expect(maxLink).toHaveAttribute("href", "/profil/max-muster");
  });
});
