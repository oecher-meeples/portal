import { beforeEach, describe, expect, it, vi } from "vitest";

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", () => ({
  requireMeeple: (...args: unknown[]) => requireMeepleMock(...args),
}));

const createFeedbackSubIssueMock = vi.fn();
class GithubApiErrorStub extends Error {}
vi.mock("@/lib/feedback/github-client", () => ({
  createFeedbackSubIssue: (...args: unknown[]) =>
    createFeedbackSubIssueMock(...args),
  GithubApiError: GithubApiErrorStub,
}));

const { submitFeedback } = await import("./actions");

beforeEach(() => {
  requireMeepleMock.mockResolvedValue({ id: "meeple-1" });
});

describe("submitFeedback", () => {
  it("requires a logged-in meeple", async () => {
    requireMeepleMock.mockRejectedValue(new Error("redirect"));

    await expect(submitFeedback("Titel", "Text")).rejects.toThrow("redirect");
    expect(createFeedbackSubIssueMock).not.toHaveBeenCalled();
  });

  it("rejects an empty subject", async () => {
    const result = await submitFeedback("   ", "Text");

    expect(result).toEqual({ error: "Bitte einen Betreff angeben." });
    expect(createFeedbackSubIssueMock).not.toHaveBeenCalled();
  });

  it("rejects an empty message", async () => {
    const result = await submitFeedback("Titel", "   ");

    expect(result).toEqual({ error: "Bitte eine Nachricht angeben." });
    expect(createFeedbackSubIssueMock).not.toHaveBeenCalled();
  });

  it("trims and forwards subject/body to createFeedbackSubIssue", async () => {
    createFeedbackSubIssueMock.mockResolvedValue({
      number: 320,
      url: "https://github.com/oecher-meeples/portal/issues/320",
    });

    const result = await submitFeedback("  Betreff  ", "  Text  ");

    expect(result).toEqual({ success: true });
    expect(createFeedbackSubIssueMock).toHaveBeenCalledWith("Betreff", "Text");
  });

  it("surfaces a GithubApiError as a user-facing message instead of throwing", async () => {
    createFeedbackSubIssueMock.mockRejectedValue(
      new GithubApiErrorStub("boom"),
    );

    const result = await submitFeedback("Titel", "Text");

    expect(result).toEqual({
      error:
        "Feedback konnte nicht übermittelt werden. Bitte später erneut versuchen.",
    });
  });

  it("re-throws unexpected errors", async () => {
    createFeedbackSubIssueMock.mockRejectedValue(new Error("unexpected"));

    await expect(submitFeedback("Titel", "Text")).rejects.toThrow("unexpected");
  });
});
