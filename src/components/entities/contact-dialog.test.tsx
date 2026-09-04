import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ContactDialog } from "@/components/entities/contact-dialog";
import type { ContactDialogMeeple } from "@/lib/members/contact";

const fetchContactDialogMeepleMock = vi.fn();
vi.mock("@/lib/members/contact-dialog", () => ({
  fetchContactDialogMeeple: (...args: unknown[]) =>
    fetchContactDialogMeepleMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const NO_CONTACT = {
  mailHref: null,
  telegramHref: null,
  signalHref: null,
  discordHandle: null,
  address: null,
};

function meeple(
  overrides: Partial<ContactDialogMeeple> = {},
): ContactDialogMeeple {
  return {
    profilePictureUrl: null,
    contact: NO_CONTACT,
    profileHref: null,
    ...overrides,
  };
}

describe("ContactDialog — meeple-Prop (Daten bereits geladen)", () => {
  it("renders the name as plain text when there is no contact option", () => {
    render(<ContactDialog name="Lea Demo" meeple={meeple()} />);

    expect(screen.getByText("Lea Demo").tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens a dialog with every contact option, without an initials fallback for a missing picture", () => {
    render(
      <ContactDialog
        name="Lea Demo"
        meeple={meeple({
          contact: {
            mailHref: "mailto:lea@example.com",
            telegramHref: "https://t.me/leademo",
            signalHref: "https://signal.me/#eu/leademo",
            discordHandle: "leademo",
            address: "Musterstr. 1, 52062 Aachen",
          },
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lea Demo" }));

    expect(
      screen.getByRole("heading", { name: "Lea Demo kontaktieren" }),
    ).toBeInTheDocument();
    // Ohne Bild: kein Initialen-Kreis im Dialog-Kopf (hideWithoutPicture).
    expect(screen.queryByText("L")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /E-Mail/ })).toHaveAttribute(
      "href",
      "mailto:lea@example.com",
    );
    expect(screen.getByRole("button", { name: "Telegram" })).toHaveAttribute(
      "href",
      "https://t.me/leademo",
    );
    expect(screen.getByRole("button", { name: "Signal" })).toHaveAttribute(
      "href",
      "https://signal.me/#eu/leademo",
    );
    expect(
      screen.getByRole("button", { name: "Discord: leademo" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Musterstr. 1, 52062 Aachen")).toBeInTheDocument();
  });

  it("opens a dialog for the profile link alone, even without any contact channel", () => {
    render(
      <ContactDialog
        name="Lea Demo"
        meeple={meeple({ profileHref: "/profil/lea-demo" })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lea Demo" }));

    expect(
      screen.getByRole("button", { name: /Profil ansehen/ }),
    ).toHaveAttribute("href", "/profil/lea-demo");
  });

  it("shows only the mail option when nothing else is set", () => {
    render(
      <ContactDialog
        name="Lea Demo"
        meeple={meeple({
          contact: { ...NO_CONTACT, mailHref: "mailto:lea@example.com" },
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lea Demo" }));

    expect(screen.getByRole("button", { name: /E-Mail/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Telegram" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Signal" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Discord/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Kopieren" }),
    ).not.toBeInTheDocument();
  });
});

describe("ContactDialog — meepleId-Prop (Selbstlade-Pfad)", () => {
  it("stays a clickable trigger without knowing upfront whether contact options exist", () => {
    render(<ContactDialog name="Lea Demo" meepleId="meeple-1" />);

    expect(
      screen.getByRole("button", { name: "Lea Demo" }),
    ).toBeInTheDocument();
    expect(fetchContactDialogMeepleMock).not.toHaveBeenCalled();
  });

  it("fetches only on open, not eagerly on render", async () => {
    fetchContactDialogMeepleMock.mockResolvedValue(
      meeple({
        contact: { ...NO_CONTACT, mailHref: "mailto:lea@example.com" },
      }),
    );
    render(<ContactDialog name="Lea Demo" meepleId="meeple-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Lea Demo" }));

    expect(
      await screen.findByRole("button", { name: /E-Mail/ }),
    ).toHaveAttribute("href", "mailto:lea@example.com");
    expect(fetchContactDialogMeepleMock).toHaveBeenCalledWith("meeple-1");
  });

  it("shows a fallback message once loaded without any contact option", async () => {
    fetchContactDialogMeepleMock.mockResolvedValue(meeple());
    render(<ContactDialog name="Lea Demo" meepleId="meeple-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Lea Demo" }));

    expect(
      await screen.findByText("Keine Kontaktmöglichkeiten hinterlegt."),
    ).toBeInTheDocument();
  });

  it("shows an error message when the meeple could not be loaded", async () => {
    fetchContactDialogMeepleMock.mockResolvedValue(null);
    render(<ContactDialog name="Lea Demo" meepleId="meeple-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Lea Demo" }));

    expect(
      await screen.findByText("Kontaktdaten konnten nicht geladen werden."),
    ).toBeInTheDocument();
  });
});
