import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MeepleContactDialog } from "@/components/widgets/contact/meeple-contact-dialog";

const fetchContactDialogMeepleMock = vi.fn();
vi.mock("@/lib/members/contact-dialog", () => ({
  fetchContactDialogMeeple: (...args: unknown[]) =>
    fetchContactDialogMeepleMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MeepleContactDialog", () => {
  it("loads the contact data via fetchContactDialogMeeple when opened", async () => {
    fetchContactDialogMeepleMock.mockResolvedValue({
      profilePictureUrl: null,
      contact: {
        mailHref: "mailto:lea@example.com",
        telegramHref: null,
        signalHref: null,
        discordHandle: null,
        address: null,
      },
      profileHref: null,
    });

    render(<MeepleContactDialog name="Lea Demo" meepleId="meeple-1" />);
    expect(fetchContactDialogMeepleMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Lea Demo" }));

    expect(await screen.findByText(/lea@example.com|E-Mail/i)).toBeVisible();
    expect(fetchContactDialogMeepleMock).toHaveBeenCalledWith("meeple-1");
  });
});
