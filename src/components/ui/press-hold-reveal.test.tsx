import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PressHoldReveal } from "@/components/ui/press-hold-reveal";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PressHoldReveal (#356)", () => {
  it("shows the value only while held, and reveals again on the next press", async () => {
    const reveal = vi.fn().mockResolvedValue({ success: true, value: "1234" });
    render(<PressHoldReveal reveal={reveal} />);
    const button = screen.getByRole("button", { name: "Aufdecken (gedrückt halten)" });

    fireEvent.mouseDown(button);
    expect(await screen.findByText("1234")).toBeInTheDocument();

    fireEvent.mouseUp(button);
    expect(screen.queryByText("1234")).toBeNull();

    fireEvent.mouseDown(button);
    await screen.findByText("1234");
    expect(reveal).toHaveBeenCalledTimes(2);
  });

  it("hides the value again on mouse leave, not just mouse up", async () => {
    const reveal = vi.fn().mockResolvedValue({ success: true, value: "1234" });
    render(<PressHoldReveal reveal={reveal} />);
    const button = screen.getByRole("button", { name: "Aufdecken (gedrückt halten)" });

    fireEvent.mouseDown(button);
    await screen.findByText("1234");
    fireEvent.mouseLeave(button);

    expect(screen.queryByText("1234")).toBeNull();
  });

  it("surfaces an error via onError instead of showing a value", async () => {
    const reveal = vi.fn().mockResolvedValue({ error: "Zu viele Abrufe." });
    const onError = vi.fn();
    render(<PressHoldReveal reveal={reveal} onError={onError} />);
    const button = screen.getByRole("button", { name: "Aufdecken (gedrückt halten)" });

    fireEvent.mouseDown(button);

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("Zu viele Abrufe."));
    expect(screen.queryByText(/./, { selector: "span.font-mono" })).toBeNull();
  });
});
