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

const submitFeedbackMock = vi.fn();
vi.mock("@/components/feature/feedback/actions", () => ({
  submitFeedback: (...args: unknown[]) => submitFeedbackMock(...args),
}));

const { FeedbackButton } = await import("./feedback-button");

describe("FeedbackButton (#282)", () => {
  it("prefills the message with the current page URL when opened", async () => {
    const user = userEvent.setup();
    render(<FeedbackButton />);

    await user.click(
      screen.getByRole("button", { name: "Feedback einreichen" }),
    );

    expect(screen.getByLabelText("Nachricht")).toHaveValue(
      `Seite: ${window.location.href}\n\n`,
    );
  });

  it("disables the submit button until subject and message are filled in", async () => {
    const user = userEvent.setup();
    render(<FeedbackButton />);
    await user.click(
      screen.getByRole("button", { name: "Feedback einreichen" }),
    );

    expect(screen.getByRole("button", { name: "Senden" })).toBeDisabled();

    await user.type(screen.getByLabelText("Betreff"), "Betreff");
    expect(screen.getByRole("button", { name: "Senden" })).not.toBeDisabled();
  });

  it("submits the trimmed subject and full message on send", async () => {
    const user = userEvent.setup();
    submitFeedbackMock.mockResolvedValue({ success: true });

    render(<FeedbackButton />);
    await user.click(
      screen.getByRole("button", { name: "Feedback einreichen" }),
    );
    await user.type(screen.getByLabelText("Betreff"), "Buttons zu klein");
    await user.type(screen.getByLabelText("Nachricht"), "Mehr Text.");
    await user.click(screen.getByRole("button", { name: "Senden" }));

    expect(submitFeedbackMock).toHaveBeenCalledWith(
      "Buttons zu klein",
      expect.stringContaining("Mehr Text."),
    );
  });
});
