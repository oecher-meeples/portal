import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ActionDialog } from "./action-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe("ActionDialog — onOpen", () => {
  it("runs onOpen once when the trigger opens the dialog", async () => {
    const onOpen = vi.fn();
    render(
      <ActionDialog
        trigger={<button type="button">Öffnen</button>}
        title="Test"
        submitLabel="Speichern"
        action={async () => ({ success: true })}
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Öffnen" }));

    expect(await screen.findByText("Test")).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("runs onOpen when the dialog is opened from outside (controlled)", async () => {
    const onOpen = vi.fn();
    render(
      <ActionDialog
        open
        onOpenChange={vi.fn()}
        title="Test"
        submitLabel="Speichern"
        action={async () => ({ success: true })}
        onOpen={onOpen}
      />,
    );

    expect(await screen.findByText("Test")).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
