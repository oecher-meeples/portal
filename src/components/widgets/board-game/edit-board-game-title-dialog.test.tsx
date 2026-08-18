import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardGameKind } from "@prisma/client";
import { EditBoardGameTitleDialog } from "@/components/widgets/board-game/edit-board-game-title-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const updateBoardGameMock = vi.fn();
vi.mock("@/lib/ludothek/board-games", () => ({
  updateBoardGame: (...args: unknown[]) => updateBoardGameMock(...args),
}));

const previewBggImportMock = vi.fn();
const translateDescriptionMock = vi.fn();
const fetchExplainerVideoOptionsMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  previewBggImport: (...args: unknown[]) => previewBggImportMock(...args),
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
  listAlternateNames: vi
    .fn()
    .mockResolvedValue({ success: true, alternateNames: [] }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const GAME_WITHOUT_BGG_ID = {
  boardGameId: "title-1",
  title: "Arche Nova",
  secondaryTitle: null,
  languageDependence: null,
  publisher: [],
  author: [],
  yearPublished: null,
  ean: null,
  kind: BoardGameKind.BOARDGAME,
  bggId: null,
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 90,
  weight: 3.7,
  averageRating: 8.5,
  imageUrl: null,
  description: null,
  mechanics: [],
  explainerVideoUrl: null,
};

const GAME_WITH_BGG_ID = { ...GAME_WITHOUT_BGG_ID, bggId: 342942 };

const BGG_DATA = {
  title: "Ark Nova",
  minPlayers: 1,
  maxPlayers: 4,
  playTimeMinutes: 150,
  weight: 3.7,
  averageRating: 8.5,
  imageUrl: "https://cf.geekdo-images.com/full.jpg",
  description: "Baue einen modernen Zoo.",
  mechanics: ["Kartenspiel"],
  alternateNames: [],
  explainerVideoUrl: null,
  germanExplainerVideos: [],
  englishExplainerVideos: [],
  author: [],
  yearPublished: null,
  versions: [],
};

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Titel bearbeiten" }));
}

describe("EditBoardGameTitleDialog — BGG-Abgleich (#189)", () => {
  it("hides the compare button when the title has no bggId", async () => {
    const user = userEvent.setup();
    render(<EditBoardGameTitleDialog game={GAME_WITHOUT_BGG_ID} />);
    await openDialog(user);

    expect(
      screen.queryByRole("button", { name: "Daten mit BGG abgleichen" }),
    ).not.toBeInTheDocument();
  });

  it("loads and shows the BGG comparison panel", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({ success: true, data: BGG_DATA });
    render(<EditBoardGameTitleDialog game={GAME_WITH_BGG_ID} />);
    await openDialog(user);

    await user.click(
      screen.getByRole("button", { name: "Daten mit BGG abgleichen" }),
    );

    expect(previewBggImportMock).toHaveBeenCalledWith(342942);
    expect(await screen.findByText("Aktuelle BGG-Daten")).toBeInTheDocument();
  });

  it("colors the title field red for a mismatch and closes the comparison again", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({ success: true, data: BGG_DATA });
    render(<EditBoardGameTitleDialog game={GAME_WITH_BGG_ID} />);
    await openDialog(user);
    await user.click(
      screen.getByRole("button", { name: "Daten mit BGG abgleichen" }),
    );
    await screen.findByText("Aktuelle BGG-Daten");

    // GAME_WITH_BGG_ID.title "Arche Nova" !== BGG_DATA.title "Ark Nova".
    expect(screen.getByLabelText("Titel")).toHaveClass("border-red-600");

    await user.click(
      screen.getByRole("button", { name: "Abgleich schließen" }),
    );

    expect(screen.queryByText("Aktuelle BGG-Daten")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Daten mit BGG abgleichen" }),
    ).toBeInTheDocument();
  });

  it("applies a BGG value into the left form via the Übernehmen button", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({ success: true, data: BGG_DATA });
    render(<EditBoardGameTitleDialog game={GAME_WITH_BGG_ID} />);
    await openDialog(user);
    await user.click(
      screen.getByRole("button", { name: "Daten mit BGG abgleichen" }),
    );
    await screen.findByText("Aktuelle BGG-Daten");

    await user.click(screen.getByRole("button", { name: "Titel übernehmen" }));

    expect(screen.getByLabelText("Titel")).toHaveValue("Ark Nova");
    expect(screen.getByLabelText("Titel")).toHaveClass("border-emerald-600");
  });

  it("shows a speaking error when the BGG fetch fails", async () => {
    const user = userEvent.setup();
    previewBggImportMock.mockResolvedValue({
      success: false,
      error: "BoardGameGeek ist aktuell nicht erreichbar.",
    });
    render(<EditBoardGameTitleDialog game={GAME_WITH_BGG_ID} />);
    await openDialog(user);

    await user.click(
      screen.getByRole("button", { name: "Daten mit BGG abgleichen" }),
    );

    expect(
      await screen.findByText("BoardGameGeek ist aktuell nicht erreichbar."),
    ).toBeInTheDocument();
  });
});
