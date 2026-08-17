import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditBoardGameTitle } from "@/components/widgets/board-game/edit-board-game-title";
import { EMPTY_BOARD_GAME_FORM } from "@/components/widgets/board-game/board-game-form-values";

const translateDescriptionMock = vi.fn();
const fetchExplainerVideoOptionsMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  translateDescription: (...args: unknown[]) =>
    translateDescriptionMock(...args),
  fetchExplainerVideoOptions: (...args: unknown[]) =>
    fetchExplainerVideoOptionsMock(...args),
}));

// fetchExplainerVideoOptionsMock bleibt bewusst gemockt (sonst greift der
// echte Server-Action-Import durch), auch wenn diese Datei die
// Video-Button-Interaktion selbst nicht mehr testet — die zieht seit der
// Auslagerung nach ExplainerVideoField in deren eigene Testdatei
// (explainer-video-field.test.tsx).

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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

  describe("Übersetzen-Button", () => {
    it("disables the button when the description is empty", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: "Übersetzen" })).toBeDisabled();
    });

    it("translates the description and reports the result via onChange", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      translateDescriptionMock.mockResolvedValue({
        success: true,
        text: "Baue einen modernen Zoo.",
      });

      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={{
            ...EMPTY_BOARD_GAME_FORM,
            description: "Build a modern zoo.",
          }}
          onChange={onChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Übersetzen" }));

      await waitFor(() =>
        expect(translateDescriptionMock).toHaveBeenCalledWith(
          "Build a modern zoo.",
        ),
      );
      expect(onChange).toHaveBeenCalledWith({
        description: "Baue einen modernen Zoo.",
      });
    });

    it("shows a speaking error instead of the translation when it fails", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      translateDescriptionMock.mockResolvedValue({
        success: false,
        error: "Die Übersetzung ist fehlgeschlagen. Bitte erneut versuchen.",
      });

      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={{
            ...EMPTY_BOARD_GAME_FORM,
            description: "Build a modern zoo.",
          }}
          onChange={onChange}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Übersetzen" }));

      expect(
        await screen.findByText(
          "Die Übersetzung ist fehlgeschlagen. Bitte erneut versuchen.",
        ),
      ).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("compareStatus — Randfarbe im BGG-Abgleich (#189)", () => {
    it("gives a matching field a green border", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
          compareStatus={{ title: true }}
        />,
      );

      expect(screen.getByLabelText("Titel")).toHaveClass("border-emerald-600");
    });

    it("gives a mismatching field a red border", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
          compareStatus={{ title: false }}
        />,
      );

      expect(screen.getByLabelText("Titel")).toHaveClass("border-red-600");
    });

    it("leaves fields without a BGG correspondence unstyled", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
          compareStatus={{ title: true }}
        />,
      );

      expect(screen.getByLabelText("EAN")).not.toHaveClass(
        "border-emerald-600",
      );
      expect(screen.getByLabelText("EAN")).not.toHaveClass("border-red-600");
    });

    it("leaves every field unstyled when compareStatus is not set", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Titel")).not.toHaveClass(
        "border-emerald-600",
      );
      expect(screen.getByLabelText("Titel")).not.toHaveClass("border-red-600");
    });
  });
});
