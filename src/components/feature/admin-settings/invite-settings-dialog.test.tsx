import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteSettingsDialog } from "@/components/feature/admin-settings/invite-settings-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/components/feature/admin-settings/actions", () => ({
  updateDefaultInviteDays: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("InviteSettingsDialog (#350)", () => {
  it("shows the settings card closed by default, without navigating anywhere", () => {
    render(<InviteSettingsDialog defaultDays={7} />);

    expect(screen.getByText("Einladungen")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Standard-Gültigkeitsdauer/)).toBeNull();
  });

  it("opens a dialog with the invite settings form when the card is clicked", async () => {
    const user = userEvent.setup();
    render(<InviteSettingsDialog defaultDays={7} />);

    await user.click(screen.getByRole("button", { name: /Einladungen/ }));

    expect(
      screen.getByLabelText("Standard-Gültigkeitsdauer (Tage)"),
    ).toHaveValue(7);
  });
});
