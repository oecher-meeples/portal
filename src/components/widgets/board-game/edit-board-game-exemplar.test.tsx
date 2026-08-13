import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import { EMPTY_BOARD_GAME_FORM } from "@/components/widgets/board-game/board-game-form-values";

afterEach(() => {
  cleanup();
});

describe("EditBoardGameExemplar", () => {
  it("renders only the condition field", () => {
    render(
      <EditBoardGameExemplar
        idPrefix="test"
        values={EMPTY_BOARD_GAME_FORM}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Mängelvermerk")).toBeInTheDocument();
    expect(screen.queryByLabelText("Titel")).not.toBeInTheDocument();
  });

  it("reports a condition change via onChange", () => {
    const onChange = vi.fn();
    render(
      <EditBoardGameExemplar
        idPrefix="test"
        values={EMPTY_BOARD_GAME_FORM}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Mängelvermerk"), {
      target: { value: "Gebraucht, funktionstüchtig" },
    });

    expect(onChange).toHaveBeenCalledWith({
      condition: "Gebraucht, funktionstüchtig",
    });
  });
});
