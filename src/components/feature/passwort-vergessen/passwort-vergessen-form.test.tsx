import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PasswortVergessenForm } from "./passwort-vergessen-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    forgetPassword: { emailOtp: vi.fn().mockResolvedValue(undefined) },
    emailOtp: { resetPassword: vi.fn() },
  },
}));

afterEach(cleanup);

describe("PasswortVergessenForm — initialEmail (#324, Live-Review-Ergänzung)", () => {
  it("starts with an empty email field by default", () => {
    render(<PasswortVergessenForm />);

    expect(screen.getByLabelText("E-Mail")).toHaveValue("");
  });

  it("prefills the email field from the login form's query param", () => {
    render(<PasswortVergessenForm initialEmail="me@example.com" />);

    expect(screen.getByLabelText("E-Mail")).toHaveValue("me@example.com");
  });
});
