import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswortEinloesenForm } from "@/components/feature/passwort-vergessen/passwort-einloesen-form";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const resetPasswordMock = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  authClient: { resetPassword: (...args: unknown[]) => resetPasswordMock(...args) },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PasswortEinloesenForm (#363, classic token-link flow)", () => {
  it("shows an error instead of a form without a token", () => {
    render(<PasswortEinloesenForm token={null} />);

    expect(screen.getByText(/Dieser Link ist unvollständig/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Neues Passwort")).toBeNull();
  });

  it("sets the new password via the token and redirects to /login on success", async () => {
    const user = userEvent.setup();
    resetPasswordMock.mockResolvedValue({ error: null });
    render(<PasswortEinloesenForm token="reset-token-123" />);

    await user.type(screen.getByLabelText("Neues Passwort"), "supersecret1");
    await user.type(
      screen.getByLabelText("Neues Passwort wiederholen"),
      "supersecret1",
    );
    await user.click(screen.getByRole("button", { name: "Passwort festlegen" }));

    expect(resetPasswordMock).toHaveBeenCalledWith({
      newPassword: "supersecret1",
      token: "reset-token-123",
    });
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("shows an error for a rejected/expired token instead of redirecting", async () => {
    const user = userEvent.setup();
    resetPasswordMock.mockResolvedValue({
      error: { message: "invalid token" },
    });
    render(<PasswortEinloesenForm token="reset-token-123" />);

    await user.type(screen.getByLabelText("Neues Passwort"), "supersecret1");
    await user.type(
      screen.getByLabelText("Neues Passwort wiederholen"),
      "supersecret1",
    );
    await user.click(screen.getByRole("button", { name: "Passwort festlegen" }));

    expect(screen.getByText(/ungültig oder abgelaufen/)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched password confirmation without calling the API", async () => {
    const user = userEvent.setup();
    render(<PasswortEinloesenForm token="reset-token-123" />);

    await user.type(screen.getByLabelText("Neues Passwort"), "supersecret1");
    await user.type(
      screen.getByLabelText("Neues Passwort wiederholen"),
      "different",
    );
    await user.click(screen.getByRole("button", { name: "Passwort festlegen" }));

    expect(
      screen.getByText("Die eingegebenen Passwörter stimmen nicht überein."),
    ).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });
});
