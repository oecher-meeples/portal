import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ContactDialog } from "@/components/entities/contact-dialog";

afterEach(() => {
  cleanup();
});

describe("ContactDialog", () => {
  const NO_CONTACT = {
    mailHref: null,
    telegramHref: null,
    signalHref: null,
    discordHandle: null,
    address: null,
  };

  it("renders the name as plain text when there is no contact option", () => {
    render(<ContactDialog name="Lea Demo" contact={NO_CONTACT} />);

    expect(screen.getByText("Lea Demo").tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens a dialog with every contact option on click", () => {
    render(
      <ContactDialog
        name="Lea Demo"
        contact={{
          mailHref: "mailto:lea@example.com",
          telegramHref: "https://t.me/leademo",
          signalHref: "https://signal.me/#eu/leademo",
          discordHandle: "leademo",
          address: "Musterstr. 1, 52062 Aachen",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lea Demo" }));

    expect(
      screen.getByRole("heading", { name: "Lea Demo kontaktieren" }),
    ).toBeInTheDocument();
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

  it("shows only the mail option when nothing else is set", () => {
    render(
      <ContactDialog
        name="Lea Demo"
        contact={{ ...NO_CONTACT, mailHref: "mailto:lea@example.com" }}
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
