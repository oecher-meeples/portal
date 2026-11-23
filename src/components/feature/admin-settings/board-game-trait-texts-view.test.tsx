import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardGameTrait, BoardGameTraitTone } from "@prisma/client";
import { BoardGameTraitTextsView } from "@/components/feature/admin-settings/board-game-trait-texts-view";
import { BOARD_GAME_TRAIT_OPTIONS } from "@/lib/ludothek/board-game-traits";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const updateBoardGameTraitTextMock = vi.fn();
vi.mock(
  "@/components/feature/admin-settings/board-game-trait-texts-actions",
  () => ({
    updateBoardGameTraitText: (...args: unknown[]) =>
      updateBoardGameTraitTextMock(...args),
  }),
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ROWS = BOARD_GAME_TRAIT_OPTIONS.map((trait) => ({
  trait,
  label: null,
  tooltip: null,
  tone: BoardGameTraitTone.INFO,
  loanMessage: null,
  detailsMessage: null,
}));

describe("BoardGameTraitTextsView", () => {
  it("renders one card per trait", () => {
    render(<BoardGameTraitTextsView rows={ROWS} />);

    expect(screen.getByText("Legacy")).toBeInTheDocument();
    expect(screen.getByText("Kampagne")).toBeInTheDocument();
    expect(
      screen.getByText("Begrenzte Wiederspielbarkeit"),
    ).toBeInTheDocument();
    expect(screen.getByText("Solo spielbar")).toBeInTheDocument();
    expect(screen.getByText("App/Website-Bezug")).toBeInTheDocument();
  });

  it("uses a multiline textarea for the banner and details message fields", () => {
    render(<BoardGameTraitTextsView rows={ROWS} />);

    const loanMessage = screen.getAllByLabelText(
      "Hinweis im Verleih-Banner",
    )[0];
    const detailsMessage = screen.getAllByLabelText(
      "Ausführlicher Hinweis (Detail-View)",
    )[0];
    expect(loanMessage.tagName).toBe("TEXTAREA");
    expect(detailsMessage.tagName).toBe("TEXTAREA");
  });

  it("saves the edited tone for the right trait", async () => {
    const user = userEvent.setup();
    updateBoardGameTraitTextMock.mockResolvedValue({ success: true });
    render(<BoardGameTraitTextsView rows={ROWS} />);

    const toneSelects = screen.getAllByLabelText("Dringlichkeit");
    await user.selectOptions(toneSelects[0], "WARNING");
    const saveButtons = screen.getAllByRole("button", { name: "Speichern" });
    await user.click(saveButtons[0]);

    expect(updateBoardGameTraitTextMock).toHaveBeenCalledWith(
      BoardGameTrait.LEGACY,
      expect.objectContaining({ tone: "WARNING" }),
    );
  });
});
