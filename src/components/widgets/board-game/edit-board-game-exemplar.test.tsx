import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import { EMPTY_BOARD_GAME_FORM } from "@/components/widgets/board-game/board-game-form-values";

afterEach(() => {
  cleanup();
});

describe("EditBoardGameExemplar", () => {
  it("renders the condition field and no title-level fields", () => {
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

  describe("Regelheft-Sprache(n) (#188)", () => {
    it("renders a checkbox for every rule book language", () => {
      render(
        <EditBoardGameExemplar
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Deutsch")).toBeInTheDocument();
      expect(screen.getByLabelText("Englisch")).toBeInTheDocument();
      expect(screen.getByLabelText("Sonstige")).toBeInTheDocument();
    });

    it("adds a language when its checkbox is checked", () => {
      const onChange = vi.fn();
      render(
        <EditBoardGameExemplar
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={onChange}
        />,
      );

      fireEvent.click(screen.getByLabelText("Deutsch"));

      expect(onChange).toHaveBeenCalledWith({ ruleBookLanguages: ["DE"] });
    });

    it("supports selecting multiple languages at once — a box can ship DE and EN rulebooks together", () => {
      const onChange = vi.fn();
      render(
        <EditBoardGameExemplar
          idPrefix="test"
          values={{ ...EMPTY_BOARD_GAME_FORM, ruleBookLanguages: ["DE"] }}
          onChange={onChange}
        />,
      );

      fireEvent.click(screen.getByLabelText("Englisch"));

      expect(onChange).toHaveBeenCalledWith({
        ruleBookLanguages: ["DE", "EN"],
      });
    });

    it("removes a language when its checkbox is unchecked", () => {
      const onChange = vi.fn();
      render(
        <EditBoardGameExemplar
          idPrefix="test"
          values={{
            ...EMPTY_BOARD_GAME_FORM,
            ruleBookLanguages: ["DE", "EN"],
          }}
          onChange={onChange}
        />,
      );

      fireEvent.click(screen.getByLabelText("Deutsch"));

      expect(onChange).toHaveBeenCalledWith({ ruleBookLanguages: ["EN"] });
    });
  });
});
