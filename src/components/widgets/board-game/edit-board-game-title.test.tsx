import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditBoardGameTitle } from "@/components/widgets/board-game/edit-board-game-title";
import { EMPTY_BOARD_GAME_FORM } from "@/components/widgets/board-game/board-game-form-values";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const translateDescriptionMock = vi.fn();
const fetchExplainerVideoOptionsMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  translateDescription: (...args: unknown[]) =>
    translateDescriptionMock(...args),
  fetchExplainerVideoOptions: (...args: unknown[]) =>
    fetchExplainerVideoOptionsMock(...args),
}));

vi.mock("@/lib/ludothek/ean-search", () => ({
  searchEanForBoardGame: vi
    .fn()
    .mockResolvedValue({ success: true, results: [] }),
}));

// Pulled in via `TitleOverviewDialog` (#203/#203-Folge) — this file only
// tests the trigger's visibility, not the nested dialog's own logic (see
// title-overview-dialog.test.tsx).
vi.mock("@/lib/ludothek/board-game-alternate-names", () => ({
  addAlternateName: vi.fn(),
  deleteAlternateName: vi.fn(),
  promoteAlternateNameToTitle: vi.fn(),
  promoteAlternateNameToSecondaryTitle: vi.fn(),
  swapTitleAndSecondaryTitle: vi.fn(),
  clearSecondaryTitle: vi.fn(),
  deleteSecondaryTitle: vi.fn(),
  listAlternateNames: vi
    .fn()
    .mockResolvedValue({ success: true, alternateNames: [] }),
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

  describe("Sprachabhängigkeit (#188)", () => {
    it("defaults to 'Nicht erfasst' when unset", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
        />,
      );

      expect(
        screen.getByLabelText("Sprachabhängigkeit (BGG-Skala, optional)"),
      ).toHaveValue("");
    });

    it("reports a level change via onChange", async () => {
      const { fireEvent } = await import("@testing-library/react");
      const onChange = vi.fn();
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={onChange}
        />,
      );

      fireEvent.change(
        screen.getByLabelText("Sprachabhängigkeit (BGG-Skala, optional)"),
        { target: { value: "UNPLAYABLE" } },
      );

      expect(onChange).toHaveBeenCalledWith({
        languageDependence: "UNPLAYABLE",
      });
    });

    it("reports null when reset to 'Nicht erfasst'", async () => {
      const { fireEvent } = await import("@testing-library/react");
      const onChange = vi.fn();
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={{
            ...EMPTY_BOARD_GAME_FORM,
            languageDependence: "UNPLAYABLE",
          }}
          onChange={onChange}
        />,
      );

      fireEvent.change(
        screen.getByLabelText("Sprachabhängigkeit (BGG-Skala, optional)"),
        { target: { value: "" } },
      );

      expect(onChange).toHaveBeenCalledWith({ languageDependence: null });
    });
  });

  describe("Verlag, Autor, Erstveröffentlichung (#205)", () => {
    it("renders the three fields", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Verlag(e)")).toBeInTheDocument();
      expect(screen.getByLabelText("Autor(en)")).toBeInTheDocument();
      expect(screen.getByLabelText("Erstveröffentlichung")).toBeInTheDocument();
    });

    it("reports a publisher change via onChange", async () => {
      const { fireEvent } = await import("@testing-library/react");
      const onChange = vi.fn();
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={onChange}
        />,
      );

      fireEvent.change(screen.getByLabelText("Verlag(e)"), {
        target: { value: "Feuerland Spiele" },
      });

      expect(onChange).toHaveBeenCalledWith({ publisher: "Feuerland Spiele" });
    });

    it("reports a year change via onChange", async () => {
      const { fireEvent } = await import("@testing-library/react");
      const onChange = vi.fn();
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={onChange}
        />,
      );

      fireEvent.change(screen.getByLabelText("Erstveröffentlichung"), {
        target: { value: "2021" },
      });

      expect(onChange).toHaveBeenCalledWith({ yearPublished: "2021" });
    });
  });

  describe("Alternativtitel (#203/#203-Folge)", () => {
    it("no longer renders a free-text secondary title field", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
          boardGameId="game-1"
        />,
      );

      expect(
        screen.queryByLabelText("Sekundärtitel (optional)"),
      ).not.toBeInTheDocument();
    });

    it("hides the Alternativtitel dialog trigger without a boardGameId (Anlegen-Wizard, noch kein Titel)", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Alternativtitel" }),
      ).not.toBeInTheDocument();
    });

    it("shows the Alternativtitel dialog trigger behind the title field once a boardGameId is known (Bearbeiten-Modus)", () => {
      render(
        <EditBoardGameTitle
          idPrefix="test"
          values={EMPTY_BOARD_GAME_FORM}
          onChange={vi.fn()}
          boardGameId="game-1"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Alternativtitel" }),
      ).toBeInTheDocument();
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
