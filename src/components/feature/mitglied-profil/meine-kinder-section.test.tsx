import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MeineKinderSection } from "@/components/feature/mitglied-profil/meine-kinder-section";

const fetchContactDialogMeepleMock = vi.fn();
vi.mock("@/lib/members/contact-dialog", () => ({
  fetchContactDialogMeeple: (...args: unknown[]) =>
    fetchContactDialogMeepleMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MeineKinderSection (#376)", () => {
  it("renders nothing without linked children", () => {
    const { container } = render(<MeineKinderSection guardianChildren={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("lists every linked child, including siblings, with a profile link in the ContactDialog", async () => {
    fetchContactDialogMeepleMock.mockImplementation((meepleId: string) =>
      Promise.resolve({
        profilePictureUrl: null,
        contact: {
          mailHref: null,
          telegramHref: null,
          signalHref: null,
          discordHandle: null,
          address: null,
        },
        profileHref: `/profil/${meepleId === "meeple-1" ? "mitglied-1" : "mitglied-2"}`,
      }),
    );

    render(
      <MeineKinderSection
        guardianChildren={[
          {
            id: "child-1",
            slug: "mitglied-1",
            meepleId: "meeple-1",
            displayName: "Anna Muster",
            profilePictureUrl: null,
            profilePictureVisibility: "INTERN",
          },
          {
            id: "child-2",
            slug: "mitglied-2",
            meepleId: "meeple-2",
            displayName: "Ben Muster",
            profilePictureUrl: null,
            profilePictureVisibility: "INTERN",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Anna Muster" }));
    expect(
      await screen.findByRole("button", { name: /Profil ansehen/ }),
    ).toHaveAttribute("href", "/profil/mitglied-1");
  });

  it("links straight to the profile when the child has no linked Meeple (MiniMeeple, #373)", () => {
    render(
      <MeineKinderSection
        guardianChildren={[
          {
            id: "child-1",
            slug: "mitglied-1",
            meepleId: null,
            displayName: "Anna Muster",
            profilePictureUrl: null,
            profilePictureVisibility: "INTERN",
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Anna Muster" })).toHaveAttribute(
      "href",
      "/profil/mitglied-1",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
