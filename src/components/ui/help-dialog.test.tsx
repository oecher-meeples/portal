import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HelpDialog } from "@/components/ui/help-dialog";

afterEach(cleanup);

describe("HelpDialog (#453)", () => {
  it("opens a dialog with the title and content when the trigger is clicked", () => {
    render(
      <HelpDialog title="Anonymisierung">
        <p>Erklärtext</p>
      </HelpDialog>,
    );

    expect(screen.queryByText("Erklärtext")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Erklärung: Anonymisierung" }),
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Erklärtext")).toBeInTheDocument();
  });
});
