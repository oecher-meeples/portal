import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const changePasswordMock = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  authClient: {
    changePassword: (...args: unknown[]) => changePasswordMock(...args),
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { PasswordChangeSection } from "@/components/feature/mitglied-profil/password-change-section";

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
  confirm: string,
) {
  await user.click(screen.getByRole("button", { name: "Ändern" }));
  await user.type(screen.getByLabelText("Aktuelles Passwort"), current);
  await user.type(screen.getByLabelText("Neues Passwort"), next);
  await user.type(screen.getByLabelText("Neues Passwort wiederholen"), confirm);
  await user.click(screen.getByRole("button", { name: "Passwort ändern" }));
}

describe("PasswordChangeSection", () => {
  beforeEach(() => changePasswordMock.mockReset());
  afterEach(cleanup);

  it("changes the password and revokes other sessions", async () => {
    const user = userEvent.setup();
    changePasswordMock.mockResolvedValue({ error: null });
    render(<PasswordChangeSection />);

    await fill(user, "altes-passwort", "neues-passwort1", "neues-passwort1");

    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: "altes-passwort",
      newPassword: "neues-passwort1",
      revokeOtherSessions: true,
    });
    expect(
      await screen.findByText("Dein Passwort wurde geändert."),
    ).toBeInTheDocument();
  });

  it("rejects mismatching confirmation without calling the API", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeSection />);

    await fill(user, "altes-passwort", "neues-passwort1", "anderes-passwort");

    expect(
      await screen.findByText(
        "Die eingegebenen Passwörter stimmen nicht überein.",
      ),
    ).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("rejects a too short new password", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeSection />);

    await fill(user, "altes-passwort", "kurz", "kurz");

    expect(await screen.findByText(/mindestens 8 Zeichen/)).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("shows a German message for a wrong current password", async () => {
    const user = userEvent.setup();
    changePasswordMock.mockResolvedValue({
      error: { message: "Invalid password" },
    });
    render(<PasswordChangeSection />);

    await fill(user, "falsch", "neues-passwort1", "neues-passwort1");

    expect(
      await screen.findByText("Das aktuelle Passwort ist falsch."),
    ).toBeInTheDocument();
  });
});
