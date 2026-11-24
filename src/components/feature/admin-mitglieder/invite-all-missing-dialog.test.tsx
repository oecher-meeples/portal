import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const countMissingInvitesMock = vi.fn();
const inviteAllMissingMock = vi.fn();
vi.mock("@/components/feature/admin-mitglieder/invite-actions", () => ({
  countMissingInvites: () => countMissingInvitesMock(),
  inviteAllMissing: () => inviteAllMissingMock(),
}));

const { InviteAllMissingDialog } = await import("./invite-all-missing-dialog");

beforeEach(() => {
  countMissingInvitesMock.mockReset().mockResolvedValue({ count: 12 });
  inviteAllMissingMock.mockReset().mockResolvedValue({
    created: 12,
    errors: [{ email: "x@example.com", message: "Mail fehlgeschlagen" }],
  });
});

afterEach(cleanup);

describe("InviteAllMissingDialog (#622)", () => {
  it("asks for confirmation with the count before sending", async () => {
    const user = userEvent.setup();
    render(<InviteAllMissingDialog />);

    await user.click(
      screen.getByRole("button", { name: "Alle Fehlenden einladen" }),
    );

    expect(
      await screen.findByText("12 Mitglied(er) werden eingeladen."),
    ).toBeInTheDocument();
    expect(inviteAllMissingMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "12 einladen" }));

    expect(inviteAllMissingMock).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("12 Einladung(en) erstellt."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("x@example.com: Mail fehlgeschlagen"),
    ).toBeInTheDocument();
  });

  it("says nobody is missing and disables sending at 0 candidates", async () => {
    countMissingInvitesMock.mockResolvedValue({ count: 0 });
    const user = userEvent.setup();
    render(<InviteAllMissingDialog />);

    await user.click(
      screen.getByRole("button", { name: "Alle Fehlenden einladen" }),
    );

    expect(await screen.findByText("Niemand einzuladen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Einladen" })).toBeDisabled();
  });
});
