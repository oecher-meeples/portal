import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ErziehungsberechtigteSection } from "@/components/feature/mitglied-profil/erziehungsberechtigte-section";

const fetchContactDialogMeepleMock = vi.fn();
vi.mock("@/lib/members/contact-dialog", () => ({
  fetchContactDialogMeeple: (...args: unknown[]) =>
    fetchContactDialogMeepleMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ErziehungsberechtigteSection (#385)", () => {
  it("renders nothing without linked guardians", () => {
    const { container } = render(
      <ErziehungsberechtigteSection guardians={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("lists every linked guardian, with a profile link in the ContactDialog", async () => {
    fetchContactDialogMeepleMock.mockResolvedValue({
      profilePictureUrl: null,
      contact: {
        mailHref: null,
        telegramHref: null,
        signalHref: null,
        discordHandle: null,
        address: null,
      },
      profileHref: "/profil/erika-muster",
    });

    render(
      <ErziehungsberechtigteSection
        guardians={[
          {
            id: "guardian-1",
            slug: "erika-muster",
            meepleId: "meeple-1",
            displayName: "Erika Muster",
            profilePictureUrl: null,
            profilePictureVisibility: "INTERN",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Erika Muster" }));
    expect(
      await screen.findByRole("button", { name: /Profil ansehen/ }),
    ).toHaveAttribute("href", "/profil/erika-muster");
  });

  it("links straight to the profile when the guardian has no linked Meeple", () => {
    render(
      <ErziehungsberechtigteSection
        guardians={[
          {
            id: "guardian-1",
            slug: "erika-muster",
            meepleId: null,
            displayName: "Erika Muster",
            profilePictureUrl: null,
            profilePictureVisibility: "INTERN",
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Erika Muster" })).toHaveAttribute(
      "href",
      "/profil/erika-muster",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
