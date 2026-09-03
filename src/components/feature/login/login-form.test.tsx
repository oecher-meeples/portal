import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/feature/login/login-form";
import { recordLoginFailureClient } from "@/lib/auth/login-cooldown";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signInEmailMock = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: { email: (...args: unknown[]) => signInEmailMock(...args) },
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("LoginForm (#425, client-seitige Cooldown-Näherung)", () => {
  it("submits and redirects on success, clearing any recorded failures", async () => {
    const user = userEvent.setup();
    recordLoginFailureClient("me@example.com");
    signInEmailMock.mockResolvedValue({ error: null });
    render(<LoginForm />);

    await user.type(screen.getByLabelText("E-Mail"), "me@example.com");
    await user.type(screen.getByLabelText("Passwort"), "supersecret1");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(localStorage.getItem("login-cooldown:me@example.com")).toBeNull();
  });

  it("does not disable the button before 4 failed attempts", async () => {
    const user = userEvent.setup();
    signInEmailMock.mockResolvedValue({
      error: { message: "INVALID_EMAIL_OR_PASSWORD" },
    });
    render(<LoginForm />);

    await user.type(screen.getByLabelText("E-Mail"), "me@example.com");
    await user.type(screen.getByLabelText("Passwort"), "wrong");
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole("button", { name: "Anmelden" }));
    }

    expect(screen.getByRole("button", { name: "Anmelden" })).toBeEnabled();
  });

  it("disables the submit button and shows a countdown after 4 failed attempts", async () => {
    const user = userEvent.setup();
    signInEmailMock.mockResolvedValue({
      error: { message: "INVALID_EMAIL_OR_PASSWORD" },
    });
    render(<LoginForm />);

    await user.type(screen.getByLabelText("E-Mail"), "me@example.com");
    await user.type(screen.getByLabelText("Passwort"), "wrong");
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: "Anmelden" }));
    }

    expect(screen.getByRole("button", { name: "Anmelden" })).toBeDisabled();
    expect(screen.getByText(/Zu viele Fehlversuche/)).toBeInTheDocument();
  });

  it("restores an already-active cooldown recorded in an earlier session", () => {
    for (let i = 0; i < 4; i++) recordLoginFailureClient("me@example.com");
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("E-Mail"), {
      target: { value: "me@example.com" },
    });

    expect(screen.getByRole("button", { name: "Anmelden" })).toBeDisabled();
    expect(screen.getByText(/Zu viele Fehlversuche/)).toBeInTheDocument();
  });
});
