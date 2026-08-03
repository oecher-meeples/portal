import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const subscribeToNewsletterMock = vi.fn();
vi.mock("@/components/feature/newsletter/actions", () => ({
  subscribeToNewsletter: (...args: unknown[]) =>
    subscribeToNewsletterMock(...args),
}));

const { NewsletterSignupForm } = await import("./newsletter-signup-form");

describe("NewsletterSignupForm", () => {
  it("disables submit until at least one category is selected", async () => {
    render(<NewsletterSignupForm />);

    expect(
      screen.getByRole("button", { name: "Newsletter abonnieren" }),
    ).toBeDisabled();
  });

  it("submits the selected categories and shows the confirmation notice", async () => {
    const user = userEvent.setup();
    subscribeToNewsletterMock.mockResolvedValue({ success: true });

    render(<NewsletterSignupForm />);
    await user.type(
      screen.getByLabelText("E-Mail-Adresse"),
      "person@example.com",
    );
    await user.click(screen.getByLabelText("News"));
    await user.click(
      screen.getByRole("button", { name: "Newsletter abonnieren" }),
    );

    expect(subscribeToNewsletterMock).toHaveBeenCalledWith({
      email: "person@example.com",
      categories: ["NEWS"],
      honeypot: "",
    });
    expect(
      await screen.findByText(/wir haben dir eine E-Mail/),
    ).toBeInTheDocument();
  });

  it("shows the server error instead of the confirmation notice on failure", async () => {
    const user = userEvent.setup();
    subscribeToNewsletterMock.mockResolvedValue({
      error: "Bitte E-Mail-Adresse und mindestens eine Kategorie angeben.",
    });

    render(<NewsletterSignupForm />);
    await user.type(
      screen.getByLabelText("E-Mail-Adresse"),
      "person@example.com",
    );
    await user.click(screen.getByLabelText("News"));
    await user.click(
      screen.getByRole("button", { name: "Newsletter abonnieren" }),
    );

    expect(
      await screen.findByText(
        "Bitte E-Mail-Adresse und mindestens eine Kategorie angeben.",
      ),
    ).toBeInTheDocument();
  });
});
