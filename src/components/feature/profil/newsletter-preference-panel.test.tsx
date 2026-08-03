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

const updateNewsletterPreferenceMock = vi.fn();
vi.mock("@/components/feature/profil/actions", () => ({
  updateNewsletterPreference: (...args: unknown[]) =>
    updateNewsletterPreferenceMock(...args),
}));

const { NewsletterPreferencePanel } =
  await import("./newsletter-preference-panel");

describe("NewsletterPreferencePanel", () => {
  it("does not show categories while disabled", () => {
    render(
      <NewsletterPreferencePanel
        initialEnabled={false}
        initialCategories={[]}
      />,
    );

    expect(screen.queryByText("News")).not.toBeInTheDocument();
  });

  it("enables the newsletter and saves immediately when the toggle is switched on", async () => {
    const user = userEvent.setup();
    updateNewsletterPreferenceMock.mockResolvedValue({ success: true });

    render(
      <NewsletterPreferencePanel
        initialEnabled={false}
        initialCategories={[]}
      />,
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Newsletter aktivieren" }),
    );

    expect(updateNewsletterPreferenceMock).toHaveBeenCalledWith({
      enabled: true,
      categories: [],
    });
    expect(await screen.findByText("News")).toBeInTheDocument();
  });

  it("saves the updated category selection immediately when a category is toggled", async () => {
    const user = userEvent.setup();
    updateNewsletterPreferenceMock.mockResolvedValue({ success: true });

    render(
      <NewsletterPreferencePanel
        initialEnabled={true}
        initialCategories={["NEWS"]}
      />,
    );
    await user.click(screen.getByLabelText("Turniere"));

    expect(updateNewsletterPreferenceMock).toHaveBeenCalledWith({
      enabled: true,
      categories: ["NEWS", "TURNIERE"],
    });
  });
});
