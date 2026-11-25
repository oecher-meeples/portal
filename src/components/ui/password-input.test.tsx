import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { PasswordField } from "@/components/ui/password-input";

function setup() {
  render(<PasswordField id="pw" label="Passwort" defaultValue="geheim" />);
  return {
    input: screen.getByLabelText("Passwort"),
    button: screen.getByRole("button", { name: "Passwort anzeigen" }),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PasswordInput (#633)", () => {
  it("is hidden by default", () => {
    expect(setup().input).toHaveAttribute("type", "password");
  });

  it("tap pins visibility, second tap hides again", () => {
    const { input, button } = setup();
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(input).toHaveAttribute("type", "text");
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(input).toHaveAttribute("type", "password");
  });

  it("long press shows only while held and does not pin", () => {
    const { input, button } = setup();
    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(input).toHaveAttribute("type", "text");

    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(input).toHaveAttribute("type", "password");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("no long press while pinned", () => {
    const { input, button } = setup();
    fireEvent.click(button);
    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(input).toHaveAttribute("type", "password");
  });
});
