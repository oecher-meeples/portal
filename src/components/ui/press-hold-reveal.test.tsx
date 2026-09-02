import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PressHoldReveal } from "@/components/ui/press-hold-reveal";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PressHoldReveal (#356)", () => {
  it("reports the value only while held, and reveals again on the next press", async () => {
    const reveal = vi.fn().mockResolvedValue({ success: true, value: "1234" });
    const onValueChange = vi.fn();
    render(<PressHoldReveal reveal={reveal} onValueChange={onValueChange} />);
    const button = screen.getByRole("button", {
      name: "Aufdecken (gedrückt halten)",
    });

    fireEvent.mouseDown(button);
    await vi.waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith("1234"),
    );

    fireEvent.mouseUp(button);
    expect(onValueChange).toHaveBeenLastCalledWith(null);

    fireEvent.mouseDown(button);
    await vi.waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith("1234"),
    );
    expect(reveal).toHaveBeenCalledTimes(2);
  });

  it("reports null again on mouse leave, not just mouse up", async () => {
    const reveal = vi.fn().mockResolvedValue({ success: true, value: "1234" });
    const onValueChange = vi.fn();
    render(<PressHoldReveal reveal={reveal} onValueChange={onValueChange} />);
    const button = screen.getByRole("button", {
      name: "Aufdecken (gedrückt halten)",
    });

    fireEvent.mouseDown(button);
    await vi.waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith("1234"),
    );
    fireEvent.mouseLeave(button);

    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("surfaces an error via onError instead of reporting a value", async () => {
    const reveal = vi.fn().mockResolvedValue({ error: "Zu viele Abrufe." });
    const onError = vi.fn();
    const onValueChange = vi.fn();
    render(
      <PressHoldReveal
        reveal={reveal}
        onError={onError}
        onValueChange={onValueChange}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Aufdecken (gedrückt halten)",
    });

    fireEvent.mouseDown(button);

    await vi.waitFor(() =>
      expect(onError).toHaveBeenCalledWith("Zu viele Abrufe."),
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
