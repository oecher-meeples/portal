import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import { EMPTY_BOARD_GAME_FORM } from "@/components/widgets/board-game/board-game-form-values";

vi.mock("@/lib/ludothek/taxonomy/contributor-actions", () => ({
  listContributorNames: async () => [],
}));
vi.mock("@/lib/ludothek/taxonomy/version-actions", () => ({
  getBoardGameEditions: async () => [],
  getUnsavedBggVersions: (boardGameId: string) =>
    getUnsavedBggVersionsMock(boardGameId),
}));
const getUnsavedBggVersionsMock = vi.fn<
  (boardGameId: string) => Promise<unknown[]>
>(async () => []);

afterEach(() => {
  cleanup();
  getUnsavedBggVersionsMock.mockClear();
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

  describe("Version", () => {
    it("offers BGG versions that are not saved yet and applies the chosen one", async () => {
      getUnsavedBggVersionsMock.mockResolvedValue([
        {
          bggVersionId: 7,
          name: "Deutsche Ausgabe",
          yearPublished: 2022,
          publisher: ["Feuerland Spiele"],
          productCode: null,
          languages: ["German"],
          publisherLinks: [{ bggId: 10, name: "Feuerland Spiele" }],
        },
      ]);
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <EditBoardGameExemplar
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={onChange}
          boardGameId="game-1"
        />,
      );

      const option = await screen.findByRole("option", {
        name: /Feuerland Spiele/,
      });
      expect(getUnsavedBggVersionsMock).toHaveBeenCalledWith("game-1");
      await user.selectOptions(screen.getByLabelText("Version"), option);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          editionMode: "new",
          publisher: "Feuerland Spiele",
          editionLanguages: "German",
          bggVersion: expect.objectContaining({ bggVersionId: 7 }),
        }),
      );
    });

    it("does not ask BGG without a saved title", () => {
      render(
        <EditBoardGameExemplar
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
        />,
      );

      expect(getUnsavedBggVersionsMock).not.toHaveBeenCalled();
    });
  });
});
