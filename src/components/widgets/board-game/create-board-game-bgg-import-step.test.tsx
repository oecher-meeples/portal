import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateBoardGameBggImportStep } from "@/components/widgets/board-game/create-board-game-bgg-import-step";
import type { BggGameData } from "@/lib/bgg/client";

afterEach(() => {
  cleanup();
});

const BASE_PREVIEW: BggGameData = {
  title: "Ark Nova",
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 150,
  weight: 3.7,
  averageRating: 8.5,
  imageUrl: null,
  description: null,
  mechanics: [],
  categories: [],
  kind: "BOARDGAME" as never,
  languageDependence: null,
  author: [],
  yearPublished: null,
  versions: [],
  alternateNames: [],
  explainerVideoUrl: null,
  germanExplainerVideos: [],
  englishExplainerVideos: [],
};

const NOOP_PROPS = {
  bggInput: "",
  onBggInputChange: vi.fn(),
  onResolve: vi.fn(),
  isResolving: false,
  searchResults: null,
  onSelectResult: vi.fn(),
};

describe("CreateBoardGameBggImportStep — Verlags-Auswahl bei mehreren Editionen (#205)", () => {
  it("omits the version picker when there is no preview yet", () => {
    render(<CreateBoardGameBggImportStep {...NOOP_PROPS} preview={null} />);

    expect(
      screen.queryByText("Verlag auswählen — BGG listet mehrere Editionen"),
    ).not.toBeInTheDocument();
  });

  it("omits the version picker when every version shares the same publisher", () => {
    render(
      <CreateBoardGameBggImportStep
        {...NOOP_PROPS}
        preview={{
          ...BASE_PREVIEW,
          versions: [
            {
              yearPublished: 2021,
              publisher: ["Feuerland Spiele"],
              productCode: "FEU001",
              languages: ["German"],
            },
          ],
        }}
      />,
    );

    expect(
      screen.queryByText("Verlag auswählen — BGG listet mehrere Editionen"),
    ).not.toBeInTheDocument();
  });

  it("omits the version picker when only a single German edition exists among others (#205)", () => {
    render(
      <CreateBoardGameBggImportStep
        {...NOOP_PROPS}
        preview={{
          ...BASE_PREVIEW,
          versions: [
            {
              yearPublished: 2021,
              publisher: ["Capstone Games"],
              productCode: "CAPS001",
              languages: ["English"],
            },
            {
              yearPublished: 2022,
              publisher: ["Feuerland Spiele"],
              productCode: "FEU001",
              languages: ["German"],
            },
          ],
        }}
      />,
    );

    // Filtered down to the sole German edition — unambiguous, auto-accepted.
    expect(
      screen.queryByText("Verlag auswählen — BGG listet mehrere Editionen"),
    ).not.toBeInTheDocument();
  });

  it("shows a version picker when the German editions themselves disagree on publisher, and applies the chosen one", async () => {
    const user = userEvent.setup();
    const onSelectVersion = vi.fn();
    render(
      <CreateBoardGameBggImportStep
        {...NOOP_PROPS}
        preview={{
          ...BASE_PREVIEW,
          versions: [
            {
              yearPublished: 2021,
              publisher: ["Feuerland Spiele"],
              productCode: "FEU001",
              languages: ["German"],
            },
            {
              yearPublished: 2023,
              publisher: ["Frosted Games"],
              productCode: "FRO001",
              languages: ["German"],
            },
          ],
        }}
        onSelectVersion={onSelectVersion}
      />,
    );

    expect(
      screen.getByText("Verlag auswählen — BGG listet mehrere Editionen"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Feuerland Spiele/)).toBeInTheDocument();
    expect(screen.getByText(/Frosted Games/)).toBeInTheDocument();

    await user.click(screen.getByText(/Feuerland Spiele/));

    expect(onSelectVersion).toHaveBeenCalledWith({
      yearPublished: 2021,
      publisher: ["Feuerland Spiele"],
      productCode: "FEU001",
      languages: ["German"],
    });
  });
});
