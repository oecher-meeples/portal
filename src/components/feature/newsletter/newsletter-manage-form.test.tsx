import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const routerPushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

const updateNewsletterCategoriesMock = vi.fn();
const unsubscribeFromNewsletterMock = vi.fn();
vi.mock("@/components/feature/newsletter/actions", () => ({
  updateNewsletterCategories: (...args: unknown[]) =>
    updateNewsletterCategoriesMock(...args),
  unsubscribeFromNewsletter: (...args: unknown[]) =>
    unsubscribeFromNewsletterMock(...args),
}));

vi.stubGlobal(
  "confirm",
  vi.fn(() => true),
);

const { NewsletterManageForm } = await import("./newsletter-manage-form");

describe("NewsletterManageForm", () => {
  it("saves the updated category selection for the given token", async () => {
    const user = userEvent.setup();
    updateNewsletterCategoriesMock.mockResolvedValue({ success: true });

    render(
      <NewsletterManageForm
        token="token-1"
        email="person@example.com"
        initialCategories={["NEWS"]}
      />,
    );
    await user.click(screen.getByLabelText("Turniere"));
    await user.click(
      screen.getByRole("button", { name: "Änderungen speichern" }),
    );

    expect(updateNewsletterCategoriesMock).toHaveBeenCalledWith("token-1", [
      "NEWS",
      "TURNIERE",
    ]);
  });

  it("unsubscribes and navigates home after confirming", async () => {
    const user = userEvent.setup();
    unsubscribeFromNewsletterMock.mockResolvedValue({ success: true });

    render(
      <NewsletterManageForm
        token="token-1"
        email="person@example.com"
        initialCategories={["NEWS"]}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Newsletter komplett abbestellen" }),
    );

    expect(unsubscribeFromNewsletterMock).toHaveBeenCalledWith("token-1");
    expect(routerPushMock).toHaveBeenCalledWith("/");
  });
});
