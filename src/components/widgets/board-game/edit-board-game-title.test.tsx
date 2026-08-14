import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EditBoardGameTitle } from "@/components/widgets/board-game/edit-board-game-title";
import { EMPTY_BOARD_GAME_FORM } from "@/components/widgets/board-game/board-game-form-values";

afterEach(() => {
  cleanup();
});

describe("EditBoardGameTitle", () => {
  it("renders title-level fields but not the condition field", () => {
    render(
      <EditBoardGameTitle
        idPrefix="test"
        values={EMPTY_BOARD_GAME_FORM}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Titel")).toBeInTheDocument();
    expect(screen.getByLabelText("EAN")).toBeInTheDocument();
    expect(screen.getByLabelText("Art")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mängelvermerk")).not.toBeInTheDocument();
  });

  it("reports a kind change via onChange", async () => {
    const onChange = vi.fn();
    render(
      <EditBoardGameTitle
        idPrefix="test"
        values={EMPTY_BOARD_GAME_FORM}
        onChange={onChange}
      />,
    );

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(screen.getByLabelText("Art"), {
      target: { value: "BOARDGAME_EXPANSION" },
    });

    expect(onChange).toHaveBeenCalledWith({ kind: "BOARDGAME_EXPANSION" });
  });

  it("keeps the plain text field without mechanicsOptions", () => {
    render(
      <EditBoardGameTitle
        idPrefix="test"
        values={EMPTY_BOARD_GAME_FORM}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByPlaceholderText("Worker Placement, Drafting, …"),
    ).toBeInTheDocument();
  });

  it("shows the already-selected mechanics as chips with mechanicsOptions (#124)", () => {
    render(
      <EditBoardGameTitle
        idPrefix="test"
        values={{
          ...EMPTY_BOARD_GAME_FORM,
          mechanics: "Drafting, Worker Placement",
        }}
        onChange={vi.fn()}
        mechanicsOptions={["Drafting", "Worker Placement", "Deck Building"]}
      />,
    );

    expect(
      screen.queryByPlaceholderText("Worker Placement, Drafting, …"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Drafting")).toBeInTheDocument();
    expect(screen.getByText("Worker Placement")).toBeInTheDocument();
  });
});
