import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ContactDialog } from "@/components/entities/contact-dialog";

afterEach(() => {
  cleanup();
});

describe("ContactDialog", () => {
  it("renders the name as plain text when there is no contact option", () => {
    render(
      <ContactDialog
        name="Lea Demo"
        contact={{ mailHref: null, telegramHref: null }}
      />,
    );

    expect(screen.getByText("Lea Demo").tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens a dialog with mail and telegram links on click", () => {
    render(
      <ContactDialog
        name="Lea Demo"
        contact={{
          mailHref: "mailto:lea@example.com",
          telegramHref: "https://t.me/leademo",
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
  });

  it("shows only the mail option when telegram is missing", () => {
    render(
      <ContactDialog
        name="Lea Demo"
        contact={{ mailHref: "mailto:lea@example.com", telegramHref: null }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lea Demo" }));

    expect(screen.getByRole("button", { name: /E-Mail/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Telegram" }),
    ).not.toBeInTheDocument();
  });
});
