import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TitleOverviewDialog } from "@/components/widgets/board-game/title-overview-dialog";

vi.mock("@/components/widgets/board-game/alternate-names-manager", () => ({
  AlternateNamesManager: ({ boardGameId }: { boardGameId: string }) => (
    <p>Alternativnamen von {boardGameId}</p>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TitleOverviewDialog (#203)", () => {
  it("shows main title, secondary title and the alternate names manager", async () => {
    const user = userEvent.setup();
    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Arche Nova"
        secondaryTitle="Ark Nova"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Alle Titel anzeigen" }),
    );

    expect(screen.getByText("Arche Nova")).toBeInTheDocument();
    expect(screen.getByText("Ark Nova")).toBeInTheDocument();
    expect(screen.getByText("Alternativnamen von game-1")).toBeInTheDocument();
  });

  it("omits the secondary title row when none is set", async () => {
    const user = userEvent.setup();
    render(
      <TitleOverviewDialog
        boardGameId="game-1"
        title="Arche Nova"
        secondaryTitle=""
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Alle Titel anzeigen" }),
    );

    expect(screen.queryByText("Sekundärtitel")).not.toBeInTheDocument();
  });
});
