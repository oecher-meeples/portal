import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const { ErklaerbaerenView } = await import("./erklaerbaeren-view");

describe("ErklaerbaerenView", () => {
  it("has no tab bar without events:manage", () => {
    render(
      <ErklaerbaerenView tab="meine" showDirectory={false}>
        Inhalt
      </ErklaerbaerenView>,
    );

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("Inhalt")).toBeInTheDocument();
  });

  it("shows both tabs with events:manage and navigates on switch", async () => {
    render(
      <ErklaerbaerenView tab="meine" showDirectory>
        Inhalt
      </ErklaerbaerenView>,
    );

    expect(screen.getByRole("tab", { name: "Meine Spiele" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.click(
      screen.getByRole("tab", { name: "Erklärbär-Verzeichnis" }),
    );

    expect(push).toHaveBeenCalledWith("/erklaerbaeren?tab=verzeichnis");
  });
});
